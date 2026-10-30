import { z } from "zod";
/**
 * The largest delay `setTimeout` honors: 2^31-1 ms. Node clamps a larger delay to 1 ms,
 * so no layer may pass a delay above it to a timer.
 */
export const MAX_TIMER_MS = 2_147_483_647;
const text = z.string({ error: "must be a string" });
const nonEmpty = z
    .string({ error: "must be a non-empty string" })
    .min(1, "must be a non-empty string");
// zod numbers already reject NaN and Infinity.
const finite = z.number({ error: "must be a finite number" });
const integer = z.int({ error: "must be an integer" });
const bool = z.boolean({ error: "must be a boolean" });
const intBetween = (min, max) => {
    const message = `must be an integer ${min}..${max}`;
    return z.int({ error: message }).min(min, message).max(max, message);
};
const atLeast = (min) => {
    const message = `must be an integer >= ${min}`;
    return z.int({ error: message }).min(min, message);
};
const oneOf = (allowed) => z.enum(allowed, {
    error: `must be one of ${allowed.map((a) => JSON.stringify(a)).join(", ")}`,
});
const isCalendarDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match === null) {
        return false;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    // Date.UTC maps years 0..99 to 19xx, so set the year on an existing date.
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day);
};
const objectError = { error: "must be an object" };
// Delays and durations in ms: integers that a timer can hold.
const timerMs = intBetween(1, MAX_TIMER_MS);
export const checkStatusSchema = oneOf(["up", "degraded", "down"]);
export const checkStateSchema = oneOf(["up", "degraded", "down", "unknown", "maintenance"]);
const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
export const httpMethodSchema = oneOf(HTTP_METHODS);
const utf8Bytes = (value) => new TextEncoder().encode(value).length;
/** Header names the probe owns; compared in lower case. */
const FORBIDDEN_HEADERS = [
    "host",
    "content-length",
    "transfer-encoding",
    "connection",
    "user-agent",
];
const MAX_HEADERS = 20;
const MAX_HEADER_NAME_BYTES = 256;
const MAX_HEADER_VALUE_BYTES = 4096;
const MAX_HEADERS_TOTAL_BYTES = 16 * 1024;
/** RFC 9110 token. */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/** Space, visible ASCII and obs-text; no control characters (tab, CR, LF). */
const HEADER_VALUE = /^[\x20-\x7e\x80-\xff]*$/;
const ENV_NAME = /^[A-Za-z_]\w{0,127}$/;
export const headerValueSchema = z.union([
    z.string().refine((v) => v.length <= MAX_HEADER_VALUE_BYTES && HEADER_VALUE.test(v), {
        error: `must be at most ${MAX_HEADER_VALUE_BYTES} visible ASCII/obs-text characters or spaces`,
    }),
    z.object({
        env: z.string({ error: "must be an environment variable name" }).regex(ENV_NAME, {
            error: "must match ^[A-Za-z_][A-Za-z0-9_]{0,127}$",
        }),
    }, { error: "must be a string or an object {env: NAME}" }),
], { error: "must be a string or an object {env: NAME}" });
const headersSchema = z
    .record(z.string(), headerValueSchema, { error: "must be an object" })
    .superRefine((headers, ctx) => {
    const names = Object.keys(headers);
    if (names.length > MAX_HEADERS) {
        ctx.addIssue({ code: "custom", message: `must have at most ${MAX_HEADERS} entries` });
    }
    const seen = new Set();
    let total = 0;
    for (const name of names) {
        const lower = name.toLowerCase();
        if (name.length === 0 || name.length > MAX_HEADER_NAME_BYTES || !HEADER_NAME.test(name)) {
            ctx.addIssue({
                code: "custom",
                path: [name],
                message: `is not a valid header name (token, 1..${MAX_HEADER_NAME_BYTES} bytes)`,
            });
        }
        else if (FORBIDDEN_HEADERS.includes(lower)) {
            ctx.addIssue({ code: "custom", path: [name], message: "is a header the probe controls" });
        }
        else if (seen.has(lower)) {
            ctx.addIssue({ code: "custom", path: [name], message: "is a duplicate header name" });
        }
        seen.add(lower);
        const value = headers[name];
        total += name.length + (typeof value === "string" ? value.length : 0);
    }
    if (total > MAX_HEADERS_TOTAL_BYTES) {
        ctx.addIssue({
            code: "custom",
            message: `names and literal values must total at most ${MAX_HEADERS_TOTAL_BYTES} bytes`,
        });
    }
});
const MAX_BODY_BYTES = 65_536;
const bodySchema = z
    .string({ error: "must be a string" })
    .refine((v) => utf8Bytes(v) <= MAX_BODY_BYTES, {
    error: `must be at most ${MAX_BODY_BYTES} bytes`,
});
const statusCodeSchema = intBetween(100, 599);
const STATUS_RANGE = /^(\d{3})-(\d{3})$/;
const rangeBounds = (value) => {
    const match = STATUS_RANGE.exec(value);
    if (match === null) {
        return undefined;
    }
    const [lo, hi] = [Number(match[1]), Number(match[2])];
    return lo >= 100 && lo <= hi && hi <= 599 ? [lo, hi] : undefined;
};
const expectedStatusItemMessage = 'must be an integer 100..599 or a range "lo-hi" with 100 <= lo <= hi <= 599';
export const expectedStatusSchema = z
    .array(z.union([
    statusCodeSchema,
    z
        .string()
        .refine((v) => rangeBounds(v) !== undefined, { error: expectedStatusItemMessage }),
], { error: expectedStatusItemMessage }), { error: "must be an array" })
    .min(1, "must not be empty")
    .max(20, "must have at most 20 entries");
