import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  ADMIN_IF_MATCH_HEADER,
  ADMIN_STATUS_ORDER,
  type AdminCheckInput,
  type AdminConfigResponse,
  adminCheckInputSchema,
} from "../src/admin.ts";
import { ADMIN_REVISION_PREFIX, isAdminRevision } from "../src/revision.ts";
import { latencyDaySchema, locationSchema, manualIncidentSchema } from "../src/schema.ts";
import { validateCheck } from "../src/validate.ts";
import {
  validateAdminCheckInput,
  validateAdminCheckView,
  validateAdminComponent,
  validateAdminComponentInput,
  validateAdminConfigResponse,
  validateAdminMaintenanceInput,
  validateAdminMaintenanceView,
} from "../src/validate-admin.ts";

// admin.ts loads schema.ts, so this suite also pins the shared rules it does not reach otherwise.
test("shared schema rules loaded by the admin module", () => {
  const day = { date: "2024-02-29", p50Ms: 1, p95Ms: 2, count: 1 };
  assert.equal(latencyDaySchema.safeParse(day).success, true);
  assert.equal(latencyDaySchema.safeParse({ ...day, date: "2023-02-29" }).success, false);
  assert.equal(latencyDaySchema.safeParse({ ...day, count: 0 }).success, false);
  const location = { name: "eu", lastResultAt: 0, state: "reporting" };
  assert.equal(locationSchema.safeParse(location).success, true);
  const extra = locationSchema.safeParse({ ...location, x: 1 });
  assert.equal(extra.error?.issues[0]?.message, "has an unknown field: x");
  const incident = {
    id: 1,
    title: "T",
    componentIds: [],
    impact: "minor",
    status: "resolved",
    createdAt: 1,
    resolvedAt: 3,
    updates: [
      { at: 2, status: "investigating", message: "m" },
      { at: 3, status: "resolved", message: "m" },
    ],
  };
  assert.equal(manualIncidentSchema.safeParse(incident).success, true);
  assert.equal(manualIncidentSchema.safeParse({ ...incident, resolvedAt: null }).success, false);
  assert.equal(manualIncidentSchema.safeParse({ ...incident, resolvedAt: 4 }).success, false);
});

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
    headers: { "X-Key": SENTINEL, "X-Env": { env: "PULSE_HEADER_KEY" } },
    body: "{}",
  };
  assert.equal(validateAdminCheckInput(withHeaders).ok, true);
  const hb = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0, secret: SENTINEL };
  const result = validateAdminCheckInput(hb);
  assert.ok(result.ok);
  assert.equal(result.value, hb);
  assert.equal(validateAdminCheckInput({ ...hb, secret: undefined }).ok, true);
});

