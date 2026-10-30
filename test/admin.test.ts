import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  ADMIN_IF_MATCH_HEADER,
  ADMIN_REVISION_PREFIX,
  ADMIN_STATUS_ORDER,
  type AdminCheckInput,
  type AdminConfigResponse,
  adminCheckInputSchema,
  isAdminRevision,
  validateAdminCheckInput,
  validateAdminCheckView,
  validateAdminComponent,
  validateAdminComponentInput,
  validateAdminConfigResponse,
  validateAdminMaintenanceInput,
  validateAdminMaintenanceView,
} from "../src/index.ts";

const SENTINEL = "SENTINEL-secret-value";
const revision = `${ADMIN_REVISION_PREFIX}${"a".repeat(64)}`;
const revisionPattern = `^${ADMIN_REVISION_PREFIX}[0-9a-f]{64}$`;
const http = { id: "a", name: "A", url: "https://x", intervalMs: 1000 };

test("revision format", () => {
  assert.equal(isAdminRevision(revision), true);
  assert.equal(isAdminRevision(`"${revision}"`), false);
  assert.equal(isAdminRevision("sha256-ABC"), false);
  assert.equal(isAdminRevision(1), false);
});

test("check input accepts headers, body and a heartbeat secret", () => {
  const withHeaders = {
    ...http,
    method: "POST",
    headers: { "X-Key": SENTINEL, "X-Env": { env: "KEY" } },
    body: "{}",
  };
  assert.equal(validateAdminCheckInput(withHeaders).ok, true);
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0, secret: SENTINEL };
  const result = validateAdminCheckInput(hb);
  assert.ok(result.ok);
  assert.equal(result.value, hb);
  assert.equal(validateAdminCheckInput({ ...hb, secret: undefined }).ok, true);
});

test("check input rejects a bad secret, unknown keys and state fields", () => {
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
  assert.deepEqual(validateAdminCheckInput({ ...hb, secret: "" }), {
    ok: false,
    error: "check.secret: must be a non-empty string",
  });
  assert.deepEqual(validateAdminCheckInput({ ...http, secret: "x" }), {
    ok: false,
    error: "check.secret: is only allowed on a heartbeat check",
  });
  assert.deepEqual(validateAdminCheckInput({ ...http, extra: 1 }), {
    ok: false,
    error: "check.extra: is not allowed on this check",
  });
  assert.equal(validateAdminCheckInput({ ...http, state: "up" }).ok, false);
  assert.equal(validateAdminCheckInput({ ...http, type: "nope" }).ok, false);
  assert.equal(validateAdminCheckInput("x").ok, false);
});

test("check view carries names, hasBody and hasSecret only", () => {
  assert.equal(
    validateAdminCheckView({ ...http, headers: ["X-Key"], hasBody: true, method: "POST" }).ok,
    true,
  );
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0, hasSecret: true };
  assert.equal(validateAdminCheckView(hb).ok, true);
  assert.equal(validateAdminCheckView({ ...hb, hasSecret: undefined }).ok, false);
});

test("check view rejects header values, body and secret", () => {
  assert.equal(validateAdminCheckView({ ...http, headers: { "X-Key": SENTINEL } }).ok, false);
  assert.equal(validateAdminCheckView({ ...http, headers: [{ env: "KEY" }] }).ok, false);
  assert.equal(validateAdminCheckView({ ...http, body: SENTINEL }).ok, false);
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0, hasSecret: true };
  assert.equal(validateAdminCheckView({ ...hb, secret: SENTINEL }).ok, false);
  const tcp = { id: "t", name: "T", type: "tcp", host: "h", port: 1, intervalMs: 1000 };
  assert.equal(validateAdminCheckView(tcp).ok, true);
  assert.equal(validateAdminCheckView({ ...tcp, secret: SENTINEL }).ok, false);
});