const MAX_POINTER_BYTES = 256;
const isJsonPointer = (value) => (value === "" || value.startsWith("/")) &&
    !/~(?![01])/.test(value) &&
    utf8Bytes(value) <= MAX_POINTER_BYTES;
export const jsonAssertSchema = z
    .object({
    /** RFC 6901 JSON pointer, at most 256 bytes; "" is the whole document. */
    pointer: z.string({ error: "must be a JSON pointer" }).refine(isJsonPointer, {
        error: `must be an RFC 6901 JSON pointer of at most ${MAX_POINTER_BYTES} bytes`,
    }),
    /** Deep, strict equality with any JSON value. */
    equals: z.json({ error: "must be a JSON value" }).optional(),
    /** Only `true`: the pointer must resolve. */
    exists: z.literal(true, { error: "must be true" }).optional(),
}, objectError)
    .superRefine((assertion, ctx) => {
    const hasEquals = Object.hasOwn(assertion, "equals");
    const hasExists = Object.hasOwn(assertion, "exists");
    if (hasEquals === hasExists) {
        ctx.addIssue({
            code: "custom",
            message: 'set exactly one of "equals" and "exists"',
        });
    }
});
const jsonAssertListSchema = z
    .array(jsonAssertSchema, { error: "must be an array" })
    .min(1, "must not be empty")
    .max(10, "must have at most 10 entries");