test("check input applies the shared http and dns field rules", () => {
  const isOk = (check: Record<string, unknown>): boolean => validateAdminCheckInput(check).ok;
  assert.equal(isOk({ ...http, expectedStatus: ["200-299", 301] }), true);
  assert.equal(isOk({ ...http, expectedStatus: ["299-200"] }), false);
  assert.equal(isOk({ ...http, jsonAssert: [{ pointer: "/a/~1b", equals: 1 }] }), true);
  assert.equal(isOk({ ...http, jsonAssert: [{ pointer: "a", exists: true }] }), false);
  assert.equal(isOk({ ...http, jsonAssert: [{ pointer: "/a", equals: 1, exists: true }] }), false);
  assert.equal(isOk({ ...http, body: "x" }), false);
  assert.equal(isOk({ ...http, method: "HEAD", keyword: "x" }), false);
  assert.equal(isOk({ ...http, headers: { "bad name": "v" } }), false);
  assert.equal(isOk({ ...http, headers: { Host: "v" } }), false);
  assert.equal(isOk({ ...http, headers: { "X-A": "1", "x-a": "2" } }), false);
  const dns = {
    id: "d",
    name: "D",
    type: "dns",
    dnsName: "example.com",
    recordType: "A",
    intervalMs: 1000,
  };
  assert.equal(isOk({ ...dns, resolver: "2001:db8::1" }), true);
  assert.equal(isOk({ ...dns, resolver: "zz::" }), false);
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
  assert.equal(
    validateAdminCheckView({ ...http, headers: [{ env: "PULSE_HEADER_KEY" }] }).ok,
    false,
  );
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

test("status order names the token outcomes and keeps its statuses", () => {
  assert.deepEqual(
    ADMIN_STATUS_ORDER.map((entry) => entry.status),
    [404, 401, 403, 413, 400, 428, 503, 412, 422, 409, 404],
  );
  assert.equal(
    ADMIN_STATUS_ORDER[1].meaning,
    "missing, unknown, expired, revoked or retired token",
  );
  assert.equal(ADMIN_STATUS_ORDER[2].meaning, "a valid token without the needed scope");
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

test("admin check input rejects a userinfo url and an unprefixed env name", () => {
  // Create (POST) and replace (PUT) both validate with validateAdminCheckInput.
  assert.deepEqual(validateAdminCheckInput({ ...http, url: "https://u:p@x" }), {
    ok: false,
    error: "check.url: must not contain a username or password",
  });
  assert.deepEqual(validateAdminCheckInput({ ...http, headers: { A: { env: "TOKEN" } } }), {
    ok: false,
    error: "check.headers.A.env: must match ^PULSE_HEADER_[A-Za-z0-9_]{1,115}$",
  });
});

test("admin check view and http input reject a non-http url", () => {
  const message = "check.url: must be an http: or https: URL";
  assert.deepEqual(validateAdminCheckView({ ...http, url: "file:///x" }), {
    ok: false,
    error: message,
  });
  assert.deepEqual(validateAdminCheckInput({ ...http, url: "file:///x" }), {
    ok: false,
    error: message,
  });
});

test("check view never runs a getter on a field of a union option", () => {
  const tls = { id: "t", name: "T", type: "tls", host: "h", port: 443, intervalMs: 1000 };
  const field = withAccessor(tls, "warnDays", {
    returns: 3651,
    isEnumerable: true,
    isThrowing: false,
  });
  assert.equal(validateAdminCheckView(field.input).ok, false);
  assert.equal(field.calls(), 0);
  const type = withAccessor(tls, "type", { returns: "tls", isEnumerable: true, isThrowing: true });
  assert.equal(validateAdminCheckView(type.input).ok, false);
  assert.equal(type.calls(), 0);
  const nested = withAccessor(tls, "warnDays", {
    returns: 1,
    isEnumerable: true,
    isThrowing: true,
  });
  const config = {
    revision: `sha256-${"0".repeat(64)}`,
    checks: [nested.input],
    components: [],
    maintenance: [],
  };
  assert.equal(validateAdminConfigResponse(config).ok, false);
  assert.equal(nested.calls(), 0);
});

test("check view keeps a non-enumerable field in a union option", () => {
  const input = Object.assign(Object.create({}) as object, {
    id: "t",
    name: "T",
    type: "tls",
    host: "h",
    port: 443,
    warnDays: 14,
    intervalMs: 1000,
  });
  Object.defineProperty(input, "headers", { value: { Authorization: "sentinel-552" } });
  assert.equal(validateAdminCheckView(input).ok, false);
});

test("check view rejects a cyclic field in a union option", () => {
  const input: Record<string, unknown> = {
    id: "t",
    name: "T",
    type: "tls",
    host: "h",
    port: 443,
    warnDays: 14,
    intervalMs: 1000,
  };
  input.headers = input;
  assert.equal(validateAdminCheckView(input).ok, false);
});

test("json assert value rejects an object with a symbol key", () => {
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [{ pointer: "", equals: { [Symbol("non-json")]: "sentinel-552" } }],
  };
  assert.equal(validateCheck(input).ok, false);
  assert.equal(validateAdminCheckInput(input).ok, false);
  assert.equal(validateAdminCheckView(input).ok, false);
});

test("json assert equals accessor counts as absent", () => {
  let reads = 0;
  const assertion = Object.defineProperty({ pointer: "" }, "equals", {
    enumerable: true,
    get() {
      reads += 1;
      return new Date(0);
    },
  });
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [assertion],
  };
  assert.equal(validateCheck(input).ok, false);
  assert.equal(validateAdminCheckInput(input).ok, false);
  assert.equal(validateAdminCheckView(input).ok, false);
  const config = { revision, checks: [input], components: [], maintenance: [] };
  assert.equal(validateAdminConfigResponse(config).ok, false);
  const valid = { ...input, jsonAssert: [{ pointer: "", exists: true }] };
  assert.equal(validateAdminConfigResponse({ ...config, checks: [valid] }).ok, true);
  assert.equal(reads, 0);
});

test("check view rejects an unknown accessor field", () => {
  let reads = 0;
  const input = Object.defineProperty(
    { id: "h", name: "H", url: "https://x/", intervalMs: 1000 },
    "secret",
    {
      enumerable: true,
      get() {
        reads += 1;
        return "sentinel-552";
      },
    },
  );
  assert.equal(validateAdminCheckView(input).ok, false);
  const config = { revision, checks: [input], components: [], maintenance: [] };
  assert.equal(validateAdminConfigResponse(config).ok, false);
  assert.equal(reads, 0);
});

test("check view never runs a getter inside a json assert value", () => {
  let reads = 0;
  const equals = Object.defineProperty({}, "secret", {
    enumerable: true,
    get() {
      reads += 1;
      return "sentinel-552";
    },
  });
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [{ pointer: "", equals }],
  };
  validateAdminCheckView(input);
  assert.equal(reads, 0);
});

test("json assert value still rejects a non-json object", () => {
  for (const equals of [new Date(0), new Map(), new (class Point {})()]) {
    const input = {
      id: "h",
      name: "H",
      url: "https://x/",
      intervalMs: 1000,
      jsonAssert: [{ pointer: "", equals }],
    };
    assert.equal(validateCheck(input).ok, false);
    assert.equal(validateAdminCheckInput(input).ok, false);
    assert.equal(validateAdminCheckView(input).ok, false);
  }
});

test("json assert value rejects a date with an own constructor", () => {
  const equals = Object.defineProperty(new Date(0), "constructor", { value: Date });
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [{ pointer: "", equals }],
  };
  assert.equal(validateCheck(input).ok, false);
  assert.equal(validateAdminCheckInput(input).ok, false);
  assert.equal(validateAdminCheckView(input).ok, false);
});

