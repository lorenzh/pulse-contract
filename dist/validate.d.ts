import type { Check, ChecksResponse, CheckUptime, CheckWithState, Incident, IncidentsResponse, MaintenanceResponse, MaintenanceWindow, PostResultRequest, Result, ResultsResponse, UptimeResponse } from "./index.ts";
/** Outcome of a validator. Validators never throw. */
export type Validation<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
/** Validates a `Check` (http, tls or heartbeat). State fields are ignored. Returns the same object. */
export declare function validateCheck(value: unknown, path?: string): Validation<Check>;
/** Validates a `CheckWithState`. Returns the same object. */
export declare function validateCheckWithState(value: unknown, path?: string): Validation<CheckWithState>;
/** Validates a `Result`. Returns the same object. */
export declare function validateResult(value: unknown, path?: string): Validation<Result>;
/**
 * Validates the body of `POST /results`. Returns the value as sent: `location` and
 * `attempts` are not defaulted (missing `attempts` means 1, missing or blank `location`
 * means `default`).
 */
export declare function validatePostResultRequest(value: unknown, path?: string): Validation<PostResultRequest>;
/** Validates an `Incident`. Returns the same object. */
export declare function validateIncident(value: unknown, path?: string): Validation<Incident>;
/** Validates a `MaintenanceWindow`. Returns the same object. */
export declare function validateMaintenanceWindow(value: unknown, path?: string): Validation<MaintenanceWindow>;
/** Validates a `CheckUptime`. Returns the same object. */
export declare function validateCheckUptime(value: unknown, path?: string): Validation<CheckUptime>;
/** Validates `GET /checks`; fails on the first bad element. */
export declare function validateChecksResponse(value: unknown, path?: string): Validation<ChecksResponse>;
/** Validates `GET /checks/:id/results`; fails on the first bad element. */
export declare function validateResultsResponse(value: unknown, path?: string): Validation<ResultsResponse>;
/** Validates `GET /incidents`; fails on the first bad element. */
export declare function validateIncidentsResponse(value: unknown, path?: string): Validation<IncidentsResponse>;
/** Validates `GET /maintenance`; fails on the first bad element. */
export declare function validateMaintenanceResponse(value: unknown, path?: string): Validation<MaintenanceResponse>;
/** Validates `GET /uptime`; fails on the first bad element. */
export declare function validateUptimeResponse(value: unknown, path?: string): Validation<UptimeResponse>;
