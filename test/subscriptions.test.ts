import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  normalizeSubscriberEmail,
  SUBSCRIBER_EMAIL_MAX,
  SUBSCRIPTION_CLEANUP_INTERVAL_MS,
  SUBSCRIPTION_CONFIRM_TOKEN_PATTERN,
  SUBSCRIPTION_CONFIRM_TTL_MS,
  SUBSCRIPTION_MAX_BODY_BYTES,
  SUBSCRIPTION_RESULTS,
  SUBSCRIPTION_ROUTES,
  SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN,
} from "../src/subscriptions.ts";
import {
  validateSubscriptionAnswer,
  validateSubscriptionRequest,
  validateSubscriptionTokenRequest,
} from "../src/validate-subscriptions.ts";

test("constants have their spec values", () => {
  assert.equal(SUBSCRIPTION_CONFIRM_TTL_MS, 86400000);
  assert.equal(SUBSCRIPTION_CLEANUP_INTERVAL_MS, 3600000);
  assert.equal(SUBSCRIPTION_MAX_BODY_BYTES, 1024);
  assert.equal(SUBSCRIBER_EMAIL_MAX, 254);
  assert.deepEqual(SUBSCRIPTION_RESULTS, ["accepted", "confirmed", "unsubscribed"]);
  assert.deepEqual(SUBSCRIPTION_ROUTES, {
    subscribe: "/subscriptions",
    confirm: "/subscriptions/confirm",
    unsubscribe: "/subscriptions/unsubscribe",
  });
});

const local64 = "a".repeat(64);
const domain189 = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
const domain190 = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.com`;

test("address rule counterexamples", () => {
  assert.equal(domain189.length, 189);
  const rows: [unknown, string | undefined][] = [
    [" Sub-A@E2E.Invalid\t", "sub-a@e2e.invalid"],
    ["a@example.com\r\nBcc: x@example.org", undefined],
    ["a@example.com, b@example.com", undefined],
    ["a@b", undefined],
    ["a..b@example.com", undefined],
    [".a@example.com", undefined],
    ["a.@example.com", undefined],
    ['"a b"@example.com', undefined],
    ["ü@example.com", undefined],
    ["a@-example.com", undefined],
    ["a@example-.com", undefined],
    ["a@192.168.0.1", undefined],
    ["a@[192.168.0.1]", undefined],
    [`${"a".repeat(65)}@example.com`, undefined],
    [`${local64}@example.com`, `${local64}@example.com`],
    [`${local64}@${domain189}`, `${local64}@${domain189}`],
    [`${local64}@${domain190}`, undefined],
    ["Name <a@example.com>", undefined],
    ["a@example.com\u0000", undefined],
    ["", undefined],
    [42, undefined],
    [null, undefined],
    [{}, undefined],
  ];
  for (const [input, expected] of rows) {
    assert.equal(normalizeSubscriberEmail(input), expected, JSON.stringify(input));
  }
  assert.equal(`${local64}@${domain189}`.length, 254);
  assert.equal(`${local64}@${domain190}`.length, 255);
});

test("subscription request accepts only the normalized address", () => {
  const ok = { email: "a@example.com" };
  const result = validateSubscriptionRequest(ok);
  assert.ok(result.ok);
  assert.equal(result.value, ok);
  for (const bad of [
    { email: "A@example.com" },
    { email: " a@example.com" },
    {},
    { email: "a@example.com", extra: 1 },
    { email: 1 },
    { email: "x".repeat(129) },
    null,
    "a@example.com",
  ]) {
    assert.equal(validateSubscriptionRequest(bad).ok, false, JSON.stringify(bad));
  }
});

test("token request accepts up to 128 characters", () => {
  const ok = { token: "t".repeat(128) };
  const result = validateSubscriptionTokenRequest(ok);
  assert.ok(result.ok);
  assert.equal(result.value, ok);
  for (const bad of [{}, { token: "a", extra: 1 }, { token: 1 }, { token: "t".repeat(129) }, []]) {
    assert.equal(validateSubscriptionTokenRequest(bad).ok, false, JSON.stringify(bad));
  }
});

test("answer accepts each result only", () => {
  for (const status of ["accepted", "confirmed", "unsubscribed"]) {
    const ok = { status };
    const result = validateSubscriptionAnswer(ok);
    assert.ok(result.ok);
    assert.equal(result.value, ok);
  }
  for (const bad of [
    {},
    { status: "accepted", extra: 1 },
    { status: 1 },
    { status: "t".repeat(129) },
    { status: "pending" },
  ]) {
    assert.equal(validateSubscriptionAnswer(bad).ok, false, JSON.stringify(bad));
  }
});

test("validators never throw and never run a getter", () => {
  let ran = false;
  const trap = Object.defineProperty({}, "email", {
    enumerable: true,
    get: () => {
      ran = true;
      return "a@example.com";
    },
  });
  const proxy = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error("boom");
      },
    },
  );
  for (const input of [trap, proxy, undefined, Symbol("x"), 1n]) {
    validateSubscriptionRequest(input);
    validateSubscriptionTokenRequest(input);
    validateSubscriptionAnswer(input);
  }
  assert.equal(ran, false);
});

test("token patterns are anchored and exact", () => {
  assert.equal(SUBSCRIPTION_CONFIRM_TOKEN_PATTERN.flags, "");
  assert.equal(SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN.flags, "");
  const confirm = "A".repeat(42) + "_";
  assert.ok(SUBSCRIPTION_CONFIRM_TOKEN_PATTERN.test(confirm));
  assert.equal(SUBSCRIPTION_CONFIRM_TOKEN_PATTERN.test(confirm.slice(1)), false);
  assert.equal(SUBSCRIPTION_CONFIRM_TOKEN_PATTERN.test(`${confirm}a`), false);
  assert.equal(SUBSCRIPTION_CONFIRM_TOKEN_PATTERN.test(`${"A".repeat(42)}+`), false);
  const unsub = `${"b".repeat(22)}.${"c-".repeat(21)}d`;
  assert.ok(SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN.test(unsub));
  assert.equal(SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN.test(unsub.slice(1)), false);
  assert.equal(SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN.test(`${unsub}d`), false);
  assert.equal(SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN.test(`${unsub.slice(0, -1)}+`), false);
});