test("json assert value rejects a plain object with an own constructor", () => {
  let reads = 0;
  const ctor = (): void => undefined;
  Object.defineProperty(ctor, "prototype", {
    get() {
      reads++;
      return {};
    },
  });
  for (const value of [Date, ctor]) {
    const equals = Object.defineProperty({}, "constructor", { value });
    const input = {
      id: "h",
      name: "H",
      url: "https://x/",
      intervalMs: 1000,
      jsonAssert: [{ pointer: "", equals }],
    };
    assert.equal(validateCheck(input).ok, false);
    assert.equal(validateAdminCheckInput(input).ok, false);
    assert.equal(validateAdminCheckView(input).ok, false);
    const config = {
      revision: `sha256-${"0".repeat(64)}`,
      checks: [input],
      components: [],
      maintenance: [],
    };
    assert.equal(validateAdminConfigResponse(config).ok, false);
  }
  assert.equal(reads, 0);
});

test("json assert value accepts a plain object with an own Object constructor", () => {
  const equals = Object.defineProperty({}, "constructor", { value: Object });
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [{ pointer: "", equals }],
  };
  assert.equal(validateCheck(input).ok, true);
  assert.equal(validateAdminCheckInput(input).ok, true);
  assert.equal(validateAdminCheckView(input).ok, true);
  const config = {
    revision: `sha256-${"0".repeat(64)}`,
    checks: [input],
    components: [],
    maintenance: [],
  };
  assert.equal(validateAdminConfigResponse(config).ok, true);
});

test("check view never runs a getter added to Object.prototype", () => {
  let reads = 0;
  Object.defineProperty(Object.prototype, "timeoutMs", {
    configurable: true,
    get() {
      reads++;
      return 1000;
    },
  });
  try {
    const input = { id: "h", name: "H", url: "https://x/", intervalMs: 1000 };
    assert.equal(validateAdminCheckView(input).ok, true);
    const config = {
      revision: `sha256-${"0".repeat(64)}`,
      checks: [input],
      components: [],
      maintenance: [],
    };
    assert.equal(validateAdminConfigResponse(config).ok, true);
  } finally {
    Reflect.deleteProperty(Object.prototype, "timeoutMs");
  }
  assert.equal(reads, 0);
});

test("http cross-field rules never run a getter added to Object.prototype", () => {
  for (const key of ["method", "body", "jsonAssert", "keyword"]) {
    let reads = 0;
    Object.defineProperty(Object.prototype, key, {
      configurable: true,
      get() {
        reads++;
        return undefined;
      },
    });
    try {
      const input = { id: "h", name: "H", url: "https://x/", intervalMs: 1000 };
      assert.equal(validateAdminCheckView(input).ok, true);
      const config = {
        revision: `sha256-${"0".repeat(64)}`,
        checks: [input],
        components: [],
        maintenance: [],
      };
      assert.equal(validateAdminConfigResponse(config).ok, true);
    } finally {
      Reflect.deleteProperty(Object.prototype, key);
    }
    assert.equal(reads, 0, key);
  }
});

test("check view never runs an inherited getter in a union option", () => {
  let reads = 0;
  const proto = Object.defineProperty({}, "warnDays", {
    get() {
      reads++;
      return 14;
    },
  });
  const input = Object.assign(Object.create(proto) as object, {
    id: "t",
    name: "T",
    type: "tls",
    host: "h",
    port: 443,
    intervalMs: 1000,
  });
  const result = validateAdminCheckView(input);
  assert.equal(reads, 0);
  assert.equal(result.ok, false);
});

test("json assert value never runs a getter on a function", () => {
  let reads = 0;
  const ctor = (): void => undefined;
  Object.defineProperty(ctor, "prototype", {
    get() {
      reads++;
      return {};
    },
  });
  const input = {
    id: "h",
    name: "H",
    url: "https://x/",
    intervalMs: 1000,
    jsonAssert: [{ pointer: "", equals: { constructor: ctor } }],
  };
  assert.equal(validateCheck(input).ok, false);
  assert.equal(validateAdminCheckInput(input).ok, false);
  assert.equal(validateAdminCheckView(input).ok, false);
  assert.equal(reads, 0);
});
