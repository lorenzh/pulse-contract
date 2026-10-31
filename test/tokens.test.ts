import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  TOKEN_ID_PREFIX,
  TOKEN_MAX_BODY_BYTES,
  TOKEN_NAME_MAX,
  TOKEN_ROTATION_OVERLAP_MS,
  TOKEN_SCOPES,
  TOKEN_SECRET_PREFIX,
  type TokenMetadata,
  validateTokenCreateInput,
  validateTokenMetadata,
  validateTokenSecretResponse,
  validateTokensResponse,
} from "../src/index.ts";

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
