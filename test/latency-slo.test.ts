import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  type CheckLatency,
  type LatencyDay,
  validateCheck,
  validateCheckLatency,
  validateCheckWithState,
  validateComponent,
  validateComponentWithState,
  validateLatencyResponse,
  validateSlo,
} from "../src/index.ts";

const day = (i: number, extra: Partial<LatencyDay> = {}): LatencyDay => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  p50Ms: 20,
  p95Ms: 40,
  count: 10,
  ...extra,
});
const latency = (n = 90): CheckLatency => ({
  checkId: "web",
  days: Array.from({ length: n }, (_, i) => day(i)),
});

const http = { id: "a", name: "A", url: "https://example.com", intervalMs: 1000 };
const checks: Record<string, unknown>[] = [
  http,
  { id: "t", name: "T", type: "tls", host: "h", port: 443, warnDays: 14, intervalMs: 1000 },
  { id: "p", name: "P", type: "tcp", host: "h", port: 1, intervalMs: 1000 },
  { id: "d", name: "D", type: "dns", dnsName: "example.com", recordType: "A", intervalMs: 1000 },
  { id: "m", name: "M", type: "domain", domain: "example.com", warnDays: 5, intervalMs: 3_600_000 },
  { id: "h", name: "H", type: "heartbeat", period: 1000, grace: 0 },
];

test("availabilityTarget is accepted at 90 and 99.99 on every check type", () => {
  for (const check of checks) {
    for (const availabilityTarget of [90, 99.9, 99.99]) {
      const v = validateCheck({ ...check, availabilityTarget });
      assert.equal(v.ok, true, `${String(check.type)} ${availabilityTarget}`);
    }
  }
});

test("availabilityTarget rejects 89.9, 100, NaN and strings on every check type", () => {
  for (const check of checks) {
    for (const availabilityTarget of [89.9, 100, 101, Number.NaN, "99.9", null]) {
      const v = validateCheck({ ...check, availabilityTarget });
      assert.equal(v.ok, false, `${String(check.type)} ${String(availabilityTarget)}`);
    }
  }
  const bad = validateCheck({ ...http, availabilityTarget: 100 });
  assert.equal(bad.ok === false && bad.error.startsWith("check.availabilityTarget:"), true);
});

test("a component accepts and rejects availabilityTarget at the bounds", () => {
  const component = { id: "c", name: "C", checkIds: ["a"] };
  assert.equal(validateComponent({ ...component, availabilityTarget: 90 }).ok, true);
  assert.equal(validateComponent({ ...component, availabilityTarget: 99.95 }).ok, true);
  assert.equal(validateComponent({ ...component, availabilityTarget: 89.9 }).ok, false);
  assert.equal(validateComponent({ ...component, availabilityTarget: 100 }).ok, false);
  assert.equal(validateComponent({ ...component, availabilityTarget: "99" }).ok, false);
});

test("CheckLatency accepts 90 days with null days", () => {
  const value = latency();
  value.days[3] = day(3, { p50Ms: null, p95Ms: null, count: 0 });
  assert.equal(validateCheckLatency(value).ok, true);
  assert.equal(validateLatencyResponse([value, latency()]).ok, true);
  assert.equal(validateLatencyResponse([]).ok, true);
});

test("CheckLatency rejects a wrong day count", () => {
  for (const n of [0, 89, 91]) {
    assert.equal(validateCheckLatency(latency(n)).ok, false, String(n));
  }
});

test("CheckLatency ties null values to count 0", () => {
  const empty = latency();
  empty.days[0] = day(0, { count: 0 });
  assert.equal(validateCheckLatency(empty).ok, false);
  const full = latency();
  full.days[0] = day(0, { p95Ms: null });
  const result = validateCheckLatency(full);
  assert.equal(result.ok, false);
  assert.equal(
    !result.ok && result.error,
    "latency.days[0].p95Ms: must be a number when count > 0",
  );
  const bad = latency();
  bad.days[1] = day(1, { date: "2026-02-30" });
  assert.equal(validateCheckLatency(bad).ok, false);
  assert.equal(validateLatencyResponse([latency(), latency(5)]).ok, false);
});

test("Slo accepts numbers and nulls and rejects bad fields", () => {
  const slo = { target: 99.9, windowDays: 30, availability: 99.95, budgetRemaining: 50 };
  assert.equal(validateSlo(slo).ok, true);
  assert.equal(validateSlo({ ...slo, availability: 99.8, budgetRemaining: -100 }).ok, true);
  assert.equal(validateSlo({ ...slo, availability: null, budgetRemaining: null }).ok, true);
  assert.equal(validateSlo({ ...slo, target: 100 }).ok, false);
  assert.equal(validateSlo({ ...slo, windowDays: 7 }).ok, false);
  assert.equal(validateSlo({ ...slo, availability: 101 }).ok, false);
  assert.equal(validateSlo({ ...slo, budgetRemaining: "50" }).ok, false);
  assert.equal(validateSlo({ ...slo, budgetRemaining: undefined }).ok, false);
});

test("slo is optional on a check and a component with state", () => {
  const slo = { target: 99.9, windowDays: 30, availability: null, budgetRemaining: null };
  const state = {
    state: "up",
    consecutiveDown: 0,
    lastResultAt: null,
    lastReason: null,
    locations: [],
  };
  assert.equal(validateCheckWithState({ ...http, ...state }).ok, true);
  assert.equal(validateCheckWithState({ ...http, ...state, slo }).ok, true);
  assert.equal(
    validateCheckWithState({ ...http, ...state, slo: { ...slo, windowDays: 1 } }).ok,
    false,
  );
  const component = {
    id: "c",
    name: "C",
    checkIds: ["a"],
    state: "up",
    uptime: null,
    incidentIds: [],
  };
  assert.equal(validateComponentWithState(component).ok, true);
  assert.equal(
    validateComponentWithState({ ...component, availabilityTarget: 99.9, slo }).ok,
    true,
  );
  assert.equal(validateComponentWithState({ ...component, slo: { target: 50 } }).ok, false);
});
