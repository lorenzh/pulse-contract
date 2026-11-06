import { z } from "zod";
import { epochMs, objectError, oneOf } from "./runtime-settings.js";
/** Most commands that one claim returns. */
export const RESEND_CLAIM_MAX = 20;
/** A claimed command goes back to `queued` after this time. Exactly this age is requeued. */
export const RESEND_CLAIM_TIMEOUT_MS = 60_000;
/** Most resend commands that the api keeps. */
export const RESEND_COMMAND_MAX = 1000;
/** Most stored resend request ids. */
export const RESEND_REQUEST_MAX = 10_000;
/** The api deletes commands and request rows older than this: 7 days. */
export const RESEND_RETENTION_MS = 604_800_000;
/**
 * States of a resend command. Open: `queued`, `claimed`, `admitted`. Admission outcomes:
 * `admitted`, `not-failed`, `no-payload`, `channel-unavailable`. Final outcomes: `delivered`,
 * `failed`, `dropped`.
 */
export const RESEND_COMMAND_STATES = [
    "queued",
    "claimed",
    "admitted",
    "delivered",
    "failed",
    "dropped",
    "not-failed",
    "no-payload",
    "channel-unavailable",
];
const RESULT_STATES = [
    "admitted",
    "delivered",
    "failed",
    "dropped",
    "not-failed",
    "no-payload",
    "channel-unavailable",
];
const REQUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;
const COMMAND_ID = /^[A-Za-z0-9_-]{24}$/;
const CHANNEL_ID_MAX = 200;
const KEY_MAX = 300;
const text = (max) => z
    .string({ error: "must be a string" })
    .min(1, `must be 1..${max} characters`)
    .max(max, `must be 1..${max} characters`);
const requestId = z
    .string({ error: "must be a string" })
    .regex(REQUEST_ID, { error: `must match ${REQUEST_ID.source}` });
export const resendCommandStateSchema = z.enum(RESEND_COMMAND_STATES, {
    error: oneOf(RESEND_COMMAND_STATES),
});
export const resendRequestSchema = z.strictObject({ channelId: text(CHANNEL_ID_MAX), key: text(KEY_MAX), requestId }, objectError);
export const resendCommandSchema = z.strictObject({
    id: z
        .string({ error: "must be a string" })
        .regex(COMMAND_ID, { error: `must match ${COMMAND_ID.source}` }),
    channelId: text(CHANNEL_ID_MAX),
    key: text(KEY_MAX),
    requestId,
    state: resendCommandStateSchema,
    createdAt: epochMs,
    updatedAt: epochMs,
}, objectError);
export const resendClaimResponseSchema = z.strictObject({
    commands: z
        .array(resendCommandSchema, { error: "must be an array" })
        .max(RESEND_CLAIM_MAX, `must hold at most ${RESEND_CLAIM_MAX} commands`),
}, objectError);
export const resendResultInputSchema = z.strictObject({ state: z.enum(RESULT_STATES, { error: oneOf(RESULT_STATES) }) }, objectError);
