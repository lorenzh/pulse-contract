import { z } from "zod";
/** Token scopes, in the order the api lists them. */
export declare const TOKEN_SCOPES: readonly ["read", "checks", "incidents", "admin", "probe"];
/** How long a rotated-out credential keeps working: 10 minutes. */
export declare const TOKEN_ROTATION_OVERLAP_MS = 600000;
/** Longest name of a token created over the api, in characters after trim. */
export declare const TOKEN_NAME_MAX = 100;
/** Largest request body of a token route: 4096 bytes, answered with 413 beyond it. */
export declare const TOKEN_MAX_BODY_BYTES = 4096;
/** Prefix of a generated secret. */
export declare const TOKEN_SECRET_PREFIX = "pulse_";
/** Prefix of a token id: `tok_` followed by 24 lower-case hex digits. */
export declare const TOKEN_ID_PREFIX = "tok_";
export declare const tokenScopeSchema: z.ZodEnum<{
    admin: "admin";
    checks: "checks";
    incidents: "incidents";
    probe: "probe";
    read: "read";
}>;
export type TokenScope = z.infer<typeof tokenScopeSchema>;
export declare const tokenCreateInputSchema: z.ZodObject<{
    name: z.ZodString;
    scopes: z.ZodArray<z.ZodEnum<{
        admin: "admin";
        checks: "checks";
        incidents: "incidents";
        probe: "probe";
        read: "read";
    }>>;
    location: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>;
/** Body of `POST /admin/tokens`. The client never chooses the secret. */
export type TokenCreateInput = z.infer<typeof tokenCreateInputSchema>;
export declare const tokenMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    scopes: z.ZodArray<z.ZodEnum<{
        admin: "admin";
        checks: "checks";
        incidents: "incidents";
        probe: "probe";
        read: "read";
    }>>;
    location: z.ZodNullable<z.ZodString>;
    source: z.ZodEnum<{
        api: "api";
        file: "file";
    }>;
    createdAt: z.ZodNumber;
    lastUsedAt: z.ZodNullable<z.ZodNumber>;
    expiresAt: z.ZodNullable<z.ZodNumber>;
    revokedAt: z.ZodNullable<z.ZodNumber>;
    rotatedAt: z.ZodNullable<z.ZodNumber>;
    previousValidUntil: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
/** A token as the api serves it. It has no field for the secret or its digest. */
export type TokenMetadata = z.infer<typeof tokenMetadataSchema>;
export declare const tokensResponseSchema: z.ZodObject<{
    tokens: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        scopes: z.ZodArray<z.ZodEnum<{
            admin: "admin";
            checks: "checks";
            incidents: "incidents";
            probe: "probe";
            read: "read";
        }>>;
        location: z.ZodNullable<z.ZodString>;
        source: z.ZodEnum<{
            api: "api";
            file: "file";
        }>;
        createdAt: z.ZodNumber;
        lastUsedAt: z.ZodNullable<z.ZodNumber>;
        expiresAt: z.ZodNullable<z.ZodNumber>;
        revokedAt: z.ZodNullable<z.ZodNumber>;
        rotatedAt: z.ZodNullable<z.ZodNumber>;
        previousValidUntil: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** `GET /admin/tokens`. */
export type TokensResponse = z.infer<typeof tokensResponseSchema>;
export declare const tokenSecretResponseSchema: z.ZodObject<{
    token: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        scopes: z.ZodArray<z.ZodEnum<{
            admin: "admin";
            checks: "checks";
            incidents: "incidents";
            probe: "probe";
            read: "read";
        }>>;
        location: z.ZodNullable<z.ZodString>;
        source: z.ZodEnum<{
            api: "api";
            file: "file";
        }>;
        createdAt: z.ZodNumber;
        lastUsedAt: z.ZodNullable<z.ZodNumber>;
        expiresAt: z.ZodNullable<z.ZodNumber>;
        revokedAt: z.ZodNullable<z.ZodNumber>;
        rotatedAt: z.ZodNullable<z.ZodNumber>;
        previousValidUntil: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    secret: z.ZodString;
    previousValidUntil: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
/** Answer of a create or rotate: the only response that carries the secret. */
export type TokenSecretResponse = z.infer<typeof tokenSecretResponseSchema>;