test("component and maintenance bodies are strict", () => {
  const component = { id: "web", name: "Web", checkIds: ["a"] };
  assert.equal(validateAdminComponentInput(component).ok, true);
  assert.equal(validateAdminComponentInput({ ...component, x: 1 }).ok, false);
  const window = { checkId: "a", start: 1, end: 2, note: "n" };
  assert.equal(validateAdminMaintenanceInput(window).ok, true);
  assert.equal(validateAdminMaintenanceInput({ ...window, index: 0 }).ok, false);
  assert.equal(validateAdminMaintenanceInput({ ...window, end: 1 }).ok, false);
  assert.equal(validateAdminMaintenanceView({ ...window, index: 0 }).ok, true);
  assert.equal(validateAdminMaintenanceView({ ...window, index: -1 }).ok, false);
  assert.equal(validateAdminMaintenanceView(window).ok, false);
});

test("config response", () => {
  const config: AdminConfigResponse = {
    revision,
    checks: [{ ...http, headers: ["X-Key"] }],
    components: [{ id: "web", name: "Web", checkIds: ["a"] }],
    maintenance: [{ checkId: "a", start: 1, end: 2, note: "n", index: 0 }],
  };
  assert.equal(validateAdminConfigResponse(config).ok, true);
  assert.deepEqual(validateAdminConfigResponse({ ...config, revision: "x" }), {
    ok: false,
    error: `config.revision: must match ${revisionPattern}`,
  });
  assert.equal(validateAdminConfigResponse({ ...config, secret: SENTINEL }).ok, false);
  assert.equal(
    validateAdminConfigResponse({ ...config, checks: [{ ...http, body: SENTINEL }] }).ok,
    false,
  );
});

test("check input reports a bad secret type and unknown secret on non-objects", () => {
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
  assert.equal(validateAdminCheckInput({ ...hb, secret: 5 }).ok, false);
});

test("component view and status order constants", () => {
  assert.equal(validateAdminComponent({ id: "web", name: "Web", checkIds: ["a"] }).ok, true);
  assert.equal(ADMIN_STATUS_ORDER[0].status, 404);
  assert.equal(ADMIN_IF_MATCH_HEADER, "if-match");
});

test("check input accepts each probed type and rejects its stray keys", () => {
  const checks = [
    { id: "a", name: "A", type: "tls", host: "h", port: 443, warnDays: 14, intervalMs: 1000 },
    { id: "a", name: "A", type: "tcp", host: "h", port: 1, intervalMs: 1000 },
    { id: "a", name: "A", type: "dns", dnsName: "example.com", recordType: "A", intervalMs: 1000 },
    {
      id: "a",
      name: "A",
      type: "domain",
      domain: "example.com",
      warnDays: 5,
      intervalMs: 3_600_000,
    },
  ];
  for (const check of checks) {
    assert.equal(validateAdminCheckInput(check).ok, true, String(check.type));
    assert.equal(validateAdminCheckInput({ ...check, stray: 1 }).ok, false, String(check.type));
  }
});

test("check input has an exported strict schema that the validator agrees with", () => {
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0, secret: SENTINEL };
  const parsed: AdminCheckInput = adminCheckInputSchema.parse(hb);
  assert.deepEqual(parsed, hb);
  const cases = [
    http,
    hb,
    { ...http, extra: 1 },
    { ...http, secret: "x" },
    { ...hb, secret: "" },
    { ...http, method: "HEAD", keyword: "x" },
    { id: "d", name: "D", type: "domain", domain: "example.com", warnDays: 1, intervalMs: 1 },
  ];
  for (const value of cases) {
    assert.equal(
      adminCheckInputSchema.safeParse(value).success,
      validateAdminCheckInput(value).ok,
      JSON.stringify(value),
    );
  }
});

test("check view keeps the check refinements", () => {
  const domain = { id: "d", name: "D", type: "domain", domain: "example.com", warnDays: 1 };
  assert.equal(validateAdminCheckView({ ...domain, intervalMs: 3_600_000 }).ok, true);
  assert.equal(validateAdminCheckView({ ...domain, intervalMs: 1 }).ok, false);
  assert.equal(validateAdminCheckView({ ...http, method: "HEAD", keyword: "x" }).ok, false);
});

