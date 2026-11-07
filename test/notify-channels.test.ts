import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  NOTIFY_CHANNEL_DEFINITION_MAX_BYTES,
  NOTIFY_CHANNEL_MAX,
  NOTIFY_CHANNELS_MAX_BYTES,
  NOTIFY_FAILED_EVENTS,
  NOTIFY_FAILED_REPORT_MAX,
  NOTIFY_FILE_CHANNEL_REPORT_MAX,
  NOTIFY_SECRET_ENV_PREFIX,
  SERVICE_REPORT_MAX_BYTES,
  SERVICE_REPORT_STALE_MS,
} from "../src/notify-channels.ts";
import type { Validation } from "../src/validate-core.ts";
import {
  validateAdminNotifyChannelsView,
  validateAdminNotifyFailedView,
  validateNotifyChannelDefinition,
  validateNotifyChannelRecord,
  validateNotifyServiceReport,
  validateServiceNotifyChannels,
} from "../src/validate-runtime.ts";

type Result = Validation<unknown>;

const revision = `sha256-${"0".repeat(64)}`;
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
const webhook = { id: "a", type: "webhook", urlEnv: "PULSE_NOTIFY_SECRET_HOOK" };
const slack = { id: "c", type: "slack", urlFile: "slack-ops.txt" };
const stamps = { createdAt: 1, updatedAt: 2 };

/** A webhook of `16314 + 20 + extra` bytes: 80 checks of 200 characters and one filler. */
const sized = (id: string, filler: number): Record<string, unknown> => ({
  ...webhook,
  id,
  checks: Array(80).fill("x".repeat(200)),
  excludeChecks: ["y".repeat(filler)],
});

test("constants equal the spec literals", () => {
  assert.equal(NOTIFY_SECRET_ENV_PREFIX, "PULSE_NOTIFY_SECRET_");
  assert.equal(NOTIFY_CHANNEL_MAX, 100);
  assert.equal(NOTIFY_CHANNELS_MAX_BYTES, 262144);
  assert.equal(NOTIFY_CHANNEL_DEFINITION_MAX_BYTES, 16384);
  assert.equal(NOTIFY_FAILED_REPORT_MAX, 200);
  assert.equal(NOTIFY_FILE_CHANNEL_REPORT_MAX, 200);
  assert.equal(SERVICE_REPORT_MAX_BYTES, 524288);
  assert.equal(SERVICE_REPORT_STALE_MS, 180000);
  // The first seven are notify's events at c79f0b7 (src/types.ts:1 and :13).
  assert.deepEqual(NOTIFY_FAILED_EVENTS, [
    "opened",
    "update",
    "resolved",
    "reminder",
    "budget-low",
    "tls-expiry",
    "domain-expiry",
    "unknown",
  ]);
});

test("definitions refuse the counterexamples with literal messages", () => {
  const cases: [unknown, string][] = [
    [
      { ...webhook, urlEnv: "PULSE_API_TOKEN" },
      "channel.urlEnv: must match ^PULSE_NOTIFY_SECRET_[A-Z0-9_]{1,64}$",
    ],
    [
      { ...webhook, urlEnv: undefined, urlFile: "../x" },
      "channel.urlFile: must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
    ],
    [
      { ...webhook, urlEnv: undefined, urlFile: "a/b" },
      "channel.urlFile: must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
    ],
    [{ ...webhook, url: "https://x" }, "channel: has an unknown field: url"],
    [{ ...webhook, secret: "s" }, "channel: has an unknown field: secret"],
    [
      { ...webhook, type: "file" },
      'channel.type: must be one of "webhook", "slack", "teams", "email"',
    ],
    [{ ...webhook, id: "Ops" }, "channel.id: must match ^[a-z0-9][a-z0-9_-]{0,63}$"],
    [{ id: "a", type: "webhook" }, "channel: needs exactly one of urlEnv, urlFile"],
    [[], "channel: must be an object"],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(
      validateNotifyChannelDefinition(input),
      { ok: false, error },
      JSON.stringify(input),
    );
  }
});

test("definitions of every type are accepted as the same object", () => {
  const email = {
    id: "mail",
    type: "email",
    smtp: { host: "smtp.test", port: 587, passwordEnv: "PULSE_NOTIFY_SECRET_SMTP" },
    from: "pulse <pulse@x.test>",
    to: ["ops@x.test"],
  };
  for (const channel of [webhook, slack, { ...slack, type: "teams" }, email]) {
    const result = validateNotifyChannelDefinition(channel);
    assert.ok(result.ok && Object.is(result.value, channel), JSON.stringify(result));
  }
  assert.deepEqual(
    validateNotifyChannelDefinition({ ...email, smtp: { ...email.smtp, password: "p" } }),
    {
      ok: false,
      error: "channel.smtp: has an unknown field: password",
    },
  );
});

