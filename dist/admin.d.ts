import { z } from "zod";
/** Request header that carries the revision a write is based on. Required on every write. */
export declare const ADMIN_IF_MATCH_HEADER = "if-match";
/** Response header that carries the revision, quoted: `"sha256-<hex>"`. */
export declare const ADMIN_ETAG_HEADER = "etag";
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
    readonly meaning: "missing, unknown, expired, revoked or retired token";
}, {
    readonly status: 403;
    readonly meaning: "a valid token without the needed scope";
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
    readonly meaning: "checks file not writable (component and maintenance writes)";
}, {
    readonly status: 412;
    readonly meaning: "stale revision";
}, {
    readonly status: 422;
    readonly meaning: "schema or reference error";
}, {
    readonly status: 409;
    readonly meaning: "id exists, still referenced, a file check, or a shadowed database check";
}, {
    readonly status: 404;
    readonly meaning: "unknown id or index";
}];
/** Where a check comes from: the applied checks file or the database. */
export declare const ADMIN_CHECK_SOURCES: readonly ["file", "database"];
export declare const adminCheckSourceSchema: z.ZodEnum<{
    database: "database";
    file: "file";
}>;
/** Stands for a stored write-only value (a literal header value or a body). Exactly `{ keep: true }`. */
export declare const adminKeepSchema: z.ZodObject<{
    keep: z.ZodLiteral<true>;
}, z.core.$strict>;
/**
 * A check as the admin api serves it: `source`, `{ env }` references and keep markers, never a
 * literal header value, body or secret. Strict.
 */
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
    /** `{ env }` references as stored; a literal value is served as `{ keep: true }`. */
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
        env: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        keep: z.ZodLiteral<true>;
    }, z.core.$strict>]>>>;
    /** `{ keep: true }` when the check has a request body; the body itself is never served. */
    body: z.ZodOptional<z.ZodObject<{
        keep: z.ZodLiteral<true>;
    }, z.core.$strict>>;
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
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
    source: z.ZodEnum<{
        database: "database";
        file: "file";
    }>;
    /** Always true: a heartbeat check has a secret, which is never served. */
    hasSecret: z.ZodLiteral<true>;
}, z.core.$strict>]>;
/**
 * Strict schema of a check write body, per `type` (absent means `http`). Keeps every check
 * refinement. The view of a database check passes unchanged.
 */
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
        expectedStatus: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        jsonAssert: z.ZodOptional<z.ZodArray<z.ZodObject<{
            pointer: z.ZodString;
            equals: z.ZodOptional<z.ZodJSONSchema>;
            exists: z.ZodOptional<z.ZodLiteral<true>>;
        }, z.core.$strip>>>;
        availabilityTarget: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodLiteral<"database">>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            env: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>]>>>;
        body: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>]>>;
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
        source: z.ZodOptional<z.ZodLiteral<"database">>;
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
        source: z.ZodOptional<z.ZodLiteral<"database">>;
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
        source: z.ZodOptional<z.ZodLiteral<"database">>;
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
        source: z.ZodOptional<z.ZodLiteral<"database">>;
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
        source: z.ZodOptional<z.ZodLiteral<"database">>;
        secret: z.ZodOptional<z.ZodString>;
        hasSecret: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>;
};
/**
 * Body of `POST /admin/checks` and `PUT /admin/checks/:id`: a `Check` with keep markers, plus
 * for a heartbeat check a write-only `secret`. Strict: only the declared fields are allowed.
 */
export declare const adminCheckInputSchema: z.ZodUnion<(z.ZodObject<{
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
}, z.core.$strict> | z.ZodObject<{
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        env: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        keep: z.ZodLiteral<true>;
    }, z.core.$strict>]>>>;
    body: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        keep: z.ZodLiteral<true>;
    }, z.core.$strict>]>>;
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
    source: z.ZodOptional<z.ZodLiteral<"database">>;
    secret: z.ZodOptional<z.ZodString>;
    hasSecret: z.ZodOptional<z.ZodLiteral<true>>;
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
/** States of the checks file, as the last read or apply left it. */
export declare const ADMIN_FILE_STATES: readonly ["ok", "invalid", "unreadable", "written-not-applied"];
/** State of the checks file. `message` is `null` exactly when `state` is `ok`; it never quotes a value. */
export declare const adminFileStatusSchema: z.ZodObject<{
    state: z.ZodEnum<{
        invalid: "invalid";
        ok: "ok";
        unreadable: "unreadable";
        "written-not-applied": "written-not-applied";
    }>;
    message: z.ZodNullable<z.ZodString>;
    lastAppliedAt: z.ZodInt;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
        /** `{ env }` references as stored; a literal value is served as `{ keep: true }`. */
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
            env: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>]>>>;
        /** `{ keep: true }` when the check has a request body; the body itself is never served. */
        body: z.ZodOptional<z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
        /** Always true: a heartbeat check has a secret, which is never served. */
        hasSecret: z.ZodLiteral<true>;
    }, z.core.$strict>]>>;
    shadowed: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
        /** `{ env }` references as stored; a literal value is served as `{ keep: true }`. */
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodObject<{
            env: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>]>>>;
        /** `{ keep: true }` when the check has a request body; the body itself is never served. */
        body: z.ZodOptional<z.ZodObject<{
            keep: z.ZodLiteral<true>;
        }, z.core.$strict>>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
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
    file: z.ZodObject<{
        state: z.ZodEnum<{
            invalid: "invalid";
            ok: "ok";
            unreadable: "unreadable";
            "written-not-applied": "written-not-applied";
        }>;
        message: z.ZodNullable<z.ZodString>;
        lastAppliedAt: z.ZodInt;
    }, z.core.$strict>;
}, z.core.$strict>;
/**
 * What a client that only counts checks reads from `GET /admin/config`: `revision` and the check
 * ids. Other keys are ignored, so the answers of the 1.x and 2.0.0 api both pass.
 */
export declare const adminConfigSummarySchema: z.ZodObject<{
    revision: z.ZodString;
    checks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** A value left out of the export: `body`, `secret` or `headers.<name>` of check `checkId`. */
export declare const adminExportRedactionSchema: z.ZodObject<{
    checkId: z.ZodString;
    field: z.ZodString;
}, z.core.$strict>;
/**
 * `GET /admin/config/export`: the effective checks as a checks file. Literal header values,
 * bodies and heartbeat secrets are left out and listed in `redacted`, which is absent when
 * nothing was left out. A document with `redacted` does not load as a checks file.
 */
export declare const adminConfigExportSchema: z.ZodObject<{
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
        start: z.ZodISODateTime;
        end: z.ZodISODateTime;
        note: z.ZodString;
    }, z.core.$strict>>;
    redacted: z.ZodOptional<z.ZodArray<z.ZodObject<{
        checkId: z.ZodString;
        field: z.ZodString;
    }, z.core.$strict>>>;
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
export type AdminCheckSource = z.infer<typeof adminCheckSourceSchema>;
export type AdminKeep = z.infer<typeof adminKeepSchema>;
export type AdminFileStatus = z.infer<typeof adminFileStatusSchema>;
export type AdminConfigSummary = z.infer<typeof adminConfigSummarySchema>;
export type AdminExportRedaction = z.infer<typeof adminExportRedactionSchema>;
export type AdminConfigExport = z.infer<typeof adminConfigExportSchema>;
/**
 * Body of a successful admin write: the redacted entity that was stored. `DELETE` answers 204
 * without a body. The new revision is in the `ETag` header.
 */
export type AdminWriteResponse = AdminCheckView | AdminComponent | AdminMaintenanceView;
