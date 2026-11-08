import { type ManualIncident, type ManualIncidentsResponse } from "./schema.ts";
import type { Validation } from "./validate-core.ts";
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
}
/** `message` is set only by `requestJson`: the `error` text of an `ErrorResponse` body. */
 | {
    kind: "http";
    status: number;
    wire: WireVersionCheck;
    message?: string;
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
    fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
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
 * Order of checks: HTTP status, wire header, content encoding, size, JSON, validation.
 * It follows no redirect: a 3xx is an `http` error (status 0 for a browser's opaque redirect).
 * It asks for identity coding; under Bun an encoded body is refused as `network`.
 */
export declare function fetchJson<T>(url: string | URL, options: FetchJsonOptions<T>): Promise<FetchJsonResult<T>>;
/** Status, `ETag` and wire check of a response whose headers arrived. */
export type RequestJsonResponse = {
    status: number;
    etag: string | null;
    wire: WireVersionCheck;
};
export type RequestJsonOptions<T> = Omit<FetchJsonOptions<T>, "onWireAbsent"> & {
    method: "POST" | "PUT" | "DELETE";
    /** JSON text, sent with `content-type: application/json`. */
    body?: string;
};
/**
 * Outcome of `requestJson`. It does not throw for expected failures. `response` is set exactly
 * when the response headers arrived: a failure with a `2xx` `response.status` means the server
 * answered `2xx`, and only reading or checking its body failed.
 */
export type RequestJsonResult<T> = {
    ok: true;
    status: number;
    value: T | undefined;
    etag: string | null;
    wire: "ok" | "absent";
} | {
    ok: false;
    error: FetchJsonError;
    response: RequestJsonResponse | null;
};
/**
 * Sends a POST, PUT or DELETE with an optional JSON body. It never follows a redirect and never
 * retries; timeout, abort, size cap and wire check work as in `fetchJson`. A non-`2xx` answer is
 * an `http` error whose `message` is the `ErrorResponse.error` text (at most 1000 characters) when
 * the body is one and fits `maxBytes`. A `204` or empty body gives `value` `undefined`.
 * Order of checks: HTTP status, wire header, content encoding, size, empty body, JSON, validation.
 * Under Bun an encoded `2xx` body is `network`, and an encoded non-`2xx` answer is `http` without
 * `message`, because its body is not read.
 */
export declare function requestJson<T>(url: string | URL, options: RequestJsonOptions<T>): Promise<RequestJsonResult<T>>;
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
