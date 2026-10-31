import { test } from "bun:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  AUDIT_DEFAULT_LIMIT,
  AUDIT_EXPORT_CONTENT_TYPE,
  AUDIT_MAX_LIMIT,
  AUDIT_TARGET_KINDS,
  auditEntrySchema,
} from "../src/audit.ts";
import { validateAuditEntry, validateAuditPage } from "../src/validate-audit.ts";
import { validateWith } from "../src/validate-core.ts";

const entry = {
  id: 7,
  at: 1_700_000_000_000,
  actor: { tokenId: "tok_0123456789abcdef01234567", name: "ci" },
  action: "check.replace",
  target: { kind: "check", id: "web" },
  revision: `sha256-${"a".repeat(64)}`,
};

test("audit constants have the spec values", () => {
  assert.deepEqual(
    [...AUDIT_ACTIONS],
    [
      "check.create",
      "check.replace",
      "check.delete",
      "component.create",
      "component.replace",
      "component.delete",
      "maintenance.create",
      "maintenance.replace",
      "maintenance.delete",
      "manual-incident.create",
      "manual-incident.update",
      "manual-incident.resolve",
      "manual-incident.delete",
      "token.create",
      "token.rotate",
      "token.revoke",
      "token.import",
    ],
  );
  assert.deepEqual(
    [...AUDIT_TARGET_KINDS],
    ["check", "component", "maintenance", "manual-incident", "token"],
  );
  assert.equal(AUDIT_DEFAULT_LIMIT, 100);
  assert.equal(AUDIT_MAX_LIMIT, 1000);
  assert.equal(AUDIT_EXPORT_CONTENT_TYPE, "application/x-ndjson");
});

test("audit entry accepts long target ids and a null actor token", () => {
  const long = { ...entry, target: { kind: "check", id: "x".repeat(10_000) } };
  const result = validateAuditEntry(long);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, long);
  const system = {
    ...entry,
    actor: { tokenId: null, name: "file import" },
    action: "manual-incident.resolve",
    target: { kind: "manual-incident", id: "3" },
    revision: null,
  };
  assert.equal(validateAuditEntry(system).ok, true);
});

test("audit entry rejects the counterexamples with their field", () => {
  const cases: [unknown, string][] = [
    [{ ...entry, target: { kind: "check", id: "" } }, "entry.target.id"],
    [{ ...entry, body: "x" }, "entry: has an unknown field: body"],
    [{ ...entry, actor: { ...entry.actor, secret: "s" } }, "entry.actor: has an unknown field"],
    [
      { ...entry, action: "token.revoke", target: { kind: "check", id: "web" } },
      "entry.target.kind: must match the action",
    ],
    [{ ...entry, revision: "abc" }, "entry.revision"],
    [{ ...entry, id: 0 }, "entry.id"],
    [{ ...entry, at: Number.NaN }, "entry.at"],
    [{ ...entry, action: "check.patch" }, "entry.action"],
    [{ ...entry, actor: { tokenId: "tok_x", name: "ci" } }, "entry.actor.tokenId"],
    [{ ...entry, actor: { tokenId: null, name: "" } }, "entry.actor.name"],
    ["nope", "entry: must be an object"],
  ];
  for (const [value, expected] of cases) {
    const result = validateAuditEntry(value);
    assert.equal(result.ok, false, expected);
    assert.ok(
      !result.ok && result.error.startsWith(expected),
      `${expected} vs ${String(!result.ok && result.error)}`,
    );
  }
});

test("audit page checks its cursor", () => {
  const page = { entries: [entry], nextBefore: null };
  const result = validateAuditPage(page);
  assert.equal(result.ok && result.value, page);
  assert.equal(validateAuditPage({ entries: [], nextBefore: 6 }).ok, true);
  const zero = validateAuditPage({ entries: [entry], nextBefore: 0 });
  assert.ok(!zero.ok && zero.error.startsWith("page.nextBefore"));
  const bad = validateAuditPage({ entries: [{ ...entry, id: "1" }], nextBefore: null });
  assert.ok(!bad.ok && bad.error.startsWith("page.entries[0].id"));
});

test("audit validators never run a getter", () => {
  let calls = 0;
  const hostile = { ...entry };
  Object.defineProperty(hostile, "action", {
    enumerable: true,
    get() {
      calls += 1;
      return "check.create";
    },
  });
  assert.equal(validateAuditEntry(hostile).ok, false);
  assert.equal(validateAuditPage({ entries: [hostile], nextBefore: null }).ok, false);
  assert.equal(calls, 0);
});

test("entries nested in a record or a nullable union keep the own-data rule", () => {
  let calls = 0;
  const hostile = { ...entry };
  Object.defineProperty(hostile, "id", {
    enumerable: true,
    get() {
      calls += 1;
      return 1;
    },
  });
  const byId = z.record(z.string(), auditEntrySchema);
  const latest = z.union([auditEntrySchema, z.null()]);
  assert.equal(validateWith(byId, { a: entry }, "byId").ok, true);
  assert.equal(validateWith(byId, { a: hostile }, "byId").ok, false);
  assert.equal(validateWith(latest, null, "latest").ok, true);
  assert.equal(validateWith(latest, hostile, "latest").ok, false);
  assert.equal(calls, 0);
});
