import { test } from "bun:test";
import assert from "node:assert/strict";
import { checkWireVersion, WIRE_VERSION, WIRE_VERSION_HEADER } from "../src/index.ts";

test("wire version constants", () => {
  assert.equal(WIRE_VERSION, 1);
  assert.equal(WIRE_VERSION_HEADER, "x-pulse-contract");
});

test("checkWireVersion accepts the current version", () => {
  assert.deepEqual(checkWireVersion("1"), { status: "ok" });
  assert.deepEqual(checkWireVersion(" 1 "), { status: "ok" });
});

test("checkWireVersion reports an absent header", () => {
  assert.deepEqual(checkWireVersion(null), { status: "absent" });
  assert.deepEqual(checkWireVersion(undefined), { status: "absent" });
});

test("checkWireVersion reports other and malformed values as mismatch", () => {
  for (const value of ["2", "0", "1.0", "01x", "abc", "", "-1", "1e0"]) {
    const result = checkWireVersion(value);
    assert.equal(result.status, "mismatch", value);
    if (result.status === "mismatch") {
      assert.match(result.error, /x-pulse-contract/);
    }
  }
});
