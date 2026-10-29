import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateCheck,
  validateChecksResponse,
  validateCheckUptime,
  validateCheckWithState,
  validateIncident,
  validateIncidentsResponse,
  validateMaintenanceResponse,
  validateMaintenanceWindow,
  validatePostResultRequest,
  validateResult,
  validateResultsResponse,
  validateUptimeResponse,
} from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

const clone = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

function errorOf(result: { ok: boolean; error?: string }): string | undefined {
  return result.ok ? undefined : result.error;
}

test("valid checks pass and the same object is returned", () => {
  const { httpCheck, tlsAsCheck, retryCheck, keywordCheck, withObjective } = fixture.variants;
  for (const check of [httpCheck, tlsAsCheck, retryCheck, keywordCheck, withObjective]) {
    const result = validateCheck(check);
    assert.equal(result.ok && result.value, check);
  }
  const extra = { ...httpCheck, future: 1 };
  const kept = validateCheck(extra);
  assert.equal(kept.ok && kept.value, extra);
});

test("validateCheck ignores state fields, validateCheckWithState requires them", () => {
  const [withState] = fixture.checks;
  assert.equal(validateCheck(withState).ok, true);
  assert.equal(validateCheckWithState(withState).ok, true);
  assert.equal(
    errorOf(validateCheckWithState(fixture.variants.httpCheck)),
    "check.state: is required",
  );
});

test("all five states validate", () => {
  for (const check of fixture.variants.allStates) {
    assert.equal(validateCheckWithState(check).ok, true, check.state);
  }
  assert.equal(validateCheckWithState(fixture.variants.tlsWithState).ok, true);
});

test("invalid checks name the path", () => {
  const base = clone(fixture.variants.httpCheck);
  const cases: [Record<string, unknown>, string][] = [
    [{ ...base, id: "" }, "check.id: must be a non-empty string"],
    [{ ...base, url: undefined }, "check.url: is required"],
    [{ ...base, url: "" }, "check.url: must be a non-empty string"],
    [{ ...base, intervalMs: 0 }, "check.intervalMs: must be a finite number > 0"],
    [{ ...base, intervalMs: null }, "check.intervalMs: must be a finite number > 0"],
    [{ ...base, timeoutMs: "5" }, "check.timeoutMs: must be a finite number"],
    [{ ...base, retries: 1.5 }, "check.retries: must be an integer"],
    [{ ...base, keyword: 3 }, "check.keyword: must be a string"],
    [{ ...base, type: "ftp" }, 'check.type: must be "http", "tls" or "heartbeat"'],
  ];
  for (const [input, message] of cases) {
    assert.equal(errorOf(validateCheck(input)), message);
  }
  const tls = clone(fixture.variants.tlsAsCheck);
  assert.equal(errorOf(validateCheck({ ...tls, port: 4.5 })), "check.port: must be an integer");
  assert.equal(
    errorOf(validateCheck({ ...tls, warnDays: "14" })),
    "check.warnDays: must be an integer",
  );
  assert.equal(errorOf(validateCheck({ ...tls, host: undefined })), "check.host: is required");
  assert.equal(
    errorOf(validateCheck({ ...tls, host: "" })),
    "check.host: must be a non-empty string",
  );
});

test("empty url and host are rejected in checks lists", () => {
  const http = clone(fixture.variants.httpCheck);
  const tls = clone(fixture.variants.tlsAsCheck);
  assert.equal(validateCheck(http).ok, true);
  assert.equal(validateCheck(tls).ok, true);
  assert.equal(
    errorOf(validateChecksResponse([{ ...http, ...fixture.checks[0], url: "" }])),
    "checks[0].url: must be a non-empty string",
  );
});

test("non-objects are rejected with the given path", () => {
  for (const input of [null, [], "x", 3, undefined]) {
    assert.equal(errorOf(validateCheck(input, "checks[3]")), "checks[3]: must be an object");
  }
  assert.equal(errorOf(validateResult(null)), "result: must be an object");
  assert.equal(errorOf(validateIncident([])), "incident: must be an object");
});

test("validateResult", () => {
  for (const result of fixture.results) {
    assert.equal(validateResult(result).ok, true);
  }
  const base = clone(fixture.results[0]);
  assert.equal(
    errorOf(validateResult({ ...base, status: "weird" })),
    'result.status: must be one of "up", "degraded", "down"',
  );
  assert.equal(
    errorOf(validateResult({ ...base, latencyMs: Number.NaN })),
    "result.latencyMs: must be a finite number",
  );
  assert.equal(
    errorOf(validateResult({ ...base, attempts: 0 })),
    "result.attempts: must be an integer >= 1",
  );
  assert.equal(
    errorOf(validateResult({ ...base, statusCode: 99 }, "results[2]")),
    "results[2].statusCode: must be an integer 100..599",
  );
  assert.equal(
    errorOf(validateResult({ ...base, certDaysLeft: 1.5 })),
    "result.certDaysLeft: must be an integer",
  );
});

