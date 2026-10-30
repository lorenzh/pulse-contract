import { z } from "zod";
/** Request header that carries the revision a write is based on. Required on every write. */
export declare const ADMIN_IF_MATCH_HEADER = "if-match";
/** Response header that carries the revision, quoted: `"sha256-<hex>"`. */
export declare const ADMIN_ETAG_HEADER = "etag";
/** Prefix of a revision: `sha256-` followed by 64 lower-case hex digits of the file bytes. */
export declare const ADMIN_REVISION_PREFIX = "sha256-";
/** Largest request body of an admin write: 1 MB, answered with 413 beyond it. */
export declare const ADMIN_MAX_BODY_BYTES = 1048576;
/**
 * Statuses of the admin routes, in the order the api decides them. A request gets the first
 * status that applies.
 */
export declare const ADMIN_STATUS_ORDER: readonly [{
    readonly status: 404;
    readonly meaning: "feature off";
}, {
    readonly status: 401;
    readonly meaning: "missing or wrong token";
}, {
    readonly status: 403;
    readonly meaning: "a valid probe token";
}, {
    readonly status: 413;
    readonly meaning: "body too large";
}, {
    readonly status: 400;
    readonly meaning: "bad JSON, bad If-Match (including *), or id mismatch";
}, {
    readonly status: 428;
    readonly meaning: "If-Match missing";
}, {
    readonly status: 503;
    readonly meaning: "checks file not writable";
}, {
    readonly status: 412;
    readonly meaning: "stale revision";
}, {
    readonly status: 422;
    readonly meaning: "schema or reference error";
}, {
    readonly status: 409;
    readonly meaning: "id exists, or still referenced";
}, {
    readonly status: 404;
    readonly meaning: "unknown id or index";
}];
/** Whether `value` is a revision in the unquoted form `sha256-<hex>`. */
export declare function isAdminRevision(value: unknown): value is string;
/** A check as the admin api serves it: no header values, no body, no secret. Strict. */
export declare const adminCheckViewSchema: z.ZodUnion<readonly [z.ZodObject<{
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
    expectedStatus: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
    jsonAssert: z.ZodOptional<z.ZodArray<z.ZodObject<{
        pointer: z.ZodString;
        equals: z.ZodOptional<z.ZodJSONSchema>;
        exists: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strip>>>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    /** Names of the configured request headers; never their values or `{ env }` references. */
    headers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    /** True when the check has a request body; the body itself is never served. */
    hasBody: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
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
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        tcp: "tcp";
    }>;
    host: z.ZodString;
    port: z.ZodNumber;
    intervalMs: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        dns: "dns";
    }>;
    dnsName: z.ZodString;
    recordType: z.ZodEnum<{
        A: "A";
        AAAA: "AAAA";
        CNAME: "CNAME";
        MX: "MX";
        NS: "NS";
        TXT: "TXT";
    }>;
    expected: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resolver: z.ZodOptional<z.ZodString>;
    intervalMs: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        domain: "domain";
    }>;
    domain: z.ZodString;
    warnDays: z.ZodNumber;
    intervalMs: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        heartbeat: "heartbeat";
    }>;
    period: z.ZodNumber;
    grace: z.ZodNumber;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    /** Always true: a heartbeat check has a secret, which is never served. */
    hasSecret: z.ZodLiteral<true>;
}, z.core.$strict>]>;
/** Strict schema of a check write body, per `type` (absent means `http`). Keeps every check refinement. */
export declare const adminCheckInputSchemas: {
    readonly http: z.ZodObject<{
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
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    readonly tls: z.ZodObject<{
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
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
    }, z.core.$strict>;
    readonly tcp: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            tcp: "tcp";
        }>;
        host: z.ZodString;
        port: z.ZodNumber;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>;
    readonly dns: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            dns: "dns";
        }>;
        dnsName: z.ZodString;
        recordType: z.ZodEnum<{
            A: "A";
            AAAA: "AAAA";
            CNAME: "CNAME";
            MX: "MX";
            NS: "NS";
            TXT: "TXT";
        }>;
        expected: z.ZodOptional<z.ZodArray<z.ZodString>>;
        resolver: z.ZodOptional<z.ZodString>;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>;
    readonly domain: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            domain: "domain";
        }>;
        domain: z.ZodString;
        warnDays: z.ZodNumber;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>;
    /** `secret` is write-only: a `PUT` without it keeps the old one. */
    readonly heartbeat: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            heartbeat: "heartbeat";
        }>;
        period: z.ZodNumber;
        grace: z.ZodNumber;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        secret: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
};
/**
 * Body of `POST /admin/checks` and `PUT /admin/checks/:id`: a `Check`, plus for a heartbeat check
 * a write-only `secret`. Strict: only the declared fields are allowed.
 */
