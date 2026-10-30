import type { ManualIncident, ManualIncidentsResponse } from "./schema.ts";
import { type Validation } from "./validate.ts";
import { type WireVersionCheck } from "./version.ts";
/** Default cap for a response body: 5 MiB. */
export declare const DEFAULT_MAX_BODY_BYTES: number;
/** Why `fetchJson` failed. `kind` tells the variants apart. */
export type FetchJsonError = {
    kind: "timeout";
    timeoutMs: number;
} | {
    kind: "aborted";
    reason: unknown;
} | {
    kind: "network";
    cause: unknown;
} | {
    kind: "http";
    status: number;
    wire: WireVersionCheck;
} | {
    kind: "too-large";
    maxBytes: number;
} | {
    kind: "invalid-json";
    message: string;
} | {
    kind: "wire-mismatch";
    message: string;
} | {
    kind: "validation";
    message: string;
    path?: string;
};
/** Outcome of `fetchJson`. It does not throw for expected failures. */
export type FetchJsonResult<T> = {
    ok: true;
    value: T;
    wire: "ok" | "absent";
} | {
    ok: false;
    error: FetchJsonError;
};
export type FetchJsonOptions<T> = {
    /** The fetch implementation to call. */
    fetch: typeof fetch;
    /** Checks the parsed body, for example `(raw) => validateChecksResponse(raw)`. */
    validate: (raw: unknown) => Validation<T>;
    /** Limit for headers and body together. */
    timeoutMs: number;
    /** Caller abort, combined with the timeout. */
    signal?: AbortSignal;
    /** Body limit in bytes. Defaults to `DEFAULT_MAX_BODY_BYTES`. */
    maxBytes?: number;
    headers?: NonNullable<RequestInit["headers"]>;
    /** Called for each response that has no wire-version header. */
    onWireAbsent?: () => void;
    /** Timer injection. Returns a function that cancels the timer. Defaults to `setTimeout`. */
    schedule?: (fn: () => void, ms: number) => () => void;
};
/**
 * GETs a JSON document and checks it. The timeout covers headers and body. It uses web APIs
 * only, and `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4, Node 20.3).
 * Order of checks: HTTP status, wire header, size, JSON, validation.
 */
export declare function fetchJson<T>(url: string | URL, options: FetchJsonOptions<T>): Promise<FetchJsonResult<T>>;
export type ManualIncidentReadOptions = Omit<FetchJsonOptions<unknown>, "validate"> & {
    /** Treat a 404 (an older api without the route) as "no manual incidents". */
    isAbsentTolerated?: boolean;
};
/**
 * GETs `<baseUrl>/manual-incidents`, optionally filtered by `status`. With `isAbsentTolerated`,
 * a 404 gives an empty list (`wire` is `absent`); every other failure is returned as is.
 */
export declare function getManualIncidents(baseUrl: string, options: ManualIncidentReadOptions, status?: "open" | "resolved" | "all"): Promise<FetchJsonResult<ManualIncidentsResponse>>;
/** GETs `<baseUrl>/manual-incidents/<id>`. A 404 is returned as an `http` error. */
export declare function getManualIncident(baseUrl: string, id: number, options: ManualIncidentReadOptions): Promise<FetchJsonResult<ManualIncident>>;