test("validatePostResultRequest accepts a missing location and attempts", () => {
  const sent: Record<string, unknown> = { ...clone(fixture.results[0]), extra: true };
  delete sent.location;
  delete sent.attempts;
  assert.equal(validatePostResultRequest(fixture.request).ok, true);
  assert.equal(validatePostResultRequest(fixture.minimalRequest).ok, true);
  const result = validatePostResultRequest(sent);
  assert.equal(result.ok && result.value, sent);
  assert.equal(validatePostResultRequest({ ...sent, certDaysLeft: null }).ok, true);
});

test("validatePostResultRequest bounds", () => {
  const base = clone(fixture.results[0]);
  const cases: [Record<string, unknown>, string][] = [
    [{ ...base, checkId: "" }, "result.checkId: must be a non-empty string"],
    [{ ...base, timestamp: 1.5 }, "result.timestamp: must be an integer"],
    [{ ...base, statusCode: 600 }, "result.statusCode: must be an integer 100..599"],
    [{ ...base, statusCode: "200" }, "result.statusCode: must be an integer 100..599"],
    [{ ...base, latencyMs: -1 }, "result.latencyMs: must be a finite number >= 0"],
    [{ ...base, reason: 4 }, "result.reason: must be a string"],
    [{ ...base, location: 4 }, "result.location: must be a string"],
    [{ ...base, attempts: 0 }, "result.attempts: must be an integer >= 1"],
    [{ ...base, attempts: 1.5 }, "result.attempts: must be an integer >= 1"],
    [{ ...base, certDaysLeft: "5" }, "result.certDaysLeft: must be an integer"],
    [{ ...base, status: undefined }, "result.status: is required"],
  ];
  for (const [input, message] of cases) {
    assert.equal(errorOf(validatePostResultRequest(input)), message);
  }
});

test("validateIncident and validateMaintenanceWindow", () => {
  const [incident] = fixture.incidents;
  assert.equal(validateIncident(incident).ok, true);
  assert.equal(validateIncident({ ...incident, resolvedAt: 5 }).ok, true);
  assert.equal(
    errorOf(validateIncident({ ...incident, id: "1" })),
    "incident.id: must be an integer",
  );
  assert.equal(
    errorOf(validateIncident({ ...incident, resolvedAt: undefined }, "incidents[0]")),
    "incidents[0].resolvedAt: is required",
  );
  assert.equal(
    errorOf(validateIncident({ ...incident, openedAt: Number.POSITIVE_INFINITY })),
    "incident.openedAt: must be a finite number",
  );
  const [window] = fixture.maintenance;
  assert.equal(validateMaintenanceWindow(window).ok, true);
  assert.equal(
    errorOf(validateMaintenanceWindow({ ...window, note: 1 })),
    "maintenance.note: must be a string",
  );
});

test("validateCheckUptime", () => {
  const [first] = fixture.uptime;
  assert.equal(validateCheckUptime(first).ok, true);
  const bad = {
    ...first,
    days: [
      { date: "2026-10-26", uptime: null, results: 0 },
      { date: "2026-10-27", uptime: 1, results: 1 },
      { date: "x", uptime: 1, results: 1 },
    ],
  };
  assert.equal(errorOf(validateCheckUptime(bad)), "uptime.days[2].date: must be a YYYY-MM-DD date");
  const worse = { ...first, days: [{ date: "2026-10-26", uptime: "1", results: 0 }] };
  assert.equal(
    errorOf(validateCheckUptime(worse)),
    "uptime.days[0].uptime: must be a finite number",
  );
  assert.equal(
    errorOf(validateCheckUptime({ ...first, days: {} })),
    "uptime.days: must be an array",
  );
});

