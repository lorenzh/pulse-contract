import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCheck } from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

const base = { id: "a", name: "A", url: "https://example.com/", intervalMs: 1000 };
const tls = {
  id: "t",
  name: "T",
  type: "tls",
  host: "h",
  port: 443,
  warnDays: 14,
  intervalMs: 1000,
};
const beat = { id: "b", name: "B", type: "heartbeat", period: 1000, grace: 0 };

const errorOf = (value: unknown): string | undefined => {
  const result = validateCheck(value, "c");
  return result.ok ? undefined : result.error;
};
const withFields = (fields: Record<string, unknown>): unknown => ({ ...base, ...fields });

test("the fixture with every new option is valid", () => {
  const check = fixture.variants.requestCheck;
  assert.equal(validateCheck(check).ok, true);
  // Each new field is validated, not ignored as an unknown key.
  const bad = { method: "get", headers: { A: 1 }, body: 1, expectedStatus: [], jsonAssert: [] };
  for (const [field, value] of Object.entries(bad)) {
    assert.match(errorOf({ ...check, [field]: value }) ?? "", new RegExp(`^c\\.${field}`), field);
  }
});

test("every method is accepted, bad ones are not", () => {
  for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(errorOf(withFields({ method })), undefined, method);
  }
  assert.match(errorOf(withFields({ method: "get" })) ?? "", /^c\.method: must be one of/);
  assert.match(errorOf(withFields({ method: "TRACE" })) ?? "", /^c\.method:/);
});

test("headers: names, forbidden, duplicates, count, size", () => {
  assert.equal(errorOf(withFields({ headers: { "X-Key": "v", Empty: "" } })), undefined);
  assert.match(
    errorOf(withFields({ headers: { "bad name": "v" } })) ?? "",
    /^c\.headers\.bad name:/,
  );
  assert.match(errorOf(withFields({ headers: { "": "v" } })) ?? "", /^c\.headers\./);
  for (const name of ["Host", "content-length", "Transfer-Encoding", "CONNECTION", "User-Agent"]) {
    assert.match(errorOf(withFields({ headers: { [name]: "v" } })) ?? "", /controls/, name);
  }
  assert.match(errorOf(withFields({ headers: { A: "1", a: "2" } })) ?? "", /duplicate/);
  const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`H${i}`, "v"]));
  assert.match(errorOf(withFields({ headers: many })) ?? "", /at most 20/);
  assert.match(errorOf(withFields({ headers: { A: "x\r\ny" } })) ?? "", /^c\.headers\.A:/);
  assert.match(errorOf(withFields({ headers: { A: "x\ty" } })) ?? "", /^c\.headers\.A:/);
  assert.equal(errorOf(withFields({ headers: { A: "a b\x80" } })), undefined);
  assert.match(errorOf(withFields({ headers: { A: "x".repeat(4097) } })) ?? "", /^c\.headers\.A:/);
  assert.equal(errorOf(withFields({ headers: { A: "x".repeat(4096) } })), undefined);
  assert.match(errorOf(withFields({ headers: { A: 1 } })) ?? "", /^c\.headers\.A:/);
  const big = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`H${i}`, "x".repeat(4000)]));
  assert.match(errorOf(withFields({ headers: big })) ?? "", /16384/);
});

test("headers: the env form", () => {
  assert.equal(errorOf(withFields({ headers: { A: { env: "MY_TOKEN_1" } } })), undefined);
  for (const env of ["1BAD", "has-dash", "", "x".repeat(129)]) {
    assert.match(errorOf(withFields({ headers: { A: { env } } })) ?? "", /^c\.headers\.A/, env);
  }
  assert.match(errorOf(withFields({ headers: { A: {} } })) ?? "", /^c\.headers\.A/);
});