test("the definition byte limit is 16384 bytes, and four 200 x 200 lists are refused", () => {
  const exact = sized("a", 49);
  assert.equal(bytes(exact), 16384);
  assert.equal(validateNotifyChannelDefinition(exact).ok, true);
  const over = sized("a", 50);
  assert.equal(bytes(over), 16385);
  assert.deepEqual(validateNotifyChannelDefinition(over), {
    ok: false,
    error: "channel: must be at most 16384 bytes as JSON",
  });
  const list = Array(200).fill("z".repeat(200));
  const huge = {
    ...webhook,
    checks: list,
    excludeChecks: list,
    components: list,
    excludeComponents: list,
  };
  assert.deepEqual(validateNotifyChannelDefinition(huge), {
    ok: false,
    error: "channel: must be at most 16384 bytes as JSON",
  });
  // The timestamps do not count against the definition limit.
  assert.equal(validateNotifyChannelRecord({ ...exact, ...stamps }).ok, true);
});

test("the channels answer is validated in two levels", () => {
  const a = { ...webhook, ...stamps };
  const b = { ...sized("b", 50), ...stamps };
  const c = { ...slack, ...stamps };
  const answer = { revision, channels: [a, b, c] };
  const envelope = validateServiceNotifyChannels(answer);
  assert.ok(
    envelope.ok && Object.is(envelope.value, answer) && envelope.value.channels.length === 3,
  );
  const records = answer.channels.map((channel, i) =>
    validateNotifyChannelRecord(channel, `channels[${i}]`),
  );
  assert.ok(records[0]?.ok && Object.is(records[0].value, a));
  assert.deepEqual(records[1], {
    ok: false,
    error: "channels[1]: must be at most 16384 bytes as JSON",
  });
  assert.ok(records[2]?.ok && Object.is(records[2].value, c));
  assert.deepEqual(validateNotifyChannelRecord({ ...a, extra: 1 }), {
    ok: false,
    error: "channel: has an unknown field: extra",
  });
  // Element content that only the record validator refuses never fails the envelope.
  assert.equal(
    validateServiceNotifyChannels({ revision, channels: [{ id: "x", type: "file", url: 1 }] }).ok,
    true,
  );
});

test("the envelope refuses its counterexamples with literal messages", () => {
  const many = Array.from({ length: 101 }, (_, i) => ({ id: `c${i}` }));
  const cases: [unknown, string][] = [
    [{ revision, channels: many }, "channels answer.channels: must hold at most 100 channels"],
    [
      { revision, channels: [{ id: "a" }, { id: "a" }] },
      "channels answer.channels[1].id: must not repeat an id",
    ],
    [{ revision, channels: [{ type: "slack" }] }, "channels answer.channels[0].id: is required"],
    [
      { revision, channels: [{ id: "Ops" }] },
      "channels answer.channels[0].id: must match ^[a-z0-9][a-z0-9_-]{0,63}$",
    ],
    [{ revision, channels: [[]] }, "channels answer.channels[0]: must be an object"],
    [{ revision, channels: [], extra: 1 }, "channels answer: has an unknown field: extra"],
    [{ channels: [] }, "channels answer.revision: is required"],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(validateServiceNotifyChannels(input), { ok: false, error });
  }
  const hundred = { revision, channels: many.slice(0, 100) };
  assert.equal(validateServiceNotifyChannels(hundred).ok, true);
});

const fileView = { source: "file", id: "ops", type: "file", refs: ["hook.txt"] };
const failedEntry = {
  channelId: "a",
  key: "manual:3:update",
  event: "update",
  isManual: true,
  failedAt: 5,
  hasPayload: true,
};
const report = {
  at: 2,
  startedAt: 1,
  appliedRevision: revision,
  fileChannels: [fileView],
  fileChannelsTotal: 1,
  shadowedIds: ["ops"],
  rejected: [{ channelId: null, reason: "channels answer: bad" }],
  failed: [failedEntry],
  failedTotal: 1,
};