test("array wrappers accept fixtures and name the index", () => {
  assert.equal(validateChecksResponse(fixture.checks).ok, true);
  assert.equal(validateResultsResponse(fixture.results).ok, true);
  assert.equal(validateIncidentsResponse(fixture.incidents).ok, true);
  assert.equal(validateMaintenanceResponse(fixture.maintenance).ok, true);
  assert.equal(validateUptimeResponse(fixture.uptime).ok, true);
  assert.equal(validateChecksResponse([]).ok, true);

  assert.equal(errorOf(validateChecksResponse({})), "checks: must be an array");
  assert.equal(errorOf(validateResultsResponse(null)), "results: must be an array");
  assert.equal(
    errorOf(validateIncidentsResponse([fixture.incidents[0], 3])),
    "incidents[1]: must be an object",
  );
  assert.equal(errorOf(validateMaintenanceResponse([{}])), "maintenance[0].checkId: is required");
  assert.equal(
    errorOf(validateResultsResponse([{ ...fixture.results[0], status: "x" }], "r"))?.startsWith(
      "r[0].status",
    ),
    true,
  );
});

test("nested paths in checks and uptime responses", () => {
  const checks = clone(fixture.checks) as unknown as Record<string, unknown>[];
  const second = checks[1] as { locations: { result: Record<string, unknown> }[] };
  const location = second.locations[0];
  if (location) location.result.status = "bad";
  assert.match(
    errorOf(validateChecksResponse(checks)) ?? "",
    /^checks\[1\]\.locations\[0\]\.result\.status: must be one of/,
  );
  const uptime = clone(fixture.uptime) as unknown as { days: Record<string, unknown>[] }[];
  const days = [...(uptime[0]?.days ?? []), { date: "2026-10-28", uptime: "x", results: 1 }];
  if (uptime[0]) uptime[0].days = days;
  assert.equal(
    errorOf(validateUptimeResponse(uptime)),
    "uptime[0].days[2].uptime: must be a finite number",
  );
});

test("a bad maintenance entry or stale flag is reported", () => {
  const checks = clone(fixture.checks) as unknown as Record<string, unknown>[];
  assert.equal(
    errorOf(validateChecksResponse([{ ...checks[1], maintenance: { checkId: "a" } }])),
    "checks[0].maintenance.start: is required",
  );
  assert.equal(
    errorOf(
      validateChecksResponse([
        { ...checks[0], locations: [{ location: "d", result: fixture.results[0], stale: 1 }] },
      ]),
    ),
    "checks[0].locations[0].stale: must be a boolean",
  );
});

test("heartbeat checks validate, alone and in a checks response", () => {
  const { heartbeatAsCheck, heartbeatWithState, checkTarget } = fixture.variants;
  const result = validateCheck(heartbeatAsCheck);
  assert.equal(result.ok && result.value, heartbeatAsCheck);
  assert.equal(validateCheckWithState(heartbeatWithState).ok, true);
  assert.equal(validateChecksResponse([...fixture.checks, heartbeatWithState]).ok, true);
  assert.equal(checkTarget(heartbeatAsCheck), "every 60000ms");
  assert.equal(checkTarget(fixture.variants.tlsAsCheck), "example.com");
});

test("heartbeat checks reject bad fields", () => {
  const hb = clone(fixture.variants.heartbeatAsCheck);
  const cases: [Record<string, unknown>, string][] = [
    [{ ...hb, period: undefined }, "check.period: is required"],
    [{ ...hb, grace: undefined }, "check.grace: is required"],
    [{ ...hb, period: 1500.5 }, "check.period: must be an integer 1000..86400000"],
    [{ ...hb, period: 999 }, "check.period: must be an integer 1000..86400000"],
    [{ ...hb, period: 86_400_001 }, "check.period: must be an integer 1000..86400000"],
    [{ ...hb, period: "60000" }, "check.period: must be an integer 1000..86400000"],
    [{ ...hb, grace: -1 }, "check.grace: must be an integer 0..86400000"],
    [{ ...hb, grace: 86_400_001 }, "check.grace: must be an integer 0..86400000"],
    [{ ...hb, grace: null }, "check.grace: must be an integer 0..86400000"],
    [{ ...hb, url: "x" }, "check.url: is not allowed on a heartbeat check"],
    [{ ...hb, host: "x" }, "check.host: is not allowed on a heartbeat check"],
    [{ ...hb, intervalMs: 1000 }, "check.intervalMs: is not allowed on a heartbeat check"],
    [{ ...hb, secret: "0123456789abcdef" }, "check.secret: is not allowed on a heartbeat check"],
    [{ ...hb, extra: 1 }, "check.extra: is not allowed on a heartbeat check"],
  ];
  for (const [input, message] of cases) {
    assert.equal(errorOf(validateCheck(input)), message);
  }
  assert.equal(validateCheck({ ...hb, grace: 0, period: 1000 }).ok, true);
  assert.equal(validateCheck({ ...hb, grace: 86_400_000, period: 86_400_000 }).ok, true);
});
