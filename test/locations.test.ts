import { test } from "bun:test";
import assert from "node:assert/strict";
import { validateLocation, validateLocationsResponse } from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

const errorOf = (result: { ok: boolean; error?: string }): string | undefined =>
  result.ok ? undefined : result.error;

test("a valid location passes and the same object is returned", () => {
  const result = validateLocation(fixture.location);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, fixture.location);
  assert.equal(
    validateLocation({ ...fixture.location, state: "silent", lastResultAt: 0 }).ok,
    true,
  );
});

test("invalid locations are rejected with a path", () => {
  const base = fixture.location;
  const cases: [unknown, string][] = [
    [{ ...base, state: "gone" }, 'location.state: must be one of "reporting", "silent"'],
    [{ ...base, lastResultAt: -1 }, "location.lastResultAt: must be an integer >= 0"],
    [{ name: "a", state: "silent" }, "location.lastResultAt: is required"],
    [{ ...base, name: "" }, "location.name: must be a non-empty string"],
    [{ ...base, extra: 1 }, "location: has an unknown field: extra"],
    ["x", "location: must be an object"],
  ];
  for (const [input, message] of cases) {
    assert.equal(errorOf(validateLocation(input)), message);
  }
});

test("validateLocationsResponse names the bad index", () => {
  assert.equal(validateLocationsResponse(fixture.locations).ok, true);
  assert.equal(validateLocationsResponse([]).ok, true);
  assert.equal(errorOf(validateLocationsResponse({})), "locations: must be an array");
  assert.equal(
    errorOf(validateLocationsResponse([fixture.location, { ...fixture.location, state: "x" }])),
    'locations[1].state: must be one of "reporting", "silent"',
  );
});