test("heartbeat view requires hasSecret: true", () => {
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
  assert.equal(validateAdminCheckView({ ...hb, hasSecret: false }).ok, false);
});

test("check input with a non-string type fails without throwing", () => {
  const bad = JSON.parse(
    '{"id":"a","name":"A","url":"https://x","intervalMs":1000,"type":{"toString":null}}',
  );
  for (const type of [bad.type, 1, ["http"], null]) {
    const result = validateAdminCheckInput({ ...http, type });
    assert.deepEqual(result, {
      ok: false,
      error: 'check.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"',
    });
  }
});

const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
const hbFields = { id: "h", name: "H", period: 1000, grace: 0 };

/** Adds an own accessor `key` and counts its getter calls; a throwing getter throws `boom`. */
function withAccessor(
  base: object,
  key: string,
  options: { returns: unknown; isEnumerable: boolean; isThrowing: boolean },
): { input: object; calls: () => number } {
  let count = 0;
  const input = { ...base };
  Object.defineProperty(input, key, {
    enumerable: options.isEnumerable,
    get() {
      count += 1;
      if (options.isThrowing) {
        throw new Error("boom");
      }
      return options.returns;
    },
  });
  return { input, calls: () => count };
}

test("check input never runs a getter on type or secret", () => {
  const cases = [
    { base: http, key: "type", returns: "heartbeat", isEnumerable: true, expected: { ok: true } },
    {
      base: hbFields,
      key: "type",
      returns: "heartbeat",
      isEnumerable: true,
      expected: { ok: false, error: "check.period: is not allowed on this check" },
    },
    {
      base: http,
      key: "secret",
      returns: "x",
      isEnumerable: true,
      expected: { ok: false, error: "check.secret: is not allowed on this check" },
    },
    { base: http, key: "secret", returns: "x", isEnumerable: false, expected: { ok: true } },
    { base: hb, key: "secret", returns: "s", isEnumerable: true, expected: { ok: true } },
  ];
  for (const { base, key, returns, isEnumerable, expected } of cases) {
    for (const isThrowing of [false, true]) {
      const { input, calls } = withAccessor(base, key, { returns, isEnumerable, isThrowing });
      const result = validateAdminCheckInput(input);
      const label = `${key} on ${JSON.stringify(base)}, throwing: ${isThrowing}`;
      assert.equal(calls(), 0, label);
      if (expected.ok) {
        assert.equal(result.ok, true, label);
        assert.equal(result.ok && result.value, input, label);
      } else {
        assert.deepEqual(result, expected, label);
      }
    }
  }
});

test("check input ignores an inherited type or secret", () => {
  const inheritedType = Object.assign(Object.create({ type: "heartbeat" }), hbFields);
  assert.deepEqual(validateAdminCheckInput(inheritedType), {
    ok: false,
    error: "check.period: is not allowed on this check",
  });
  const inheritedSecret = Object.assign(Object.create({ secret: "x" }), http);
  const result = validateAdminCheckInput(inheritedSecret);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, inheritedSecret);
});

test("check input never runs an inherited getter on type or secret", () => {
  for (const key of ["type", "secret"]) {
    let calls = 0;
    const proto = {};
    Object.defineProperty(proto, key, {
      get() {
        calls += 1;
        throw new Error("boom");
      },
    });
    const result = validateAdminCheckInput(Object.assign(Object.create(proto), http));
    assert.equal(calls, 0, key);
    assert.equal(result.ok, true, key);
  }
});

test("check input keeps its data property results", () => {
  assert.deepEqual(validateAdminCheckInput({ ...http, secret: "x" }), {
    ok: false,
    error: "check.secret: is only allowed on a heartbeat check",
  });
  assert.deepEqual(validateAdminCheckInput({ ...hb, secret: "" }), {
    ok: false,
    error: "check.secret: must be a non-empty string",
  });
  for (const type of [5, Symbol("t")]) {
    assert.deepEqual(validateAdminCheckInput({ ...http, type }), {
      ok: false,
      error: 'check.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"',
    });
  }
});