export declare const adminCheckInputSchema: z.ZodUnion<(z.ZodObject<{
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
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict> | z.ZodObject<{
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
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
}, z.core.$strict> | z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        tcp: "tcp";
    }>;
    host: z.ZodString;
    port: z.ZodNumber;
    intervalMs: z.ZodNumber;
}, z.core.$strict> | z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        dns: "dns";
    }>;
    dnsName: z.ZodString;
    recordType: z.ZodEnum<{
        A: "A";
        AAAA: "AAAA";
        CNAME: "CNAME";
        MX: "MX";
        NS: "NS";
        TXT: "TXT";
    }>;
    expected: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resolver: z.ZodOptional<z.ZodString>;
    intervalMs: z.ZodNumber;
}, z.core.$strict> | z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
    type: z.ZodEnum<{
        domain: "domain";
    }>;
    domain: z.ZodString;
    warnDays: z.ZodNumber;
    intervalMs: z.ZodNumber;
}, z.core.$strict> | z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        heartbeat: "heartbeat";
    }>;
    period: z.ZodNumber;
    grace: z.ZodNumber;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    secret: z.ZodOptional<z.ZodString>;
}, z.core.$strict>)[]>;
/** A component as configured; the same shape in requests and responses. */
export declare const adminComponentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    checkIds: z.ZodArray<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const adminComponentInputSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    checkIds: z.ZodArray<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    availabilityTarget: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
/** A maintenance window as written in a request. Strict. */
export declare const adminMaintenanceInputSchema: z.ZodObject<{
    checkId: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    note: z.ZodString;
}, z.core.$strict>;
/** A maintenance window as served: `index` is its position, the address of `/admin/maintenance/:index`. */
export declare const adminMaintenanceViewSchema: z.ZodObject<{
    checkId: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    note: z.ZodString;
    index: z.ZodInt;
}, z.core.$strict>;
/** `GET /admin/config`: the whole configuration without secrets. */
export declare const adminConfigResponseSchema: z.ZodObject<{
    revision: z.ZodString;
    checks: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
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
        expectedStatus: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        jsonAssert: z.ZodOptional<z.ZodArray<z.ZodObject<{
            pointer: z.ZodString;
            equals: z.ZodOptional<z.ZodJSONSchema>;
            exists: z.ZodOptional<z.ZodLiteral<true>>;
        }, z.core.$strip>>>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        /** Names of the configured request headers; never their values or `{ env }` references. */
        headers: z.ZodOptional<z.ZodArray<z.ZodString>>;
        /** True when the check has a request body; the body itself is never served. */
        hasBody: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
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
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            tcp: "tcp";
        }>;
        host: z.ZodString;
        port: z.ZodNumber;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            dns: "dns";
        }>;
        dnsName: z.ZodString;
        recordType: z.ZodEnum<{
            A: "A";
            AAAA: "AAAA";
            CNAME: "CNAME";
            MX: "MX";
            NS: "NS";
            TXT: "TXT";
        }>;
        expected: z.ZodOptional<z.ZodArray<z.ZodString>>;
        resolver: z.ZodOptional<z.ZodString>;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodNever>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
        type: z.ZodEnum<{
            domain: "domain";
        }>;
        domain: z.ZodString;
        warnDays: z.ZodNumber;
        intervalMs: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            heartbeat: "heartbeat";
        }>;
        period: z.ZodNumber;
        grace: z.ZodNumber;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        method: z.ZodOptional<z.ZodNever>;
        headers: z.ZodOptional<z.ZodNever>;
        body: z.ZodOptional<z.ZodNever>;
        expectedStatus: z.ZodOptional<z.ZodNever>;
        jsonAssert: z.ZodOptional<z.ZodNever>;
        keyword: z.ZodOptional<z.ZodNever>;
        /** Always true: a heartbeat check has a secret, which is never served. */
        hasSecret: z.ZodLiteral<true>;
    }, z.core.$strict>]>>;
    components: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        checkIds: z.ZodArray<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    maintenance: z.ZodArray<z.ZodObject<{
        checkId: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        note: z.ZodString;
        index: z.ZodInt;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** The schema of the optional write-only heartbeat secret; exported for the validators. */
export declare const adminSecretSchema: z.ZodString;
export type AdminCheckView = z.infer<typeof adminCheckViewSchema>;
export type AdminComponent = z.infer<typeof adminComponentSchema>;
export type AdminComponentInput = z.infer<typeof adminComponentInputSchema>;
export type AdminMaintenanceInput = z.infer<typeof adminMaintenanceInputSchema>;
export type AdminMaintenanceView = z.infer<typeof adminMaintenanceViewSchema>;
export type AdminConfigResponse = z.infer<typeof adminConfigResponseSchema>;
export type AdminCheckInput = z.infer<typeof adminCheckInputSchema>;
/**
 * Body of a successful admin write: the redacted entity that was stored. `DELETE` answers 204
 * without a body. The new revision is in the `ETag` header.
 */
export type AdminWriteResponse = AdminCheckView | AdminComponent | AdminMaintenanceView;
