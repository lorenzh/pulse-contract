export type CheckStatus = "up" | "down";
export type CheckState = CheckStatus | "unknown" | "maintenance";
export interface HttpCheck {
    id: string;
    name: string;
    /** Absent means "http". */
    type?: "http";
    url: string;
    intervalMs: number;
    timeoutMs?: number;
    /**
     * Extra attempts after a failed one (non-2xx, timeout or network error), integer 0..10.
     * Absent means 0. The api always serves the resolved value.
     */
    retries?: number;
    /**
     * Wait in ms between attempts, integer 0..60000. Absent means 1000 when `retries` > 0.
     * The api always serves the resolved value.
     */
    retryDelayMs?: number;
}
/**
 * Watches the leaf certificate of a TLS endpoint. Only the leaf's expiry is judged;
 * the chain and the hostname are not verified. `port` and `warnDays` are always set
 * in served data (the api config parser applies the defaults 443 and 14).
 */
export interface TlsCheck {
    id: string;
    name: string;
    type: "tls";
    host: string;
    port: number;
    /** The check is down when the certificate has this many days or fewer left. */
    warnDays: number;
    intervalMs: number;
    timeoutMs?: number;
}
export type Check = HttpCheck | TlsCheck;
export interface Result {
    checkId: string;
    /** Epoch ms, set by the probe. */
    timestamp: number;
    status: CheckStatus;
    /** null when no response arrived. */
    statusCode: number | null;
    latencyMs: number;
    /** null when up; otherwise e.g. "HTTP 503", "timeout after 1000ms", "ECONNREFUSED". */
    reason: string | null;
    /** Name of the probe location that produced the result; `default` for legacy results. */
    location: string;
    /**
     * Attempts made for this result, integer >= 1 (at most `retries` + 1). The other fields
     * are those of the last attempt, except `timestamp`, which is the start of the first.
     * The api treats a missing value on POST /results as 1.
     */
    attempts: number;
    /**
     * TLS checks: floored whole days until the leaf certificate expires, negative when
     * expired, null when no certificate was read. Absent or null for HTTP.
     */
    certDaysLeft?: number | null;
}
export interface Incident {
    id: number;
    checkId: string;
    openedAt: number;
    resolvedAt: number | null;
    /** The reason of the result that opened the incident. */
    reason: string | null;
}
/** The latest result of one probe location for a check. */
export interface LocationResult {
    location: string;
    result: Result;
    /** True when the latest result is outside the window ending at the check's newest result. */
    stale: boolean;
}
/** A planned maintenance window for one check, half-open `[start, end)`. */
export interface MaintenanceWindow {
    checkId: string;
    /** Epoch ms, inclusive. */
    start: number;
    /** Epoch ms, exclusive. */
    end: number;
    note: string;
}
export interface CheckStateFields {
    state: CheckState;
    consecutiveDown: number;
    lastResultAt: number | null;
    lastReason: string | null;
    /** Latest result per location ever seen, sorted by location name; empty without results. */
    locations: LocationResult[];
    /** The active window; set only when state is "maintenance". */
    maintenance?: MaintenanceWindow;
    /** certDaysLeft of the latest result; absent or null for HTTP and without a certificate. */
    certDaysLeft?: number | null;
}
/** A check with its evaluated state; distributes over the `Check` union. */
export type CheckWithState = Check & CheckStateFields;
/** Body of POST /results. */
export type PostResultRequest = Result;
/** GET /checks */
export type ChecksResponse = CheckWithState[];
/** GET /checks/:id/results */
export type ResultsResponse = Result[];
/** GET /incidents */
export type IncidentsResponse = Incident[];
/** GET /maintenance */
export type MaintenanceResponse = MaintenanceWindow[];
export interface ErrorResponse {
    error: string;
}
