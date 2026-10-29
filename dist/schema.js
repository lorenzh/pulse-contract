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
export const httpCheckSchema = z.object({
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
}, objectError);
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
}, objectError);
export const heartbeatCheckSchema = z.object({
    id: nonEmpty,
    name: text,
    type: oneOf(["heartbeat"]),
    /** Expected time between pings in ms, integer 1000..86400000. */
    period: intBetween(1000, 86_400_000),
    /** Extra wait in ms before the check is down, integer 0..86400000. Always set in served data. */
    grace: intBetween(0, 86_400_000),
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
