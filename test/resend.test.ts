import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  RESEND_CLAIM_MAX,
  RESEND_CLAIM_TIMEOUT_MS,
  RESEND_COMMAND_MAX,
  RESEND_COMMAND_STATES,
  RESEND_REQUEST_MAX,
  RESEND_RETENTION_MS,
} from "../src/resend.ts";
import {
  validateResendClaimResponse,
  validateResendCommand,
  validateResendRequest,
  validateResendResultInput,
} from "../src/validate-runtime.ts";

const request = { channelId: "a", key: "42:opened", requestId: "req_0123456789abcd" };
const command = { id: "c".repeat(24), ...request, state: "queued", createdAt: 1, updatedAt: 1 };

test("constants equal the spec literals", () => {
  assert.equal(RESEND_CLAIM_MAX, 20);
  assert.equal(RESEND_CLAIM_TIMEOUT_MS, 60000);
  assert.equal(RESEND_COMMAND_MAX, 1000);
  assert.equal(RESEND_REQUEST_MAX, 10000);
  assert.equal(RESEND_RETENTION_MS, 604800000);
  assert.deepEqual(RESEND_COMMAND_STATES, [
    "queued",
    "claimed",
    "admitted",
    "delivered",
    "failed",
    "dropped",
    "not-failed",
    "no-payload",
    "channel-unavailable",
  ]);
});

test("result input accepts admission and final outcomes and refuses queued and claimed", () => {
  for (const state of [
    "admitted",
    "not-failed",
    "no-payload",
    "channel-unavailable",
    "delivered",
    "failed",
    "dropped",
  ]) {
    const input = { state };
    const result = validateResendResultInput(input);
    assert.ok(result.ok && Object.is(result.value, input), state);
  }
  const message =
    'result.state: must be one of "admitted", "delivered", "failed", "dropped", "not-failed", "no-payload", "channel-unavailable"';
  assert.deepEqual(validateResendResultInput({ state: "queued" }), { ok: false, error: message });
  assert.deepEqual(validateResendResultInput({ state: "claimed" }), { ok: false, error: message });
});

test("requests, commands and claims", () => {
  const ok = validateResendRequest(request);
  assert.ok(ok.ok && Object.is(ok.value, request));
  assert.deepEqual(validateResendRequest({ ...request, requestId: "short" }), {
    ok: false,
    error: "resend.requestId: must match ^[A-Za-z0-9_-]{16,64}$",
  });
  assert.deepEqual(validateResendRequest({ ...request, key: "k".repeat(301) }), {
    ok: false,
    error: "resend.key: must be 1..300 characters",
  });
  assert.equal(validateResendCommand(command).ok, true);
  assert.equal(validateResendCommand({ ...command, state: "lost" }).ok, false);
  assert.equal(validateResendClaimResponse({ commands: Array(20).fill(command) }).ok, true);
  assert.deepEqual(validateResendClaimResponse({ commands: Array(21).fill(command) }), {
    ok: false,
    error: "claim.commands: must hold at most 20 commands",
  });
});

test("validators never throw on any input type", () => {
  for (const value of [undefined, null, 1, "x", [], () => 1, Symbol("s"), 1n]) {
    for (const validate of [
      validateResendRequest,
      validateResendCommand,
      validateResendClaimResponse,
      validateResendResultInput,
    ]) {
      assert.equal(validate(value).ok, false);
    }
  }
});
