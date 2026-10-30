import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateUptime,
  type CheckState,
  combineStates,
  type UptimeDay,
  validateComponent,
  validateComponentsResponse,
  validateComponentsUptimeResponse,
  validateComponentUptime,
  validateComponentWithState,
} from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

const STATES: CheckState[] = ["up", "degraded", "down", "unknown", "maintenance"];

function expected(a: CheckState, b: CheckState): CheckState {
  const both = [a, b];
  if (both.includes("down")) return "down";
  if (both.includes("degraded")) return "degraded";
  if (both.includes("up")) return "up";
  if (both.includes("maintenance")) return "maintenance";
  return "unknown";
}

test("combineStates covers every pair and the all-same cases", () => {
  for (const a of STATES) {
    for (const b of STATES) {
      assert.equal(combineStates([a, b]), expected(a, b), `${a} + ${b}`);
      assert.equal(combineStates([b, a]), expected(a, b), `${b} + ${a}`);
    }
    assert.equal(combineStates([a, a, a]), a);
    assert.equal(combineStates([a]), a);
  }
});

test("combineStates ignores maintenance and unknown next to up", () => {
  assert.equal(combineStates(["unknown", "maintenance", "up"]), "up");
  assert.equal(combineStates(["unknown", "maintenance"]), "maintenance");
  assert.equal(combineStates([]), "unknown");
});

const day = (date: string, uptime: number | null, results: number): UptimeDay => ({
  date,
  uptime,
  results,
});

test("aggregateUptime weights by results", () => {
  const result = aggregateUptime([
    [day("2026-10-01", 100, 10), day("2026-10-02", 50, 10)],
    [day("2026-10-01", 0, 30), day("2026-10-02", null, 0)],
  ]);
  assert.deepEqual(result.days, [day("2026-10-01", 25, 40), day("2026-10-02", 50, 10)]);
  assert.equal(result.uptime, 30);
});

test("aggregateUptime gives null and 0 results for days without results", () => {
  const result = aggregateUptime([[day("2026-10-01", null, 0)], [day("2026-10-01", null, 0)]]);
  assert.deepEqual(result, { days: [day("2026-10-01", null, 0)], uptime: null });
  assert.deepEqual(aggregateUptime([]), { days: [], uptime: null });
});

test("aggregateUptime stays within 0..100 and orders days", () => {
  const result = aggregateUptime([[day("2026-10-03", 100, 3), day("2026-10-01", 100, 7)]]);
  assert.deepEqual(
    result.days.map((d) => d.date),
    ["2026-10-01", "2026-10-03"],
  );
  assert.equal(result.uptime, 100);
});

const valid = { id: "web", name: "Website", checkIds: ["a"] };
const rejects = (value: unknown, pattern: RegExp): void => {
  const result = validateComponent(value);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, pattern);
};

test("validateComponent accepts valid components and returns the same object", () => {
  for (const c of [fixture.component, fixture.minimalComponent, valid]) {
    const result = validateComponent(c);
    assert.equal(result.ok && result.value, c);
  }
  assert.equal(validateComponent({ ...valid, id: "a.b_c-1" }).ok, true);
});

test("validateComponent rejects bad ids", () => {
  for (const id of ["", "Web", "-web", ".web", "we b", "a/b", "x".repeat(65)]) {
    rejects({ ...valid, id }, /^component\.id:/);
  }
  assert.equal(validateComponent({ ...valid, id: "x".repeat(64) }).ok, true);
});

test("validateComponent rejects bad checkIds", () => {
  rejects({ ...valid, checkIds: [] }, /component\.checkIds: must not be empty/);
  rejects({ ...valid, checkIds: ["a", "a"] }, /component\.checkIds: must not contain duplicates/);
  rejects({ ...valid, checkIds: [""] }, /component\.checkIds\[0\]:/);
  rejects({ id: "web", name: "Website" }, /component\.checkIds: is required/);
});

test("validateComponent rejects unknown keys", () => {
  rejects({ ...valid, extra: 1 }, /^component: has an unknown field: extra$/);
});

test("validateComponent checks text fields", () => {
  rejects({ ...valid, name: "" }, /component\.name:/);
  rejects({ ...valid, name: "x".repeat(101) }, /component\.name:/);
  rejects({ ...valid, name: " padded" }, /component\.name: .*whitespace/);
  rejects({ ...valid, name: "a\nb" }, /component\.name: .*control/);
  rejects({ ...valid, description: "x".repeat(501) }, /component\.description:/);
  rejects({ ...valid, description: "a\u0007" }, /component\.description: .*control/);
  rejects({ ...valid, group: "" }, /component\.group:/);
  rejects({ ...valid, group: "x".repeat(101) }, /component\.group:/);
  assert.equal(validateComponent({ ...valid, name: "x".repeat(100), description: "" }).ok, true);
});

test("validateComponentWithState checks state, uptime and incident ids", () => {
  const ok = validateComponentWithState(fixture.components[0]);
  assert.equal(ok.ok, true);
  const base = { ...valid, state: "up", uptime: null, incidentIds: [] };
  assert.equal(validateComponentWithState(base).ok, true);
  for (const bad of [
    { ...base, state: "broken" },
    { ...base, uptime: 101 },
    { ...base, incidentIds: [1.5] },
    { ...base, incidentIds: undefined },
  ]) {
    assert.equal(validateComponentWithState(bad).ok, false);
  }
});

test("validateComponentUptime and the array validators", () => {
  assert.equal(validateComponentUptime(fixture.componentsUptime[0]).ok, true);
  const bad = {
    componentId: "web",
    days: [{ date: "2030-02-30", uptime: null, results: 0 }],
    uptime: null,
  };
  const result = validateComponentUptime(bad);
  assert.equal(!result.ok && result.error, "uptime.days[0].date: must be a YYYY-MM-DD date");
  assert.equal(validateComponentsUptimeResponse(fixture.componentsUptime).ok, true);
  assert.equal(validateComponentsUptimeResponse([]).ok, true);
  const second = validateComponentsUptimeResponse([fixture.componentsUptime[0], bad]);
  assert.match(!second.ok ? second.error : "", /^uptime\[1\]\.days\[0\]\.date:/);
  assert.equal(validateComponentsResponse(fixture.components).ok, true);
  const notArray = validateComponentsResponse({});
  assert.equal(!notArray.ok && notArray.error, "components: must be an array");
  const badItem = validateComponentsResponse([{ ...valid }]);
  assert.match(!badItem.ok ? badItem.error : "", /^components\[0\]\.state:/);
});
