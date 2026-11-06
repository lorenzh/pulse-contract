import { z } from "zod";
/** Most commands that one claim returns. */
export declare const RESEND_CLAIM_MAX = 20;
/** A claimed command goes back to `queued` after this time. Exactly this age is requeued. */
export declare const RESEND_CLAIM_TIMEOUT_MS = 60000;
/** Most resend commands that the api keeps. */
export declare const RESEND_COMMAND_MAX = 1000;
/** Most stored resend request ids. */
export declare const RESEND_REQUEST_MAX = 10000;
/** The api deletes commands and request rows older than this: 7 days. */
export declare const RESEND_RETENTION_MS = 604800000;
/**
 * States of a resend command. Open: `queued`, `claimed`, `admitted`. Admission outcomes:
 * `admitted`, `not-failed`, `no-payload`, `channel-unavailable`. Final outcomes: `delivered`,
 * `failed`, `dropped`.
 */
export declare const RESEND_COMMAND_STATES: readonly ["queued", "claimed", "admitted", "delivered", "failed", "dropped", "not-failed", "no-payload", "channel-unavailable"];
export declare const resendCommandStateSchema: z.ZodEnum<{
    admitted: "admitted";
    "channel-unavailable": "channel-unavailable";
    claimed: "claimed";
    delivered: "delivered";
    dropped: "dropped";
    failed: "failed";
    "no-payload": "no-payload";
    "not-failed": "not-failed";
    queued: "queued";
}>;
/** The state of a resend command. */
export type ResendCommandState = z.infer<typeof resendCommandStateSchema>;
export declare const resendRequestSchema: z.ZodObject<{
    channelId: z.ZodString;
    key: z.ZodString;
    requestId: z.ZodString;
}, z.core.$strict>;
/** Body of `POST /admin/notify/resends`. */
export type ResendRequest = z.infer<typeof resendRequestSchema>;
export declare const resendCommandSchema: z.ZodObject<{
    id: z.ZodString;
    channelId: z.ZodString;
    key: z.ZodString;
    requestId: z.ZodString;
    state: z.ZodEnum<{
        admitted: "admitted";
        "channel-unavailable": "channel-unavailable";
        claimed: "claimed";
        delivered: "delivered";
        dropped: "dropped";
        failed: "failed";
        "no-payload": "no-payload";
        "not-failed": "not-failed";
        queued: "queued";
    }>;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
}, z.core.$strict>;
/** One resend command as the api stores it. */
export type ResendCommand = z.infer<typeof resendCommandSchema>;
export declare const resendClaimResponseSchema: z.ZodObject<{
    commands: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        channelId: z.ZodString;
        key: z.ZodString;
        requestId: z.ZodString;
        state: z.ZodEnum<{
            admitted: "admitted";
            "channel-unavailable": "channel-unavailable";
            claimed: "claimed";
            delivered: "delivered";
            dropped: "dropped";
            failed: "failed";
            "no-payload": "no-payload";
            "not-failed": "not-failed";
            queued: "queued";
        }>;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Answer of `POST /service/notify/resends/claim`. */
export type ResendClaimResponse = z.infer<typeof resendClaimResponseSchema>;
export declare const resendResultInputSchema: z.ZodObject<{
    state: z.ZodEnum<{
        admitted: "admitted";
        "channel-unavailable": "channel-unavailable";
        delivered: "delivered";
        dropped: "dropped";
        failed: "failed";
        "no-payload": "no-payload";
        "not-failed": "not-failed";
    }>;
}, z.core.$strict>;
/** Body of `POST /service/notify/resends/:id/result`: an admission or a final outcome. */
export type ResendResultInput = z.infer<typeof resendResultInputSchema>;
