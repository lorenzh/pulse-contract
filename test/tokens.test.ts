import { test } from "bun:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  TOKEN_ID_PREFIX,
  TOKEN_MAX_BODY_BYTES,
  TOKEN_NAME_MAX,
  TOKEN_ROTATION_OVERLAP_MS,
  TOKEN_SCOPES,
  TOKEN_SECRET_PREFIX,
  type TokenMetadata,
} from "../src/tokens.ts";
import { validateWith } from "../src/validate-core.ts";
import {
  validateTokenCreateInput,
  validateTokenMetadata,
  validateTokenSecretResponse,
  validateTokensResponse,
} from "../src/validate-tokens.ts";

const metadata: TokenMetadata = {
  id: "tok_0123456789abcdef01234567",
  name: "ci",
  scopes: ["read", "checks"],
  location: null,
  source: "api",
  createdAt: 1_800_000_000_000,
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  rotatedAt: null,
  previousValidUntil: null,
};

test("constants equal the spec literals", () => {
  assert.deepEqual(TOKEN_SCOPES, ["read", "checks", "incidents", "admin", "probe"]);
  assert.equal(TOKEN_ROTATION_OVERLAP_MS, 600000);
  assert.equal(TOKEN_NAME_MAX, 100);
  assert.equal(TOKEN_MAX_BODY_BYTES, 4096);
  assert.equal(TOKEN_SECRET_PREFIX, "pulse_");
  assert.equal(TOKEN_ID_PREFIX, "tok_");
});

