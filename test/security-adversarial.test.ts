import { test } from "bun:test";
import assert from "node:assert/strict";
import * as built from "../dist/index.js";
import * as source from "../src/index.ts";

const sentinel = "ADVERSARIAL-SECRET-0123456789";
const http = { id: "a", name: "A", url: "https://local.invalid", intervalMs: 1000 };
const heartbeat = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
const revision = `sha256-${"a".repeat(64)}`;
const config = {
  revision,
  checks: [],
  shadowed: [],
  components: [],
  maintenance: [],
  file: { state: "ok", message: null, lastAppliedAt: 0 },
};

for (const [entry, api] of Object.entries({ source, built })) {
  test(`${entry}: adversarial special header names cannot hide literals or invalid markers`, () => {
    for (const name of [
      "__proto__",
      "constructor",
      "prototype",
      "toString",
      "hasOwnProperty",
      "__defineGetter__",
    ]) {
      const view = { ...http, source: "database", headers: { [name]: sentinel } };
      const results = [
        api.validateAdminCheckView(view),
        api.validateAdminConfigResponse({ ...config, checks: [view] }),
        api.validateAdminConfigResponse({ ...config, shadowed: [view] }),
        api.validateAdminCheckInput({
          ...http,
          headers: { [name]: { keep: true, extra: sentinel } },
        }),
      ];
      for (const result of results) {
        assert.equal(result.ok, false, name);
        assert.equal(JSON.stringify(result).includes(sentinel), false, name);
      }
    }
  });

  test(`${entry}: adversarial ambiguous env and keep markers are rejected`, () => {
    for (const value of [
      { env: "PULSE_HEADER_TEST", keep: true },
      { env: "PULSE_HEADER_TEST", extra: sentinel },
      { keep: true, env: sentinel },
      { keep: true, toString: sentinel },
      JSON.parse('{"keep":true,"__proto__":{"secret":"hidden"}}'),
      JSON.parse('{"env":"PULSE_HEADER_TEST","__proto__":"hidden"}'),
    ]) {
      const input = { ...http, headers: { Authorization: value } };
      for (const result of [
        api.validateAdminCheckInput(input),
        api.validateAdminCheckView({ ...input, source: "database" }),
        api.validateAdminCheckInput({ ...http, method: "POST", body: value }),
      ]) {
        assert.equal(result.ok, false);
        assert.equal(JSON.stringify(result).includes(sentinel), false);
      }
    }
  });

  test(`${entry}: adversarial secret fields cannot cross check type or export boundaries`, () => {
    const checks = [
      http,
      { id: "t", name: "T", type: "tls", host: "h", port: 443, warnDays: 14, intervalMs: 1000 },
      { id: "c", name: "C", type: "tcp", host: "h", port: 1, intervalMs: 1000 },
      { id: "d", name: "D", type: "dns", dnsName: "x.test", recordType: "A", intervalMs: 1000 },
      { id: "m", name: "M", type: "domain", domain: "x.test", warnDays: 5, intervalMs: 3_600_000 },
      heartbeat,
    ];
    for (const check of checks) {
      const view = { ...check, source: "database", secret: sentinel };
      for (const result of [
        api.validateAdminCheckView(view),
        api.validateAdminConfigResponse({ ...config, checks: [view] }),
        api.validateAdminConfigResponse({ ...config, shadowed: [view] }),
        api.validateAdminConfigExport({
          checks: [{ ...check, secret: sentinel }],
          components: [],
          maintenance: [],
        }),
      ]) {
        assert.equal(result.ok, false);
        assert.equal(JSON.stringify(result).includes(sentinel), false);
      }
    }
  });

  test(`${entry}: adversarial summary ignores unknown getters without executing them`, () => {
    let reads = 0;
    const get = (): never => {
      reads += 1;
      throw new Error(sentinel);
    };
    const check = Object.defineProperties(
      { id: "a" },
      {
        constructor: { enumerable: true, get },
        headers: { enumerable: true, get },
        ["__proto__"]: { enumerable: true, get },
      },
    );
    const value = Object.defineProperty({ revision, checks: [check] }, "file", {
      enumerable: true,
      get,
    });
    const result = api.validateAdminConfigSummary(value);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value, value);
    assert.equal(reads, 0);
    const malformed = Object.defineProperty({ checks: [check] }, "revision", {
      enumerable: true,
      get,
    });
    assert.deepEqual(api.validateAdminConfigSummary(malformed), {
      ok: false,
      error: "config.revision: is required",
    });
    assert.equal(reads, 0);
  });
}