export const httpCheckSchema = z
    .object({
    id: nonEmpty,
    name: text,
    /** Absent means "http". */
    type: oneOf(["http"]).optional(),
    /** Non-empty. */
    url: nonEmpty,
    /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
    intervalMs: timerMs,
    /** Integer 1..2147483647. */
    timeoutMs: timerMs.optional(),
    /**
     * Latency objective in ms, integer 1..2147483647: a successful (2xx) result slower than
     * this is degraded. Absent means no objective.
     */
    latencyObjectiveMs: timerMs.optional(),
    /**
     * Extra attempts after a failed one (non-2xx, timeout or network error), integer 0..10.
     * Absent means 0. The api always serves the resolved value.
     */
    retries: intBetween(0, 10).optional(),
    /**
     * Wait in ms between attempts, integer 0..60000. Absent means 1000 when `retries` > 0.
     * The api always serves the resolved value.
     */
    retryDelayMs: intBetween(0, 60_000).optional(),
    /**
     * Plain case-sensitive substring that a 2xx answer body must contain. The check is `down`
     * when it does not (searched within the probe's body size limit); the probe writes `reason`
     * `keyword "<text>" not found` with the 2xx `statusCode`. Absent means the body is not read.
     * Not available on `TlsCheck`.
     */
    keyword: text.optional(),
    /** Upper-case, case-sensitive. Absent means "GET". Not available on `TlsCheck`. */
    method: httpMethodSchema.optional(),
    /**
     * Request headers, at most 20. A value is a literal string or `{ env: NAME }`, which the
     * probe resolves from its own environment. Not served by the public `GET /checks`.
     */
    headers: headersSchema.optional(),
    /** Request body, at most 65536 bytes. Not allowed with GET (the default) or HEAD. */
    body: bodySchema.optional(),
    /** Accepted final statuses. Absent means `["200-299"]`. */
    expectedStatus: expectedStatusSchema.optional(),
    /** Assertions on the JSON response body, at most 10. Not allowed with HEAD. */
    jsonAssert: jsonAssertListSchema.optional(),
}, objectError)
    .superRefine((check, ctx) => {
    const method = check.method ?? "GET";
    if (check.body !== undefined && (method === "GET" || method === "HEAD")) {
        ctx.addIssue({ code: "custom", path: ["body"], message: `is not allowed with ${method}` });
    }
    if (method === "HEAD") {
        for (const key of ["jsonAssert", "keyword"]) {
            if (check[key] !== undefined) {
                ctx.addIssue({ code: "custom", path: [key], message: "is not allowed with HEAD" });
            }
        }
    }
});
export const tlsCheckSchema = z.object({
    id: nonEmpty,
    name: text,
    type: oneOf(["tls"]),
    /** Non-empty. */
    host: nonEmpty,
    /** Integer 1..65535. */
    port: intBetween(1, 65_535),
    /** Integer >= 0. The check is down when the certificate has this many days or fewer left. */
    warnDays: atLeast(0),
    /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
    intervalMs: timerMs,
    /** Integer 1..2147483647. */
    timeoutMs: timerMs.optional(),
    /** Not available on this check type. */
    method: z.never().optional(),
    headers: z.never().optional(),
    body: z.never().optional(),
    expectedStatus: z.never().optional(),
    jsonAssert: z.never().optional(),
    keyword: z.never().optional(),
}, objectError);
export const heartbeatCheckSchema = z.object({
    id: nonEmpty,
    name: text,
    type: oneOf(["heartbeat"]),
    /** Expected time between pings in ms, integer 1000..86400000. */
    period: intBetween(1000, 86_400_000),
    /** Extra wait in ms before the check is down, integer 0..86400000. Always set in served data. */
    grace: intBetween(0, 86_400_000),
    /** Not available on this check type. */
    method: z.never().optional(),
    headers: z.never().optional(),
    body: z.never().optional(),
    expectedStatus: z.never().optional(),
    jsonAssert: z.never().optional(),
    keyword: z.never().optional(),
}, objectError);
const optionalCertDaysLeft = integer.nullable().optional();
export const resultSchema = z.object({
    checkId: nonEmpty,
    /** Epoch ms, set by the probe. */
    timestamp: integer,
    status: checkStatusSchema,
    /** Integer 100..599; null when no response arrived. */
    statusCode: intBetween(100, 599).nullable(),
    latencyMs: finite,
    /** null when up or when no reason applies. */
    reason: text.nullable(),
    /** Name of the probe location that produced the result; `default` for legacy results. */
    location: text,
    /** Attempts made for this result, integer >= 1 (at most `retries` + 1). */
    attempts: atLeast(1),
    /** TLS checks: floored whole days until expiry, negative when expired, null when unread. */
    certDaysLeft: optionalCertDaysLeft,
}, objectError);
export const postResultRequestSchema = z.object({
    checkId: nonEmpty,
    timestamp: integer,
    status: checkStatusSchema,
    statusCode: intBetween(100, 599).nullable(),
    latencyMs: z
        .number({ error: "must be a finite number >= 0" })
        .min(0, "must be a finite number >= 0"),
    reason: text.nullable(),
    location: text.optional(),
    attempts: atLeast(1).optional(),
    certDaysLeft: optionalCertDaysLeft,
}, objectError);
export const incidentSchema = z.object({
    id: integer,
    checkId: nonEmpty,
    openedAt: finite,
    resolvedAt: finite.nullable(),
    /** The reason of the result that opened the incident. */
    reason: text.nullable(),
}, objectError);
export const maintenanceWindowSchema = z
    .object({
    checkId: nonEmpty,
    /** Epoch ms, inclusive. */
    start: finite,
    /** Epoch ms, exclusive; greater than `start`. */
    end: finite,
    note: text,
}, objectError)
    .refine((window) => window.end > window.start, {
    path: ["end"],
    error: "must be greater than start",
});
export const locationResultSchema = z.object({
    location: text,
    result: resultSchema,
    /** True when the latest result is outside the window ending at the check's newest result. */
    stale: bool,
}, objectError);
export const checkStateFieldsSchema = z.object({
    state: checkStateSchema,
    consecutiveDown: integer,
    lastResultAt: finite.nullable(),
    lastReason: text.nullable(),
    /** Latest result per location ever seen, sorted by location name; empty without results. */
    locations: z.array(locationResultSchema, { error: "must be an array" }),
    /** The active window; set only when state is "maintenance". */
    maintenance: maintenanceWindowSchema.optional(),
    /** certDaysLeft of the latest result; absent or null for HTTP and without a certificate. */
    certDaysLeft: optionalCertDaysLeft,
}, objectError);
const percent = z
    .number({ error: "must be null or a number 0..100" })
    .min(0, "must be null or a number 0..100")
    .max(100, "must be null or a number 0..100")
    .nullable();
