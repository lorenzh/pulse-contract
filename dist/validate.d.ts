import type { z } from "zod";
import { type Check, type CheckLatency, type ChecksResponse, type CheckUptime, type CheckWithState, type Component, type ComponentsResponse, type ComponentsUptimeResponse, type ComponentUptime, type ComponentWithState, type Incident, type IncidentsResponse, type LatencyResponse, type Location, type LocationsResponse, type MaintenanceResponse, type MaintenanceWindow, type ManualIncident, type ManualIncidentInput, type ManualIncidentsResponse, type ManualIncidentUpdateInput, type PostResultRequest, type Result, type ResultsResponse, type Slo, type UptimeResponse } from "./schema.ts";
/** Outcome of a validator. Validators never throw. */
export type Validation<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
type Fields = Record<string, unknown>;
export declare const isObject: (value: unknown) => value is Fields;
/** Returns the error text, or undefined when the value matches the schema. */
export declare function problem(schema: z.ZodType, value: unknown, path: string): string | undefined;
export declare function verdict<T>(error: string | undefined, value: unknown): Validation<T>;
export declare function validateWith<T>(schema: z.ZodType, value: unknown, path: string): Validation<T>;
export declare const arrayProblem: (check: (item: unknown, path: string) => string | undefined, value: unknown, path: string) => string | undefined;
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
/** Validates a `MaintenanceWindow` (`end` greater than `start`). Returns the same object. */
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
/** Validates a `CheckLatency`: exactly 90 days, null values exactly on days with `count` 0. */
export declare function validateCheckLatency(value: unknown, path?: string): Validation<CheckLatency>;
/** Validates `GET /latency`; fails on the first bad element. */
export declare function validateLatencyResponse(value: unknown, path?: string): Validation<LatencyResponse>;
/** Validates an `Slo`. Returns the same object. */
export declare function validateSlo(value: unknown, path?: string): Validation<Slo>;
/** Validates `GET /uptime`; fails on the first bad element. */
export declare function validateUptimeResponse(value: unknown, path?: string): Validation<UptimeResponse>;
/** Validates a `Location`; unknown keys are rejected. Returns the same object. */
export declare function validateLocation(value: unknown, path?: string): Validation<Location>;
/** Validates `GET /locations`; fails on the first bad element. */
export declare function validateLocationsResponse(value: unknown, path?: string): Validation<LocationsResponse>;
/** Validates a `Component`; unknown keys are rejected. Returns the same object. */
export declare function validateComponent(value: unknown, path?: string): Validation<Component>;
/** Validates a `ComponentWithState`. Returns the same object. */
export declare function validateComponentWithState(value: unknown, path?: string): Validation<ComponentWithState>;
/** Validates a `ComponentUptime`. Returns the same object. */
export declare function validateComponentUptime(value: unknown, path?: string): Validation<ComponentUptime>;
/** Validates `GET /components`; fails on the first bad element. */
export declare function validateComponentsResponse(value: unknown, path?: string): Validation<ComponentsResponse>;
/** Validates `GET /components/uptime`; fails on the first bad element. */
export declare function validateComponentsUptimeResponse(value: unknown, path?: string): Validation<ComponentsUptimeResponse>;
/** Validates a `ManualIncident` including its invariants. Returns the same object. */
export declare function validateManualIncident(value: unknown, path?: string): Validation<ManualIncident>;
/** Validates `GET /manual-incidents`; fails on the first bad element. */
export declare function validateManualIncidentsResponse(value: unknown, path?: string): Validation<ManualIncidentsResponse>;
/** Validates the body of `POST /manual-incidents`. Returns the same object. */
export declare function validateManualIncidentInput(value: unknown, path?: string): Validation<ManualIncidentInput>;
/** Validates the body of `POST /manual-incidents/{id}/updates`. Returns the same object. */
export declare function validateManualIncidentUpdateInput(value: unknown, path?: string): Validation<ManualIncidentUpdateInput>;
export {};
