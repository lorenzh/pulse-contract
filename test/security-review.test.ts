import { test } from "bun:test";
import assert from "node:assert/strict";
import * as built from "../dist/index.js";
import * as source from "../src/index.ts";

const http = { id: "a", name: "A", url: "https://local.invalid", intervalMs: 1000 };
const heartbeat = { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 };
const revision = `sha256-${"a".repeat(64)}`;
const sentinel = "SECURITY-REVIEW-SECRET-0123456789";
const config = {
  revision,
  checks: [],
  shadowed: [],
  components: [],
  maintenance: [],
  file: { state: "ok", message: null, lastAppliedAt: 0 },
};
const exported = { checks: [], components: [], maintenance: [] };

for (const [entry, api] of Object.entries({ source, built })) {
  test(`${entry}: security review rejects wrong types without throwing`, () => {
    const validators = [
      api.validateAdminCheckInput,
      api.validateAdminCheckView,
      api.validateAdminConfigResponse,
      api.validateAdminConfigExport,
      api.validateAdminConfigSummary,
    ];
    for (const validate of validators) {
      for (const value of [null, undefined, true, 1, [], "x".repeat(1_048_577)]) {
        assert.equal(validate(value).ok, false);
      }
    }
    for (const source of [null, true, 1, "file", {}, []]) {
      assert.equal(api.validateAdminCheckInput({ ...http, source }).ok, false);
    }
    for (const hasSecret of [null, false, 1, "true", {}, []]) {
      assert.equal(api.validateAdminCheckInput({ ...heartbeat, hasSecret }).ok, false);
    }
    for (const keep of [null, false, 1, "true", {}, []]) {
      const headers = { Authorization: { keep } };
      assert.equal(api.validateAdminCheckInput({ ...http, headers }).ok, false);
    }
    assert.equal(api.validateAdminConfigExport({ ...exported, redacted: [] }).ok, false);
  });

  test(`${entry}: security review rejects controls and preserves field limits`, () => {
    const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i));
    controls.push("\x7f", "\u2028", "\u2029", "\r\nInjected: true");
    for (const control of controls) {
      for (const value of [`${sentinel}${control}`, `${control}${sentinel}`]) {
        const result = api.validateAdminCheckInput({ ...http, headers: { Authorization: value } });
        assert.equal(result.ok, false);
        assert.equal(JSON.stringify(result).includes(sentinel), false);
      }
    }
    for (const name of [
      "Host",
      "CONTENT-LENGTH",
      "transfer-encoding",
      "Connection",
      "User-Agent",
      "bad name",
      "x\r\nX",
      "x".repeat(257),
    ]) {
      for (const value of ["value", { env: "PULSE_HEADER_TEST" }, { keep: true }]) {
        assert.equal(
          api.validateAdminCheckInput({ ...http, headers: { [name]: value } }).ok,
          false,
        );
      }
    }
    assert.equal(
      api.validateAdminCheckInput({ ...http, headers: { X: "x".repeat(4097) } }).ok,
      false,
    );
    assert.equal(
      api.validateAdminCheckInput({ ...http, headers: { X: { keep: true }, x: "" } }).ok,
      false,
    );
    const many = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`X-${i}`, { keep: true }]),
    );
    assert.equal(api.validateAdminCheckInput({ ...http, headers: many }).ok, false);
    const large = Object.fromEntries(
      Array.from({ length: 4 }, (_, i) => [`X-${i}`, "x".repeat(4096)]),
    );
    assert.equal(api.validateAdminCheckInput({ ...http, headers: large }).ok, false);
    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      assert.equal(
        api.validateAdminCheckInput({ ...http, method, body: "x".repeat(65_537) }).ok,
        false,
      );
      assert.equal(
        api.validateAdminCheckInput({ ...http, method, body: "é".repeat(32_769) }).ok,
        false,
      );
    }
    for (const method of ["GET", "HEAD"]) {
      assert.equal(
        api.validateAdminCheckInput({ ...http, method, body: { keep: true } }).ok,
        false,
      );
    }
  });

  test(`${entry}: security review errors omit secret and server text values`, () => {
    const badInputs = [
      { ...http, source: sentinel },
      { ...http, type: sentinel },
      { ...http, secret: sentinel },
      { ...http, headers: { Authorization: `${sentinel}\r\n` } },
      { ...http, headers: { Authorization: { env: sentinel } } },
      { ...http, headers: { Authorization: { keep: sentinel } } },
      { ...http, body: sentinel },
      { ...http, method: "POST", body: sentinel.repeat(3000) },
      { ...http, url: `https://user:${sentinel}@local.invalid` },
      { ...http, extra: sentinel },
    ];
    for (const value of badInputs) {
      const result = api.validateAdminCheckInput(value);
      assert.equal(result.ok, false);
      assert.equal(JSON.stringify(result).includes(sentinel), false);
    }
    for (const check of [
      { ...heartbeat, secret: sentinel },
      { ...http, source: sentinel },
      { ...http, headers: { Authorization: { keep: true } } },
    ]) {
      const result = api.validateAdminConfigExport({ ...exported, checks: [check] });
      assert.equal(result.ok, false);
      assert.equal(JSON.stringify(result).includes(sentinel), false);
    }
    const result = api.validateAdminConfigSummary({ revision: sentinel, checks: [] });
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes(sentinel), false);
  });

  test(`${entry}: security review never executes nested or array getters`, () => {
    let reads = 0;
    const get = (): never => {
      reads += 1;
      throw new Error(sentinel);
    };
    const accessor = (key: string): object =>
      Object.defineProperty({}, key, { enumerable: true, get });
    for (const key of [
      "type",
      "source",
      "headers",
      "body",
      "hasSecret",
      "constructor",
      "__proto__",
    ]) {
      const input = Object.defineProperty({ ...http }, key, { enumerable: true, get });
      api.validateAdminCheckInput(input);
      api.validateAdminConfigResponse({ ...config, checks: [input] });
    }
    for (const value of [accessor("keep"), accessor("env"), accessor("constructor")]) {
      const input = { ...http, method: "POST", headers: { Authorization: value }, body: value };
      api.validateAdminCheckInput(input);
      api.validateAdminCheckView({ ...input, source: "database" });
      api.validateAdminConfigExport({ ...exported, checks: [input] });
    }
    const checks = Object.defineProperty([http], "0", { enumerable: true, get });
    assert.equal(api.validateAdminConfigResponse({ ...config, checks }).ok, false);
    assert.equal(api.validateAdminConfigSummary({ revision, checks }).ok, false);
    assert.equal(api.validateAdminConfigExport({ ...exported, checks }).ok, false);
    assert.equal(api.validateAdminConfigSummary({ revision, checks: [accessor("id")] }).ok, false);
    assert.equal(
      api.validateAdminConfigSummary(Object.assign(Object.create({ revision }), { checks: [] })).ok,
      false,
    );
    assert.equal(reads, 0);
  });

  test(`${entry}: security review prototype keys never mutate prototypes`, () => {
    for (const key of ["__proto__", "constructor", "prototype"]) {
      const input: unknown = JSON.parse(JSON.stringify({ ...http, [key]: { polluted: sentinel } }));
      assert.equal(api.validateAdminCheckInput(input).ok, false);
    }
    assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
    const checks = [JSON.parse('{"id":"a","__proto__":{"polluted":true},"constructor":null}')];
    assert.equal(api.validateAdminConfigSummary({ revision, checks }).ok, true);
    assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
  });

  test(`${entry}: security review URL validation performs no target or env lookup`, () => {
    for (const url of [
      "file:///etc/passwd",
      "gopher://127.0.0.1",
      "https://user:secret@127.0.0.1",
    ]) {
      assert.equal(api.validateAdminCheckInput({ ...http, url }).ok, false);
    }
    for (const url of [
      "http://127.0.0.1",
      "http://[::1]",
      // eslint-disable-next-line sonarjs/no-clear-text-protocols -- Hostile URL fixture; the validator performs no network request.
      "http://10.0.0.1",
      "http://169.254.169.254",
    ]) {
      assert.equal(
        api.validateAdminCheckInput({
          ...http,
          url,
          headers: { Authorization: { env: "PULSE_HEADER_UNSET_SECURITY_REVIEW" } },
        }).ok,
        true,
      );
    }
  });

  test(`${entry}: security review rejects literal __proto__ header values in admin views`, () => {
    const headers: unknown = JSON.parse('{"__proto__":"SECURITY-REVIEW-SECRET-0123456789"}');
    const view = { ...http, source: "database", headers };
    assert.deepEqual(
      [
        api.validateAdminCheckView(view).ok,
        api.validateAdminConfigResponse({ ...config, checks: [view] }).ok,
        api.validateAdminConfigResponse({ ...config, shadowed: [view] }).ok,
      ],
      [false, false, false],
      "a literal header secret must not pass admin-view or config validators",
    );
  });

  test(`${entry}: security review rejects malformed __proto__ keep markers`, () => {
    const headers: unknown = JSON.parse('{"__proto__":{"keep":true,"extra":"attacker"}}');
    const result = api.validateAdminCheckInput({ ...http, headers });
    assert.equal(result.ok, false, "a keep marker must reject extra keys for every header name");
  });
}