test("reports accept the file view and the failed shapes, and refuse the limits", () => {
  const ok = validateNotifyServiceReport(report);
  assert.ok(ok.ok && Object.is(ok.value, report));
  const ref200 = `${"a".repeat(199)}…`;
  assert.equal(ref200.length, 200);
  assert.equal(
    validateNotifyServiceReport({ ...report, fileChannels: [{ ...fileView, refs: [ref200] }] }).ok,
    true,
  );
  const cases: [unknown, string][] = [
    [
      { ...report, fileChannels: [{ ...fileView, refs: ["a".repeat(201)] }] },
      "report.fileChannels[0].refs[0]: must be 1..200 characters",
    ],
    [
      { ...report, failed: Array(201).fill(failedEntry), failedTotal: 201 },
      "report.failed: must hold at most 200 entries",
    ],
    [
      { ...report, fileChannels: Array(201).fill(fileView), fileChannelsTotal: 201 },
      "report.fileChannels: must hold at most 200 channels",
    ],
    [
      { ...report, shadowedIds: Array.from({ length: 101 }, (_, i) => `s${i}`) },
      "report.shadowedIds: must hold at most 100 ids",
    ],
    [
      { ...report, failed: [{ ...failedEntry, event: "manual" }] },
      'report.failed[0].event: must be one of "opened", "update", "resolved", "reminder", "budget-low", "tls-expiry", "domain-expiry", "unknown"',
    ],
    [
      { ...report, failed: [{ ...failedEntry, event: "warning" }] },
      'report.failed[0].event: must be one of "opened", "update", "resolved", "reminder", "budget-low", "tls-expiry", "domain-expiry", "unknown"',
    ],
    [
      { ...report, failed: [{ ...failedEntry, isManual: undefined }] },
      "report.failed[0].isManual: is required",
    ],
    [
      { ...report, failedTotal: 0 },
      "report.failedTotal: must be at least the number of failed entries",
    ],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(validateNotifyServiceReport(input), { ok: false, error });
  }
});

test("admin views hold database channels only, and the failed view no full report", () => {
  const view = {
    revision,
    channels: [{ ...webhook, ...stamps, source: "database" }],
    shadowed: [],
    service: { state: "fresh", receivedAt: 3, report },
  };
  const ok = validateAdminNotifyChannelsView(view);
  assert.ok(ok.ok && Object.is(ok.value, view));
  assert.equal(validateAdminNotifyChannelsView({ ...view, channels: [fileView] }).ok, false);
  assert.deepEqual(
    validateAdminNotifyChannelsView({
      ...view,
      service: { state: "never", receivedAt: null, report },
    }),
    { ok: false, error: "view.service.report: must be null exactly when state is never" },
  );
  const failed = { state: "fresh", receivedAt: 3, failed: [failedEntry], failedTotal: 1 };
  assert.equal(validateAdminNotifyFailedView(failed).ok, true);
  assert.equal(
    validateAdminNotifyFailedView({ state: "never", receivedAt: null, failed: [], failedTotal: 0 })
      .ok,
    true,
  );
  assert.deepEqual(validateAdminNotifyFailedView({ ...failed, report }), {
    ok: false,
    error: "view: has an unknown field: report",
  });
});

test("validators never throw on any input type", () => {
  for (const value of [undefined, null, 1, "x", [], () => 1, Symbol("s"), 1n]) {
    for (const validate of [
      validateNotifyChannelDefinition,
      validateNotifyChannelRecord,
      validateServiceNotifyChannels,
      validateNotifyServiceReport,
      validateAdminNotifyChannelsView,
      validateAdminNotifyFailedView,
    ]) {
      assert.equal(validate(value).ok, false);
    }
  }
});

test("cross-field channel rules and report totals refuse with literal messages", () => {
  const email = {
    id: "mail",
    type: "email",
    smtp: {
      host: "smtp.test",
      port: 587,
      passwordEnv: "PULSE_NOTIFY_SECRET_SMTP",
      passwordFile: "smtp.txt",
    },
    from: "pulse@x.test",
    to: ["ops@x.test"],
  };
  const failed = { state: "fresh", receivedAt: 3, failed: [failedEntry], failedTotal: 1 };
  const cases: [Result, string][] = [
    [
      validateNotifyChannelDefinition({
        ...webhook,
        secretEnv: "PULSE_NOTIFY_SECRET_S",
        secretFile: "s.txt",
      }),
      "channel.secretEnv: must not be set together with secretFile",
    ],
    [
      validateNotifyChannelDefinition(email),
      "channel.smtp.passwordEnv: must not be set together with passwordFile",
    ],
    [
      validateNotifyChannelDefinition({ ...slack, statusUrl: "not a url" }),
      "channel.statusUrl: must be a valid http(s) url",
    ],
    [
      validateNotifyServiceReport({ ...report, fileChannelsTotal: 0 }),
      "report.fileChannelsTotal: must be at least the number of fileChannels",
    ],
    [
      validateAdminNotifyFailedView({ ...failed, receivedAt: null }),
      "view.receivedAt: must be null exactly when state is never",
    ],
    [
      validateAdminNotifyFailedView({ ...failed, failedTotal: 0 }),
      "view.failedTotal: must be at least the number of failed entries",
    ],
  ];
  for (const [result, error] of cases) {
    assert.deepEqual(result, { ok: false, error });
  }
});