export const uptimeDaySchema = z.object({
    /** UTC calendar day, YYYY-MM-DD, a real date. */
    date: z
        .string({ error: "must be a YYYY-MM-DD date" })
        .refine(isCalendarDate, "must be a YYYY-MM-DD date"),
    /**
     * (up + degraded results) / all results * 100, unrounded, 0..100. null when the day has
     * no results (a day without results is not down).
     */
    uptime: percent,
    /** Number of results of the day; 0 when `uptime` is null. */
    results: atLeast(0),
}, objectError);
export const checkUptimeSchema = z.object({
    checkId: nonEmpty,
    /** Exactly 90 UTC days, oldest first; the last is the date of the service's `now()`. */
    days: z.array(uptimeDaySchema, { error: "must be an array" }),
    /** Result-weighted over the window: sum(up + degraded) / sum(all) * 100; 0..100 or null. */
    uptime: percent,
}, objectError);
const MAX_COMPONENT_ID = 64;
const COMPONENT_ID = /^[a-z0-9][a-z0-9._-]*$/;
// Control characters (C0, DEL, C1) are not allowed in customer-facing text.
const CONTROL_CHARACTER = /\p{Cc}/u;
/** Plain text of 1..max (or 0..max) characters: trimmed, without control characters. */
const plainText = (min, max) => {
    const range = min === 0 ? `at most ${max}` : `${min}..${max}`;
    return z
        .string({ error: "must be a string" })
        .min(min, `must be ${range} characters`)
        .max(max, `must be ${range} characters`)
        .refine((v) => v === v.trim(), { error: "must not start or end with whitespace" })
        .refine((v) => !CONTROL_CHARACTER.test(v), { error: "must not contain control characters" });
};
const componentFields = {
    /** `^[a-z0-9][a-z0-9._-]*$`, at most 64 characters. Own namespace, apart from check ids. */
    id: z
        .string({ error: "must be a string" })
        .max(MAX_COMPONENT_ID, `must be at most ${MAX_COMPONENT_ID} characters`)
        .regex(COMPONENT_ID, { error: "must match ^[a-z0-9][a-z0-9._-]*$" }),
    /** Plain text, 1..100 characters. */
    name: plainText(1, 100),
    /** Plain text, at most 500 characters. */
    description: plainText(0, 500).optional(),
    /** Ids of the member checks: non-empty, without duplicates. Unknown ids are the api's concern. */
    checkIds: z
        .array(nonEmpty, { error: "must be an array" })
        .min(1, "must not be empty")
        .refine((ids) => new Set(ids).size === ids.length, { error: "must not contain duplicates" }),
    /** Section heading, plain text, 1..100 characters. */
    group: plainText(1, 100).optional(),
};
/** A customer-facing group of checks, as configured. Unknown keys are rejected. */
export const componentSchema = z.strictObject(componentFields, {
    error: (issue) => issue.code === "unrecognized_keys"
        ? `has an unknown field: ${issue.keys.join(", ")}`
        : "must be an object",
});
export const componentWithStateSchema = z.object({
    ...componentFields,
    /** Combined state of the member checks; see `combineStates`. */
    state: checkStateSchema,
    /** Window uptime as in `ComponentUptime.uptime`. */
    uptime: percent,
    /** Ids of the open incidents of the member checks, ascending. */
    incidentIds: z.array(integer, { error: "must be an array" }),
}, objectError);
export const componentUptimeSchema = z.object({
    componentId: nonEmpty,
    /** Exactly 90 UTC days, oldest first; aggregated by `aggregateUptime`. */
    days: z.array(uptimeDaySchema, { error: "must be an array" }),
    /** Result-weighted over the window; 0..100 or null. */
    uptime: percent,
}, objectError);
