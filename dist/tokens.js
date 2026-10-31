import { z } from "zod";
import { TOKEN_ID } from "./token-id.js";
/** Token scopes, in the order the api lists them. */
export const TOKEN_SCOPES = ["read", "checks", "incidents", "admin", "probe"];
/** How long a rotated-out credential keeps working: 10 minutes. */
export const TOKEN_ROTATION_OVERLAP_MS = 600_000;
/** Longest name of a token created over the api, in characters after trim. */
export const TOKEN_NAME_MAX = 100;
/** Largest request body of a token route: 4096 bytes, answered with 413 beyond it. */
export const TOKEN_MAX_BODY_BYTES = 4096;
/** Prefix of a generated secret. */
export const TOKEN_SECRET_PREFIX = "pulse_";
const LOCATION_MAX = 64;
const MAX_ADMIN_SCOPES = 4;
const CONTROL_CHARACTER = /\p{Cc}/u;
const objectError = {
    error: (issue) => issue.code === "unrecognized_keys"
        ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
        : "must be an object",
};
export const tokenScopeSchema = z.enum(TOKEN_SCOPES, {
    error: `must be one of ${TOKEN_SCOPES.map((s) => JSON.stringify(s)).join(", ")}`,
});
/** A string of 1..max characters after trim. */
const trimmedText = (max) => z.string({ error: "must be a string" }).refine((v) => {
    const length = v.trim().length;
    return length >= 1 && length <= max;
}, { error: `must be 1..${max} characters after trim` });
const nullableTime = z.number({ error: "must be a finite number or null" }).nullable();
const distinct = (scopes) => new Set(scopes).size === scopes.length;
const isProbeOnly = (scopes) => scopes.length === 1 && scopes[0] === "probe";
/** Scopes of a token: distinct, and `probe` only alone. */
const scopesSchema = z
    .array(tokenScopeSchema, { error: "must be an array" })
    .min(1, `must hold 1..${MAX_ADMIN_SCOPES} scopes`)
    .max(MAX_ADMIN_SCOPES, `must hold 1..${MAX_ADMIN_SCOPES} scopes`)
    .refine(distinct, { error: "must not repeat a scope" })
    .refine((s) => !s.includes("probe") || s.length === 1, {
    error: "probe must be the only scope",
});
export const tokenCreateInputSchema = z
    .strictObject({
    name: trimmedText(TOKEN_NAME_MAX).refine((v) => !CONTROL_CHARACTER.test(v), {
        error: "must not contain control characters",
    }),
    scopes: scopesSchema,
    location: trimmedText(LOCATION_MAX).optional(),
    expiresAt: z
        .int({ error: "must be a positive safe integer" })
        .min(1, "must be a positive safe integer")
        .max(Number.MAX_SAFE_INTEGER, "must be a positive safe integer")
        .optional(),
}, objectError)
    // Zod builds its output as a plain object, so read the field as an own property:
    // an inherited `location` must neither count nor run a getter.
    .superRefine((input, ctx) => {
    if (isProbeOnly(input.scopes) !==
        (Object.getOwnPropertyDescriptor(input, "location")?.value !== undefined)) {
        ctx.addIssue({
            code: "custom",
            path: ["location"],
            message: "is required for a probe token and not allowed otherwise",
        });
    }
});
export const tokenMetadataSchema = z
    .strictObject({
    id: z.string({ error: "must be a string" }).regex(TOKEN_ID, {
        error: `must match ${TOKEN_ID.source}`,
    }),
    // No maximum: imported legacy names keep their length.
    name: trimmedText(Number.POSITIVE_INFINITY),
    scopes: z
        .array(tokenScopeSchema, { error: "must be an array" })
        .min(1, "must hold at least 1 scope")
        .refine(distinct, { error: "must not repeat a scope" }),
    location: z.string({ error: "must be a string or null" }).nullable(),
    source: z.enum(["api", "file"], { error: 'must be one of "api", "file"' }),
    createdAt: z.number({ error: "must be a finite number" }),
    lastUsedAt: nullableTime,
    expiresAt: nullableTime,
    revokedAt: nullableTime,
    rotatedAt: nullableTime,
    previousValidUntil: nullableTime,
}, objectError)
    .superRefine((token, ctx) => {
    if (isProbeOnly(token.scopes) !==
        (Object.getOwnPropertyDescriptor(token, "location")?.value !== null)) {
        ctx.addIssue({
            code: "custom",
            path: ["location"],
            message: "is set for a probe token only",
        });
    }
});
export const tokensResponseSchema = z.strictObject({ tokens: z.array(tokenMetadataSchema, { error: "must be an array" }) }, objectError);
export const tokenSecretResponseSchema = z.strictObject({
    token: tokenMetadataSchema,
    secret: z.string({ error: "must be a string" }),
    previousValidUntil: nullableTime,
}, objectError);