const emailChannel = {
  id: "mail",
  type: "email",
  smtp: { host: "smtp.test", port: 587 },
  from: "pulse@x.test",
  to: ["ops@x.test"],
};
const emailRecord = { ...emailChannel, ...stamps, source: "database" };
const channelsView = (channel: unknown): Record<string, unknown> => ({
  revision,
  channels: [channel],
  shadowed: [],
  service: { state: "never", receivedAt: null, report: null },
});
const smile = "😀";

test("the six report texts count UTF-16 units", () => {
  type Place = [string, number, (v: string) => unknown];
  const places: Place[] = [
    ["fileChannels[0].id", 200, (v) => ({ ...report, fileChannels: [{ ...fileView, id: v }] })],
    [
      "fileChannels[0].refs[0]",
      200,
      (v) => ({ ...report, fileChannels: [{ ...fileView, refs: [v] }] }),
    ],
    [
      "rejected[0].channelId",
      200,
      (v) => ({ ...report, rejected: [{ channelId: v, reason: "bad" }] }),
    ],
    ["rejected[0].reason", 300, (v) => ({ ...report, rejected: [{ channelId: null, reason: v }] })],
    [
      "failed[0].channelId",
      200,
      (v) => ({ ...report, failed: [{ ...failedEntry, channelId: v }] }),
    ],
    ["failed[0].key", 300, (v) => ({ ...report, failed: [{ ...failedEntry, key: v }] })],
  ];
  for (const [path, max, build] of places) {
    const error = `report.${path}: must be 1..${max} characters`;
    const accepts = [smile.repeat(max / 2), `${"a".repeat(max - 2)}${smile}`];
    for (const value of accepts) {
      assert.equal(validateNotifyServiceReport(build(value)).ok, true, `${path} ${value.length}`);
    }
    for (const value of [smile.repeat(max / 2 + 1), `${"a".repeat(max - 1)}${smile}`, ""]) {
      assert.deepEqual(
        validateNotifyServiceReport(build(value)),
        { ok: false, error },
        `${path} ${value.length}`,
      );
    }
  }
  assert.equal(
    validateNotifyServiceReport({ ...report, rejected: [{ channelId: null, reason: "x" }] }).ok,
    true,
  );
  const view = {
    ...channelsView(emailRecord),
    service: {
      state: "fresh",
      receivedAt: 3,
      report: { ...report, fileChannels: [{ ...fileView, refs: [smile.repeat(101)] }] },
    },
  };
  assert.deepEqual(validateAdminNotifyChannelsView(view), {
    ok: false,
    error: "view.service.report.fileChannels[0].refs[0]: must be 1..200 characters",
  });
  const failedView = {
    state: "fresh",
    receivedAt: 3,
    failed: [{ ...failedEntry, key: smile.repeat(151) }],
    failedTotal: 1,
  };
  assert.deepEqual(validateAdminNotifyFailedView(failedView), {
    ok: false,
    error: "view.failed[0].key: must be 1..300 characters",
  });
});

test("email addresses follow notify's final-bracket extraction in from and to", () => {
  const accepts = [
    "Ops <ops@example.test>",
    "Ops < ops@example.test >",
    "<ops@example.test >",
    "  ops@example.test  ",
    "Ops <ops@example.test>  ",
  ];
  const rejects: [string, string][] = [
    ["Ops <ops@example.test> trailing", "must hold an email address"],
    ["ops@example.test\r\n", "must be a single line"],
    ["Ops <>", "must hold an email address"],
  ];
  const variants: [string, (v: string) => Record<string, unknown>][] = [
    ["from", (v) => ({ ...emailChannel, from: v })],
    ["to[0]", (v) => ({ ...emailChannel, to: [v] })],
  ];
  for (const [path, build] of variants) {
    for (const value of accepts) {
      const channel = build(value);
      const result = validateNotifyChannelDefinition(channel);
      assert.ok(result.ok && Object.is(result.value, channel), `${path} ${value}`);
    }
    for (const [value, message] of rejects) {
      assert.deepEqual(
        validateNotifyChannelDefinition(build(value)),
        { ok: false, error: `channel.${path}: ${message}` },
        `${path} ${value}`,
      );
    }
  }
  const accepted = { ...emailChannel, from: "Ops < ops@example.test >" };
  const result = validateNotifyChannelDefinition(accepted);
  assert.ok(
    result.ok && "from" in result.value && result.value.from === "Ops < ops@example.test >",
  );
  const trailing = { ...emailRecord, from: "Ops <ops@example.test> trailing" };
  assert.deepEqual(validateNotifyChannelRecord(trailing, "channels[0]"), {
    ok: false,
    error: "channels[0].from: must hold an email address",
  });
  assert.deepEqual(validateAdminNotifyChannelsView(channelsView(trailing)), {
    ok: false,
    error: "view.channels[0].from: must hold an email address",
  });
});

