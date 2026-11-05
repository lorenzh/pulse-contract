import { test } from "bun:test";
import assert from "node:assert/strict";
import { validateCheckLocationUptime } from "../src/index.ts";

const valid = {
  checkId: "web",
  windowDays: 90,
  locations: [
    { location: "eu", good: 4, results: 5, uptime: 80 },
    { location: "us", good: 0, results: 0, uptime: null },
  ],
};

test("accepts the eu and us example and returns the same object", () => {
  const result = validateCheckLocationUptime(valid);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, valid);
});

test("accepts names in UTF-16 code-unit order", () => {
  const value = {
    checkId: "web",
    windowDays: 90,
    locations: ["B", "a", "b"].map((location) => ({ location, good: 0, results: 0, uptime: null })),
  };
  assert.equal(validateCheckLocationUptime(value).ok, true);
});

const eu = { location: "eu", good: 4, results: 5, uptime: 80 };
const rejected: [string, unknown][] = [
  ["duplicate names", { ...valid, locations: [eu, eu] }],
  ["unsorted names", { ...valid, locations: [{ ...eu, location: "us" }, eu] }],
  [
    "uptime 50 with results 0",
    { ...valid, locations: [{ ...eu, good: 0, results: 0, uptime: 50 }] },
  ],
  [
    "uptime null with results 3",
    { ...valid, locations: [{ ...eu, good: 3, results: 3, uptime: null }] },
  ],
  ["good 4 with results 3", { ...valid, locations: [{ ...eu, good: 4, results: 3, uptime: 100 }] }],
  ["windowDays 30", { ...valid, windowDays: 30 }],
  ["negative good", { ...valid, locations: [{ ...eu, good: -1 }] }],
  ["fractional results", { ...valid, locations: [{ ...eu, results: 5.5 }] }],
  ["empty location name", { ...valid, locations: [{ ...eu, location: "" }] }],
  ["uptime over 100", { ...valid, locations: [{ ...eu, uptime: 101 }] }],
];

for (const [name, value] of rejected) {
  test(`rejects ${name}`, () => {
    assert.equal(validateCheckLocationUptime(value).ok, false);
  });
}

test("never throws on any input type", () => {
  for (const value of [undefined, null, 1, "x", [], Symbol("s"), () => 1, new Map()]) {
    assert.equal(validateCheckLocationUptime(value).ok, false);
  }
});
