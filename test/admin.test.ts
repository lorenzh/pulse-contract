import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  ADMIN_IF_MATCH_HEADER,
  ADMIN_REVISION_PREFIX,
  ADMIN_STATUS_ORDER,
  type AdminConfigResponse,
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