test("smtp.clientName is notify's EHLO name, capped at 200 characters", () => {
  const withName = (clientName: string): Record<string, unknown> => ({
    ...emailChannel,
    smtp: { ...emailChannel.smtp, clientName },
  });
  const error = "channel.smtp.clientName: must be a host name";
  const accepts = [
    "pulse.example.test",
    "[192.0.2.1]",
    "[IPv6:2001:db8::1]",
    "localhost",
    `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}`,
  ];
  for (const name of accepts) {
    assert.equal(validateNotifyChannelDefinition(withName(name)).ok, true, name);
  }
  assert.equal(validateNotifyChannelDefinition(emailChannel).ok, true);
  // The literal snowman (U+2603) is its own case by the manager's decision on #815.
  assert.equal("☃".codePointAt(0), 0x2603);
  assert.deepEqual(validateNotifyChannelDefinition(withName("☃")), { ok: false, error });
  const rejects = [
    "pulse_console",
    "☃.example.test",
    "münchen.test",
    "pülse.example.test",
    "pulse\u0000.example.test",
    "-pulse.test",
    "pulse..test",
    "pulse.example.test.",
    "[]",
    "x".repeat(64),
    "",
    "a b",
  ];
  for (const name of rejects) {
    assert.deepEqual(validateNotifyChannelDefinition(withName(name)), { ok: false, error }, name);
  }
  assert.deepEqual(
    validateNotifyChannelDefinition(withName(Array(4).fill("a".repeat(63)).join("."))),
    {
      ok: false,
      error: "channel.smtp.clientName: must be at most 200 characters",
    },
  );
  for (const name of ["pulse_console", "☃"]) {
    const record = { ...emailRecord, smtp: { ...emailRecord.smtp, clientName: name } };
    assert.deepEqual(validateNotifyChannelRecord(record, "channels[0]"), {
      ok: false,
      error: "channels[0].smtp.clientName: must be a host name",
    });
    assert.deepEqual(validateAdminNotifyChannelsView(channelsView(record)), {
      ok: false,
      error: "view.channels[0].smtp.clientName: must be a host name",
    });
  }
});

test("a never failed view is empty with a total of 0", () => {
  const never = { state: "never", receivedAt: null };
  const cases: [unknown, string][] = [
    [
      { ...never, failed: [failedEntry], failedTotal: 1 },
      "view.failed: must be empty when state is never",
    ],
    [
      { ...never, failed: [failedEntry], failedTotal: 0 },
      "view.failed: must be empty when state is never",
    ],
    [{ ...never, failed: [], failedTotal: 1 }, "view.failedTotal: must be 0 when state is never"],
    [{ ...never, failed: [], failedTotal: 3 }, "view.failedTotal: must be 0 when state is never"],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(
      validateAdminNotifyFailedView(input),
      { ok: false, error },
      JSON.stringify(input),
    );
  }
  for (const input of [
    { ...never, failed: [], failedTotal: 0 },
    { state: "fresh", receivedAt: 3, failed: [], failedTotal: 0 },
    { state: "stale", receivedAt: 3, failed: [failedEntry], failedTotal: 500 },
  ]) {
    assert.equal(validateAdminNotifyFailedView(input).ok, true, JSON.stringify(input));
  }
});

test("hostile addresses and client names are refused fast without throwing", () => {
  const address = `${"<".repeat(50_000)}${"a".repeat(50_000)}`;
  const name = ".[".repeat(50_000);
  for (const channel of [
    { ...emailChannel, from: address },
    { ...emailChannel, smtp: { ...emailChannel.smtp, clientName: name } },
  ]) {
    const start = performance.now();
    assert.equal(validateNotifyChannelDefinition(channel).ok, false);
    assert.ok(performance.now() - start < 50);
  }
});
