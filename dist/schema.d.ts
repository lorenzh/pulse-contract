import { z } from "zod";
/**
 * The largest delay `setTimeout` honors: 2^31-1 ms. Node clamps a larger delay to 1 ms,
 * so no layer may pass a delay above it to a timer.
 */
export declare const MAX_TIMER_MS = 2147483647;
export declare const checkStatusSchema: z.ZodEnum<{
    degraded: "degraded";
    down: "down";
    up: "up";
}>;
export declare const checkStateSchema: z.ZodEnum<{
    degraded: "degraded";
    down: "down";
    maintenance: "maintenance";
    unknown: "unknown";
    up: "up";
}>;
export declare const httpMethodSchema: z.ZodEnum<{
    DELETE: "DELETE";
    GET: "GET";
    HEAD: "HEAD";
    OPTIONS: "OPTIONS";
    PATCH: "PATCH";
    POST: "POST";
    PUT: "PUT";
}>;
export declare const headerValueSchema: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    env: z.ZodString;
}, z.core.$strip>]>;
export declare const expectedStatusSchema: z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
export declare const jsonAssertSchema: z.ZodObject<{
    pointer: z.ZodString;
    equals: z.ZodOptional<z.ZodJSONSchema>;
    exists: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strip>;
export declare const httpCheckSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<{
        http: "http";
    }>>;
    url: z.ZodString;
    intervalMs: z.ZodNumber;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    keyword: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        DELETE: "DELETE";
        GET: "GET";
        HEAD: "HEAD";
        OPTIONS: "OPTIONS";
        PATCH: "PATCH";
        POST: "POST";
        PUT: "PUT";
    }>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        env: z.ZodString;
    }, z.core.$strip>]>>>;
    body: z.ZodOptional<z.ZodString>;
    expectedStatus: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
    jsonAssert: z.ZodOptional<z.ZodArray<z.ZodObject<{
        pointer: z.ZodString;
        equals: z.ZodOptional<z.ZodJSONSchema>;
        exists: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const tlsCheckSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        tls: "tls";
    }>;
    host: z.ZodString;
    port: z.ZodNumber;
    warnDays: z.ZodNumber;
    intervalMs: z.ZodNumber;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export declare const heartbeatCheckSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        heartbeat: "heartbeat";
    }>;
    period: z.ZodNumber;
    grace: z.ZodNumber;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export declare const resultSchema: z.ZodObject<{
    checkId: z.ZodString;
    timestamp: z.ZodInt;
    status: z.ZodEnum<{
        degraded: "degraded";
        down: "down";
        up: "up";
    }>;
    statusCode: z.ZodNullable<z.ZodNumber>;
    latencyMs: z.ZodNumber;
    reason: z.ZodNullable<z.ZodString>;
    location: z.ZodString;
    attempts: z.ZodNumber;
    certDaysLeft: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const postResultRequestSchema: z.ZodObject<{
    checkId: z.ZodString;
    timestamp: z.ZodInt;
    status: z.ZodEnum<{
        degraded: "degraded";
        down: "down";
        up: "up";
    }>;
    statusCode: z.ZodNullable<z.ZodNumber>;
    latencyMs: z.ZodNumber;
    reason: z.ZodNullable<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    attempts: z.ZodOptional<z.ZodNumber>;
    certDaysLeft: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const incidentSchema: z.ZodObject<{
    id: z.ZodInt;
    checkId: z.ZodString;
    openedAt: z.ZodNumber;
    resolvedAt: z.ZodNullable<z.ZodNumber>;
    reason: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const maintenanceWindowSchema: z.ZodObject<{
    checkId: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    note: z.ZodString;
}, z.core.$strip>;
export declare const locationResultSchema: z.ZodObject<{
    location: z.ZodString;
    result: z.ZodObject<{
        checkId: z.ZodString;
        timestamp: z.ZodInt;
        status: z.ZodEnum<{
            degraded: "degraded";
            down: "down";
            up: "up";
        }>;
        statusCode: z.ZodNullable<z.ZodNumber>;
        latencyMs: z.ZodNumber;
        reason: z.ZodNullable<z.ZodString>;
        location: z.ZodString;
        attempts: z.ZodNumber;
        certDaysLeft: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>;
    stale: z.ZodBoolean;
}, z.core.$strip>;
export declare const checkStateFieldsSchema: z.ZodObject<{
    state: z.ZodEnum<{
        degraded: "degraded";
        down: "down";
        maintenance: "maintenance";
        unknown: "unknown";
        up: "up";
    }>;
    consecutiveDown: z.ZodInt;
    lastResultAt: z.ZodNullable<z.ZodNumber>;
    lastReason: z.ZodNullable<z.ZodString>;
    locations: z.ZodArray<z.ZodObject<{
        location: z.ZodString;
        result: z.ZodObject<{
            checkId: z.ZodString;
            timestamp: z.ZodInt;
            status: z.ZodEnum<{
                degraded: "degraded";
                down: "down";
                up: "up";
            }>;
            statusCode: z.ZodNullable<z.ZodNumber>;
            latencyMs: z.ZodNumber;
            reason: z.ZodNullable<z.ZodString>;
            location: z.ZodString;
            attempts: z.ZodNumber;
            certDaysLeft: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        }, z.core.$strip>;
        stale: z.ZodBoolean;
    }, z.core.$strip>>;
    maintenance: z.ZodOptional<z.ZodObject<{
        checkId: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        note: z.ZodString;
    }, z.core.$strip>>;
    certDaysLeft: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const uptimeDaySchema: z.ZodObject<{
    date: z.ZodString;
    uptime: z.ZodNullable<z.ZodNumber>;
    results: z.ZodNumber;
}, z.core.$strip>;
export declare const checkUptimeSchema: z.ZodObject<{
    checkId: z.ZodString;
    days: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        uptime: z.ZodNullable<z.ZodNumber>;
        results: z.ZodNumber;
    }, z.core.$strip>>;
    uptime: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
/** "degraded": the check answered successfully but slower than its latency objective. */
export type CheckStatus = z.infer<typeof checkStatusSchema>;
/** A `CheckStatus`, or "unknown" (no result yet) or "maintenance" (active window). */
export type CheckState = z.infer<typeof checkStateSchema>;
export type HttpMethod = z.infer<typeof httpMethodSchema>;
/** A literal header value, or `{ env: NAME }` that the probe resolves from its environment. */
export type HeaderValue = z.infer<typeof headerValueSchema>;
/** A status code 100..599 or a range string `"lo-hi"`. */
export type ExpectedStatus = z.infer<typeof expectedStatusSchema>[number];
/** `{ pointer, equals }` or `{ pointer, exists: true }`. */
export type JsonAssertion = z.infer<typeof jsonAssertSchema>;
export type HttpCheck = z.infer<typeof httpCheckSchema>;
/**
 * Watches the leaf certificate of a TLS endpoint. Only the leaf's expiry is judged;
 * the chain and the hostname are not verified. `port` and `warnDays` are always set
 * in served data (the api config parser applies the defaults 443 and 14).
 */
export type TlsCheck = z.infer<typeof tlsCheckSchema>;
/**
 * A job pings the api; the check is down when no ping arrives within `period + grace`.
 * The probe never runs it. In `CheckWithState`, `lastResultAt` is the time of the last ping.
 * The ping secret is not part of this type: the api never serves it.
 */
export type HeartbeatCheck = z.infer<typeof heartbeatCheckSchema>;
export type Check = HttpCheck | TlsCheck | HeartbeatCheck;
export type Result = z.infer<typeof resultSchema>;
export type Incident = z.infer<typeof incidentSchema>;
/** A planned maintenance window for one check, half-open `[start, end)`. */
export type MaintenanceWindow = z.infer<typeof maintenanceWindowSchema>;
/** The latest result of one probe location for a check. */
export type LocationResult = z.infer<typeof locationResultSchema>;
export type CheckStateFields = z.infer<typeof checkStateFieldsSchema>;
/** A check with its evaluated state; distributes over the `Check` union. */
export type CheckWithState = Check & CheckStateFields;
/** One UTC calendar day of a check's uptime. */
export type UptimeDay = z.infer<typeof uptimeDaySchema>;
/** The 90-day uptime of one check. */
export type CheckUptime = z.infer<typeof checkUptimeSchema>;
/**
 * Body of POST /results: a `Result` where `location` and `attempts` may be absent. A missing
 * `attempts` means 1; a missing or blank `location` means `default`.
 */
export type PostResultRequest = z.infer<typeof postResultRequestSchema>;
/** GET /checks */
export type ChecksResponse = CheckWithState[];
/** GET /checks/:id/results */
export type ResultsResponse = Result[];
/** GET /incidents */
export type IncidentsResponse = Incident[];
/** GET /maintenance */
export type MaintenanceResponse = MaintenanceWindow[];
/** GET /uptime: one entry per configured check, in the order of GET /checks. */
export type UptimeResponse = CheckUptime[];
export interface ErrorResponse {
    error: string;
}