test("body: limit and method rule", () => {
  assert.equal(errorOf(withFields({ method: "POST", body: "x".repeat(65_536) })), undefined);
  assert.match(
    errorOf(withFields({ method: "POST", body: "x".repeat(65_537) })) ?? "",
    /^c\.body:/,
  );
  // 2 bytes per character: 32769 characters is 65538 bytes.
  assert.match(
    errorOf(withFields({ method: "POST", body: "é".repeat(32_769) })) ?? "",
    /^c\.body:/,
  );
  assert.equal(errorOf(withFields({ method: "PUT", body: "" })), undefined);
  assert.equal(errorOf(withFields({ body: "x" })), "c.body: is not allowed with GET");
  assert.equal(
    errorOf(withFields({ method: "HEAD", body: "x" })),
    "c.body: is not allowed with HEAD",
  );
  assert.match(errorOf(withFields({ method: "POST", body: 3 })) ?? "", /^c\.body:/);
});

test("expectedStatus: codes and ranges", () => {
  assert.equal(
    errorOf(withFields({ expectedStatus: [200, 404, "300-399", "100-599"] })),
    undefined,
  );
  for (const bad of [
    [],
    [99],
    [600],
    ["300-200"],
    ["99-200"],
    ["200-600"],
    ["2xx"],
    ["200"],
    [1.5],
    [null],
  ]) {
    assert.match(
      errorOf(withFields({ expectedStatus: bad })) ?? "",
      /^c\.expectedStatus/,
      JSON.stringify(bad),
    );
  }
  assert.match(errorOf(withFields({ expectedStatus: Array(21).fill(200) })) ?? "", /at most 20/);
  assert.match(errorOf(withFields({ expectedStatus: 200 })) ?? "", /must be an array/);
  assert.equal(errorOf(withFields({})), undefined);
});

test("jsonAssert: pointers and exclusivity", () => {
  const ok = (assertion: unknown) => errorOf(withFields({ jsonAssert: [assertion] }));
  assert.equal(ok({ pointer: "", equals: 1 }), undefined);
  assert.equal(ok({ pointer: "/a~1b/c~0d/0", exists: true }), undefined);
  assert.equal(ok({ pointer: "/a", equals: null }), undefined);
  assert.equal(ok({ pointer: "/a", equals: { x: [1, "y", null] } }), undefined);
  assert.match(ok({ pointer: "/a~2" }) ?? "", /^c\.jsonAssert\[0\]\.pointer/);
  assert.match(ok({ pointer: "/a~", equals: 1 }) ?? "", /pointer/);
  assert.match(ok({ pointer: "a", equals: 1 }) ?? "", /pointer/);
  assert.match(ok({ pointer: `/${"a".repeat(256)}`, equals: 1 }) ?? "", /pointer/);
  assert.match(ok({ pointer: "/a" }) ?? "", /exactly one/);
  assert.match(ok({ pointer: "/a", equals: 1, exists: true }) ?? "", /exactly one/);
  assert.match(ok({ pointer: "/a", exists: false }) ?? "", /exists: must be true/);
  assert.match(errorOf(withFields({ jsonAssert: [] })) ?? "", /must not be empty/);
  assert.match(
    errorOf(withFields({ jsonAssert: Array(11).fill({ pointer: "", exists: true }) })) ?? "",
    /at most 10/,
  );
});

test("HEAD rejects jsonAssert and keyword", () => {
  assert.equal(
    errorOf(withFields({ method: "HEAD", jsonAssert: [{ pointer: "", exists: true }] })),
    "c.jsonAssert: is not allowed with HEAD",
  );
  assert.equal(
    errorOf(withFields({ method: "HEAD", keyword: "x" })),
    "c.keyword: is not allowed with HEAD",
  );
  assert.equal(errorOf(withFields({ method: "HEAD", expectedStatus: [200] })), undefined);
});

test("tls and heartbeat reject every new field", () => {
  const fields: Record<string, unknown> = {
    method: "GET",
    headers: {},
    body: "x",
    expectedStatus: [200],
    jsonAssert: [{ pointer: "", exists: true }],
    keyword: "x",
  };
  for (const [key, value] of Object.entries(fields)) {
    assert.match(errorOf({ ...tls, [key]: value }) ?? "", new RegExp(`^c\\.${key}`), `tls ${key}`);
    assert.match(
      errorOf({ ...beat, [key]: value }) ?? "",
      new RegExp(`^c\\.${key}`),
      `beat ${key}`,
    );
  }
  assert.equal(errorOf(tls), undefined);
  assert.equal(errorOf(beat), undefined);
});
