import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getManualIncident,
  getManualIncidents,
  incidentImpactState,
  MANUAL_INCIDENT_MAX_UPDATES,
  MANUAL_INCIDENT_MESSAGE_MAX,
  MANUAL_INCIDENT_TITLE_MAX,
  type ManualIncident,
  validateManualIncident,
  validateManualIncidentInput,
  validateManualIncidentsResponse,
  validateManualIncidentUpdateInput,
  WIRE_VERSION,
  WIRE_VERSION_HEADER,
} from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

const base = fixture.manualIncident;
const open = (): ManualIncident => ({
  ...base,
  status: "monitoring",
  resolvedAt: null,
  updates: [
    { at: 1000, status: "investigating", message: "a" },
    { at: 2000, status: "monitoring", message: "b" },
  ],
});
const errorOf = (r: { ok: boolean; error?: string }): string | undefined =>
  r.ok ? undefined : r.error;

test("valid open and resolved incidents pass and return the same object", () => {
  for (const incident of [base, open()]) {
    const r = validateManualIncident(incident);
    assert.equal(r.ok && r.value, incident);
  }
  assert.equal(validateManualIncidentsResponse([base, open()]).ok, true);
  assert.match(errorOf(validateManualIncidentsResponse([base, 1])) ?? "", /^manualIncidents\[1\]/);
});

test("invariants: status and resolvedAt agree", () => {
  assert.match(
    errorOf(validateManualIncident({ ...base, resolvedAt: null })) ?? "",
    /resolvedAt: must be set exactly when/,
  );
  assert.match(errorOf(validateManualIncident({ ...open(), resolvedAt: 5 })) ?? "", /resolvedAt/);
});

test("invariants: updates", () => {
  assert.match(errorOf(validateManualIncident({ ...base, updates: [] })) ?? "", /updates/);
  const wrongLast = { ...open(), status: "identified" };
  assert.match(errorOf(validateManualIncident(wrongLast)) ?? "", /updates\[1\]\.status/);
  const unordered = open();
  unordered.updates = [
    { at: 2000, status: "investigating", message: "a" },
    { at: 1000, status: "monitoring", message: "b" },
  ];
  assert.match(errorOf(validateManualIncident(unordered)) ?? "", /updates\[1\]\.at/);
  const late = { ...base, resolvedAt: 4000 };
  assert.match(
    errorOf(validateManualIncident(late)) ?? "",
    /updates\[1\]\.at: must equal resolvedAt/,
  );
  const many = open();
  many.updates = Array.from({ length: MANUAL_INCIDENT_MAX_UPDATES + 1 }, () => ({
    at: 1,
    status: "monitoring" as const,
    message: "m",
  }));
  assert.match(errorOf(validateManualIncident(many)) ?? "", /at most 100/);
});

test("text rules and limits", () => {
  const input = { title: "t", impact: "none", componentIds: [], message: "m" };
  assert.equal(validateManualIncidentInput(input).ok, true);
  assert.equal(validateManualIncidentInput({ ...input, message: "a\nb <script>" }).ok, true);
  const bad = (patch: Record<string, unknown>): string | undefined =>
    errorOf(validateManualIncidentInput({ ...input, ...patch }));
  assert.match(bad({ title: "" }) ?? "", /title/);
  assert.match(bad({ title: "x".repeat(MANUAL_INCIDENT_TITLE_MAX + 1) }) ?? "", /title/);
  assert.match(bad({ title: "a\nb" }) ?? "", /control characters/);
  assert.match(bad({ message: "x".repeat(MANUAL_INCIDENT_MESSAGE_MAX + 1) }) ?? "", /message/);
  assert.match(bad({ message: "a\u0007" }) ?? "", /control characters except newline/);
  assert.match(bad({ message: "a\r\nb" }) ?? "", /control characters except newline/);
  assert.match(bad({ impact: "huge" }) ?? "", /impact/);
  assert.match(bad({ status: "resolved" }) ?? "", /status/);
  assert.equal(bad({ status: "identified" }), undefined);
  assert.match(bad({ componentIds: ["a", "a"] }) ?? "", /duplicates/);
  assert.match(bad({ componentIds: ["Bad Id"] }) ?? "", /componentIds\[0\]/);
  const fifty1 = Array.from({ length: 51 }, (_, i) => `c${i}`);
  assert.match(bad({ componentIds: fifty1 }) ?? "", /at most 50/);
  assert.match(errorOf(validateManualIncidentInput({ title: "t" })) ?? "", /is required/);
});

test("update input allows resolved", () => {
  assert.equal(validateManualIncidentUpdateInput({ status: "resolved", message: "ok" }).ok, true);
  assert.match(
    errorOf(validateManualIncidentUpdateInput({ status: "open", message: "ok" })) ?? "",
    /status/,
  );
});

test("incidentImpactState maps impact to a component state", () => {
  assert.equal(incidentImpactState("none"), undefined);
  assert.equal(incidentImpactState("minor"), "degraded");
  assert.equal(incidentImpactState("major"), "down");
  assert.equal(incidentImpactState("critical"), "down");
});

const json =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { [WIRE_VERSION_HEADER]: String(WIRE_VERSION) },
      }),
    );

test("getManualIncidents reads, filters and tolerates 404 on request", async () => {
  let seen = "";
  const spy: typeof fetch = (url) => {
    seen = String(url);
    return json(200, [base])(url);
  };
  const ok = await getManualIncidents("http://api.test/", { fetch: spy, timeoutMs: 1000 }, "open");
  assert.equal(seen, "http://api.test/manual-incidents?status=open");
  assert.equal(ok.ok && ok.value.length, 1);

  const strict = await getManualIncidents("http://api.test", {
    fetch: json(404, {}),
    timeoutMs: 1000,
  });
  assert.equal(!strict.ok && strict.error.kind, "http");
  const tolerant = await getManualIncidents("http://api.test", {
    fetch: json(404, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.deepEqual(tolerant.ok && tolerant.value, []);
  const failing = await getManualIncidents("http://api.test", {
    fetch: json(500, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.equal(failing.ok, false);
  const invalid = await getManualIncidents("http://api.test", {
    fetch: json(200, [{ id: 1 }]),
    timeoutMs: 1000,
  });
  assert.equal(!invalid.ok && invalid.error.kind, "validation");
});

test("getManualIncident reads one incident", async () => {
  let seen = "";
  const spy: typeof fetch = (url) => {
    seen = String(url);
    return json(200, base)(url);
  };
  const r = await getManualIncident("http://api.test", 7, { fetch: spy, timeoutMs: 1000 });
  assert.equal(seen, "http://api.test/manual-incidents/7");
  assert.equal(r.ok, true);
  const missing = await getManualIncident("http://api.test", 7, {
    fetch: json(404, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.equal(!missing.ok && missing.error.kind, "http");
});
