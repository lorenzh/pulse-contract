import { z } from "zod";
/** Routes of the notify subscription listener. */
export declare const SUBSCRIPTION_ROUTES: {
    readonly subscribe: "/subscriptions";
    readonly confirm: "/subscriptions/confirm";
    readonly unsubscribe: "/subscriptions/unsubscribe";
};
/** Largest request body of a subscription route, in bytes. */
export declare const SUBSCRIPTION_MAX_BODY_BYTES = 1024;
/** How long a confirmation link works: 24 hours. */
export declare const SUBSCRIPTION_CONFIRM_TTL_MS = 86400000;
/** Period of notify's cleanup of unconfirmed subscriptions: 1 hour. */
export declare const SUBSCRIPTION_CLEANUP_INTERVAL_MS = 3600000;
/** Longest subscriber address after normalization. */
export declare const SUBSCRIBER_EMAIL_MAX = 254;
/** Token of a confirmation link. */
export declare const SUBSCRIPTION_CONFIRM_TOKEN_PATTERN: RegExp;
/** Token of an unsubscribe link: id, a dot, and the secret. */
export declare const SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN: RegExp;
/** Statuses of a successful subscription answer. */
export declare const SUBSCRIPTION_RESULTS: readonly ["accepted", "confirmed", "unsubscribed"];
/**
 * The normalized subscriber address, or `undefined` when the value is not an accepted address.
 * Trims spaces and tabs at both ends and lower-cases the result. Never throws.
 */
export declare function normalizeSubscriberEmail(value: unknown): string | undefined;
/** Body of `POST /subscriptions`. Only the normalized address is valid. */
export declare const subscriptionRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strict>;
/** Body of `POST /subscriptions/confirm` and `/subscriptions/unsubscribe`. */
export declare const subscriptionTokenRequestSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strict>;
declare const subscriptionResultSchema: z.ZodEnum<{
    accepted: "accepted";
    confirmed: "confirmed";
    unsubscribed: "unsubscribed";
}>;
/** Success answer of a subscription route. */
export declare const subscriptionAnswerSchema: z.ZodObject<{
    status: z.ZodEnum<{
        accepted: "accepted";
        confirmed: "confirmed";
        unsubscribed: "unsubscribed";
    }>;
}, z.core.$strict>;
export type SubscriptionRequest = z.infer<typeof subscriptionRequestSchema>;
export type SubscriptionTokenRequest = z.infer<typeof subscriptionTokenRequestSchema>;
export type SubscriptionResult = z.infer<typeof subscriptionResultSchema>;
export type SubscriptionAnswer = z.infer<typeof subscriptionAnswerSchema>;
export {};
