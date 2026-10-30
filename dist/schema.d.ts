import { z } from "zod";
/**
 * The largest delay `setTimeout` honors: 2^31-1 ms. Node clamps a larger delay to 1 ms,
 * so no layer may pass a delay above it to a timer.
 */
export declare const MAX_TIMER_MS = 2147483647;
export declare const checkStatusSchema: z.ZodEnum<{
    up: "up";
    degraded: "degraded";
    down: "down";
}>;
export declare const checkStateSchema: z.ZodEnum<{
    up: "up";
    degraded: "degraded";
    down: "down";
    unknown: "unknown";
    maintenance: "maintenance";
}>;
export declare const httpMethodSchema: z.ZodEnum<{
    GET: "GET";
    HEAD: "HEAD";
    POST: "POST";
    PUT: "PUT";
    PATCH: "PATCH";
    DELETE: "DELETE";
    OPTIONS: "OPTIONS";
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
        GET: "GET";
        HEAD: "HEAD";
        POST: "POST";
        PUT: "PUT";
        PATCH: "PATCH";
        DELETE: "DELETE";
        OPTIONS: "OPTIONS";
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
/** Smallest `intervalMs` of a domain check: 1 hour. */
export declare const MIN_DOMAIN_INTERVAL_MS = 3600000;
export declare const dnsRecordTypeSchema: z.ZodEnum<{
    A: "A";
    AAAA: "AAAA";
    CNAME: "CNAME";
    MX: "MX";
    TXT: "TXT";
    NS: "NS";
}>;
export declare const tcpCheckSchema: z.ZodObject<{
    type: z.ZodEnum<{
        tcp: "tcp";
    }>;
    host: z.ZodString;
    port: z.ZodNumber;
    intervalMs: z.ZodNumber;
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export declare const dnsCheckSchema: z.ZodObject<{
    type: z.ZodEnum<{
        dns: "dns";
    }>;
    dnsName: z.ZodString;
    recordType: z.ZodEnum<{
        A: "A";
        AAAA: "AAAA";
        CNAME: "CNAME";
        MX: "MX";
        TXT: "TXT";
        NS: "NS";
    }>;
    expected: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resolver: z.ZodOptional<z.ZodString>;
    intervalMs: z.ZodNumber;
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export declare const domainCheckSchema: z.ZodObject<{
    type: z.ZodEnum<{
        domain: "domain";
    }>;
    domain: z.ZodString;
    warnDays: z.ZodNumber;
    intervalMs: z.ZodNumber;
    id: z.ZodString;
    name: z.ZodString;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    retryDelayMs: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodNever>;
    method: z.ZodOptional<z.ZodNever>;
    headers: z.ZodOptional<z.ZodNever>;
    body: z.ZodOptional<z.ZodNever>;
    expectedStatus: z.ZodOptional<z.ZodNever>;
    jsonAssert: z.ZodOptional<z.ZodNever>;
    keyword: z.ZodOptional<z.ZodNever>;
    latencyObjectiveMs: z.ZodOptional<z.ZodNever>;
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
        up: "up";
        degraded: "degraded";
        down: "down";
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
        up: "up";
        degraded: "degraded";
        down: "down";
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
            up: "up";
            degraded: "degraded";
            down: "down";
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
        up: "up";
        degraded: "degraded";
        down: "down";
        unknown: "unknown";
        maintenance: "maintenance";
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
                up: "up";
                degraded: "degraded";
                down: "down";
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
/** A customer-facing group of checks, as configured. Unknown keys are rejected. */
export declare const componentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    checkIds: z.ZodArray<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const componentWithStateSchema: z.ZodObject<{
    state: z.ZodEnum<{
        up: "up";
        degraded: "degraded";
        down: "down";
        unknown: "unknown";
        maintenance: "maintenance";
    }>;
    uptime: z.ZodNullable<z.ZodNumber>;
    incidentIds: z.ZodArray<z.ZodInt>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    checkIds: z.ZodArray<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const componentUptimeSchema: z.ZodObject<{
    componentId: z.ZodString;
    days: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        uptime: z.ZodNullable<z.ZodNumber>;
        results: z.ZodNumber;
    }, z.core.$strip>>;
    uptime: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
/** "degraded": the check answered successfully but slower than its latency objective. */
/** Limits of manual incidents. Lengths count UTF-16 code units, as `String.length` does. */
export declare const MANUAL_INCIDENT_TITLE_MAX = 200;
export declare const MANUAL_INCIDENT_MESSAGE_MAX = 2000;
export declare const MANUAL_INCIDENT_MAX_UPDATES = 100;
export declare const MANUAL_INCIDENT_MAX_COMPONENTS = 50;
/** Largest request body the api accepts for a write: 16 KiB. */
export declare const MANUAL_INCIDENT_MAX_BODY_BYTES: number;
export declare const MANUAL_INCIDENT_IMPACTS: readonly ["none", "minor", "major", "critical"];
export declare const MANUAL_INCIDENT_STATUSES: readonly ["investigating", "identified", "monitoring", "resolved"];
export declare const manualIncidentImpactSchema: z.ZodEnum<{
    none: "none";
    minor: "minor";
    major: "major";
    critical: "critical";
}>;
export declare const manualIncidentStatusSchema: z.ZodEnum<{
    investigating: "investigating";
    identified: "identified";
    monitoring: "monitoring";
    resolved: "resolved";
}>;
/** One timed message of a manual incident. */
export declare const manualIncidentUpdateSchema: z.ZodObject<{
    at: z.ZodNumber;
    status: z.ZodEnum<{
        investigating: "investigating";
        identified: "identified";
        monitoring: "monitoring";
        resolved: "resolved";
    }>;
    message: z.ZodString;
}, z.core.$strip>;
/** Body of `POST /manual-incidents`. `status` defaults to `investigating`; not `resolved`. */
export declare const manualIncidentInputSchema: z.ZodObject<{
    title: z.ZodString;
    impact: z.ZodEnum<{
        none: "none";
        minor: "minor";
        major: "major";
        critical: "critical";
    }>;
    componentIds: z.ZodArray<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        investigating: "investigating";
        identified: "identified";
        monitoring: "monitoring";
    }>>;
    message: z.ZodString;
}, z.core.$strip>;
/** Body of `POST /manual-incidents/{id}/updates`. `status` may be `resolved`. */
export declare const manualIncidentUpdateInputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        investigating: "investigating";
        identified: "identified";
        monitoring: "monitoring";
        resolved: "resolved";
    }>;
    message: z.ZodString;
}, z.core.$strip>;
/**
 * A manual incident. Invariants: `status` is `resolved` iff `resolvedAt` is set; `updates` is
 * non-empty, ordered by `at`; the last update has the incident status and, when resolved, `at`
 * equal to `resolvedAt`.
 */
export declare const manualIncidentSchema: z.ZodObject<{
    id: z.ZodInt;
    title: z.ZodString;
    componentIds: z.ZodArray<z.ZodString>;
    impact: z.ZodEnum<{
        none: "none";
        minor: "minor";
        major: "major";
        critical: "critical";
    }>;
    status: z.ZodEnum<{
        investigating: "investigating";
        identified: "identified";
        monitoring: "monitoring";
        resolved: "resolved";
    }>;
    createdAt: z.ZodNumber;
    resolvedAt: z.ZodNullable<z.ZodNumber>;
    updates: z.ZodArray<z.ZodObject<{
        at: z.ZodNumber;
        status: z.ZodEnum<{
            investigating: "investigating";
            identified: "identified";
            monitoring: "monitoring";
            resolved: "resolved";
        }>;
        message: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
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
/** A TCP port that must accept a connection; the probe sends nothing and closes at once. */
export type TcpCheck = z.infer<typeof tcpCheckSchema>;
export type DnsRecordType = z.infer<typeof dnsRecordTypeSchema>;
/** A DNS record that must resolve, to the `expected` values when set. */
export type DnsCheck = z.infer<typeof dnsCheckSchema>;
/**
 * Watches the registration expiry of a domain (RDAP). `certDaysLeft` carries the whole days
 * left. Degraded within `warnDays`, down when expired or unknown. `intervalMs` is at least
 * `MIN_DOMAIN_INTERVAL_MS`.
 */
export type DomainCheck = z.infer<typeof domainCheckSchema>;
export type Check = HttpCheck | TlsCheck | TcpCheck | DnsCheck | DomainCheck | HeartbeatCheck;
export type Result = z.infer<typeof resultSchema>;
export type Incident = z.infer<typeof incidentSchema>;
export type ManualIncidentImpact = z.infer<typeof manualIncidentImpactSchema>;
export type ManualIncidentStatus = z.infer<typeof manualIncidentStatusSchema>;
/** One timed message of a manual incident; its index is the stable update number. */
export type ManualIncidentUpdate = z.infer<typeof manualIncidentUpdateSchema>;
/** An incident that an operator posts by hand. */
export type ManualIncident = z.infer<typeof manualIncidentSchema>;
/** Body of `POST /manual-incidents`. */
export type ManualIncidentInput = z.infer<typeof manualIncidentInputSchema>;
/** Body of `POST /manual-incidents/{id}/updates`. */
export type ManualIncidentUpdateInput = z.infer<typeof manualIncidentUpdateInputSchema>;
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
/** A named, customer-facing group of checks. */
export type Component = z.infer<typeof componentSchema>;
/** A component with its combined state, window uptime and open incident ids. */
export type ComponentWithState = z.infer<typeof componentWithStateSchema>;
/** The 90-day uptime of one component. */
export type ComponentUptime = z.infer<typeof componentUptimeSchema>;
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
/** GET /manual-incidents */
export type ManualIncidentsResponse = ManualIncident[];
/** GET /maintenance */
export type MaintenanceResponse = MaintenanceWindow[];
/** GET /uptime: one entry per configured check, in the order of GET /checks. */
export type UptimeResponse = CheckUptime[];
/** GET /components: one entry per configured component, in configured order. */
export type ComponentsResponse = ComponentWithState[];
/** GET /components/uptime: one entry per configured component, in configured order. */
export type ComponentsUptimeResponse = ComponentUptime[];
export interface ErrorResponse {
    error: string;
}