test("create input rejects every clock-independent counterexample", () => {
  const base = { name: "x", scopes: ["read"] };
  const probe = { name: "p", scopes: ["probe"], location: "eu" };
  const rejected: [unknown, string][] = [
    [{ ...base, scopes: [] }, "token.scopes"],
    [{ ...base, scopes: ["owner"] }, "token.scopes[0]"],
    [{ ...base, scopes: ["read", "read"] }, "token.scopes"],
    [{ ...base, scopes: ["probe", "read"] }, "token.scopes"],
    [{ name: "p", scopes: ["probe"] }, "token.location"],
    [{ ...base, location: "eu" }, "token.location"],
    [{ ...probe, location: ` ${"l".repeat(65)} ` }, "token.location"],
    [{ ...base, name: "   " }, "token.name"],
    [{ ...base, name: "n".repeat(101) }, "token.name"],
    [{ ...base, name: "a\u0000b" }, "token.name"],
    [{ ...base, expiresAt: 1.5 }, "token.expiresAt"],
    [{ ...base, expiresAt: 0 }, "token.expiresAt"],
    [{ ...base, expiresAt: -1 }, "token.expiresAt"],
    [{ ...base, expiresAt: "1" }, "token.expiresAt"],
    [{ name: "x", scopes: ["read"], secret: "chosen-by-client-0000" }, "token"],
  ];
  for (const [input, path] of rejected) {
    const result = validateTokenCreateInput(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.ok(!result.ok && result.error.startsWith(`${path}:`), JSON.stringify(result));
  }
  const unknown = validateTokenCreateInput({ ...base, secret: "chosen-by-client-0000" });
  assert.ok(!unknown.ok && unknown.error.includes("secret"));
  assert.ok(!unknown.ok && !unknown.error.includes("chosen-by-client-0000"));
});

test("create input accepts the spec examples and returns the same object", () => {
  const accepted = [
    { name: "ci", scopes: ["read", "checks"] },
    { name: "probe eu", scopes: ["probe"], location: "eu" },
    { name: "n".repeat(100), scopes: ["admin"] },
    { name: "ci", scopes: ["read"], expiresAt: 1 },
    { name: "ci", scopes: ["read"], expiresAt: 9007199254740991 },
  ];
  for (const input of accepted) {
    const result = validateTokenCreateInput(input);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(result.value, input);
  }
});

test("metadata is strict: no secret and no digest", () => {
  assert.equal(validateTokenMetadata(metadata).ok, true);
  assert.equal(validateTokenMetadata({ ...metadata, secret: "x" }).ok, false);
  assert.equal(validateTokenMetadata({ ...metadata, secretSha256: "a".repeat(64) }).ok, false);
});

test("metadata ties location to the probe scope and allows long legacy names", () => {
  const probe = { ...metadata, scopes: ["probe"], location: "eu", source: "file" };
  assert.equal(validateTokenMetadata(probe).ok, true);
  assert.equal(validateTokenMetadata({ ...probe, location: null }).ok, false);
  assert.equal(validateTokenMetadata({ ...metadata, location: "eu" }).ok, false);
  assert.equal(validateTokenMetadata({ ...metadata, name: "n".repeat(500) }).ok, true);
  assert.equal(validateTokenMetadata({ ...metadata, name: " " }).ok, false);
  assert.equal(validateTokenMetadata({ ...metadata, scopes: ["read", "read"] }).ok, false);
  assert.equal(validateTokenMetadata({ ...metadata, id: "tok_XYZ" }).ok, false);
});

test("list and secret responses", () => {
  assert.equal(validateTokensResponse({ tokens: [metadata] }).ok, true);
  assert.equal(validateTokensResponse({ tokens: [{ ...metadata, secret: "x" }] }).ok, false);
  const secret = { token: metadata, secret: "pulse_abc", previousValidUntil: 1 };
  assert.equal(validateTokenSecretResponse(secret).ok, true);
  assert.equal(validateTokenSecretResponse({ ...secret, secret: "opaque" }).ok, true);
  assert.equal(validateTokenSecretResponse({ ...secret, secret: 1 }).ok, false);
  assert.equal(validateTokenSecretResponse({ ...secret, extra: 1 }).ok, false);
});

test("a getter on the input never runs and validators never throw", () => {
  let calls = 0;
  const input = { name: "ci" };
  Object.defineProperty(input, "scopes", {
    enumerable: true,
    get: () => {
      calls += 1;
      return ["read"];
    },
  });
  assert.equal(validateTokenCreateInput(input).ok, false);
  assert.equal(validateTokenMetadata(input).ok, false);
  assert.equal(calls, 0);
  for (const value of [null, undefined, 1, "x", [], Symbol("s"), 1n]) {
    assert.equal(validateTokenCreateInput(value).ok, false);
  }
});

test("a getter in a nested array or token never runs", () => {
  let calls = 0;
  const scopes: unknown[] = ["read"];
  Object.defineProperty(scopes, 1, {
    enumerable: true,
    get: () => {
      calls += 1;
      return "checks";
    },
  });
  const listed = { ...metadata, scopes };
  assert.equal(validateTokenCreateInput({ name: "ci", scopes }).ok, false);
  assert.equal(validateTokensResponse({ tokens: [metadata, listed] }).ok, false);
  const token = { ...metadata };
  Object.defineProperty(token, "name", {
    enumerable: true,
    get: () => {
      calls += 1;
      return "ci";
    },
  });
  const secret = { token, secret: "opaque", previousValidUntil: null };
  const result = validateTokenSecretResponse(secret);
  assert.deepEqual(result, { ok: false, error: "response.token.name: is required" });
  assert.equal(calls, 0);
});

test("an inherited field counts as absent", () => {
  const input = Object.assign(Object.create({ scopes: ["read"] }) as object, { name: "ci" });
  const result = validateTokenCreateInput(input);
  assert.deepEqual(result, { ok: false, error: "token.scopes: is required" });
  const bare = Object.assign(Object.create(null) as object, { name: "ci", scopes: ["read"] });
  assert.equal(validateTokenCreateInput(bare).ok, true);
  const proto = { scopes: ["read"] };
  const shadowed = Object.assign(Object.create(proto) as object, { name: "ci", secret: "s" });
  const leak = validateTokenCreateInput(shadowed);
  assert.ok(!leak.ok && !leak.error.includes('"s"'), JSON.stringify(leak));
  assert.equal(validateTokenCreateInput({ name: "ci", scopes: "read" }).ok, false);
  const inheritedName = Object.assign(Object.create({ name: "ci" }) as object, {
    scopes: ["read"],
  });
  assert.equal(validateTokensResponse({ tokens: [inheritedName] }).ok, false);
});

test("a polluted Object.prototype never makes a token input valid", () => {
  Object.defineProperty(Object.prototype, "location", { value: 7, configurable: true });
  try {
    const result = validateTokenCreateInput({ name: "ci", scopes: ["probe"] });
    assert.deepEqual(result, { ok: false, error: "token.location: is required" });
  } finally {
    Reflect.deleteProperty(Object.prototype, "location");
  }
});

test("an inherited location getter never runs and never counts as a location", () => {
  let calls = 0;
  Object.defineProperty(Object.prototype, "location", {
    configurable: true,
    get() {
      calls += 1;
      return "eu";
    },
  });
  try {
    const probe = validateTokenCreateInput({ name: "p", scopes: ["probe"] });
    const read = validateTokenCreateInput({ name: "r", scopes: ["read"] });
    assert.deepEqual(probe, { ok: false, error: "token.location: is required" });
    assert.equal(read.ok, true);
    assert.equal(calls, 0);
  } finally {
    Reflect.deleteProperty(Object.prototype, "location");
  }
});

test("the shared validator core never runs a getter in a record or a union", () => {
  let calls = 0;
  const getter = {
    enumerable: true,
    get: () => {
      calls += 1;
      return "x";
    },
  };
  const record = z.record(z.string(), z.string());
  const recordValue = { a: "x" };
  Object.defineProperty(recordValue, "b", getter);
  assert.equal(validateWith(record, recordValue, "r").ok, false);
  assert.equal(validateWith(record, { a: "x" }, "r").ok, true);
  const union = z.union([z.string(), z.strictObject({ a: z.string() })]);
  const unionValue = {};
  Object.defineProperty(unionValue, "a", getter);
  assert.equal(validateWith(union, unionValue, "u").ok, false);
  assert.equal(validateWith(union, { a: "x" }, "u").ok, true);
  assert.equal(calls, 0);
});
