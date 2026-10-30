import type { z } from "zod";
import {
  type Check,
  type ChecksResponse,
  type CheckUptime,
  type CheckWithState,
  type Component,
  type ComponentsResponse,
  type ComponentsUptimeResponse,
  type ComponentUptime,
  type ComponentWithState,
  checkStateFieldsSchema,
  checkUptimeSchema,
  componentSchema,
  componentUptimeSchema,
  componentWithStateSchema,
  heartbeatCheckSchema,
  httpCheckSchema,
  type Incident,
  type IncidentsResponse,
  incidentSchema,
  type MaintenanceResponse,
  type MaintenanceWindow,
  type ManualIncident,
  type ManualIncidentInput,
  type ManualIncidentsResponse,
  type ManualIncidentUpdateInput,
  maintenanceWindowSchema,
  manualIncidentInputSchema,
  manualIncidentSchema,
  manualIncidentUpdateInputSchema,
  type PostResultRequest,
  postResultRequestSchema,
  type Result,
  type ResultsResponse,
  resultSchema,
  tlsCheckSchema,
  type UptimeResponse,
} from "./schema.ts";

/** Outcome of a validator. Validators never throw. */
export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads an own property; inherited names such as `constructor` count as absent. */
function ownValue(parent: unknown, key: PropertyKey): unknown {
  if (typeof parent !== "object" || parent === null || !Object.hasOwn(parent, key)) {
    return undefined;
  }
  return Reflect.get(parent, key);
}

/** `checks[2].intervalMs` style: indexes in brackets, keys after a dot. */
function formatPath(base: string, keys: readonly PropertyKey[]): string {
  let path = base;
  for (const key of keys) {
    path += typeof key === "number" ? `[${key}]` : `.${String(key)}`;
  }
  return path;
}

/** The first problem of a failed parse as `<path>: <problem>`. */
function firstError(error: z.ZodError, value: unknown, base: string): string {
  const issue = error.issues[0];
  if (issue === undefined) {
    return `${base}: is invalid`;
  }
  const path = formatPath(base, issue.path);
  let at: unknown = value;
  for (const key of issue.path) {
    at = ownValue(at, key);
  }
  return `${path}: ${at === undefined && issue.path.length > 0 ? "is required" : issue.message}`;
}

type Def = { type?: string; shape?: Fields; element?: z.ZodType; innerType?: z.ZodType };

function defOf(schema: z.ZodType): Def {
  // Zod keeps the schema description in `_zod.def`; only the fields read here are typed.
  return schema._zod.def as Def;
}

function define(target: Fields, key: string, value: unknown): void {
  // defineProperty, because assigning `__proto__` would replace the prototype.
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

const WRAPPERS = new Set(["optional", "nullable", "default", "readonly"]);

function objectView(shape: Fields, value: Fields): Fields {
  const view: Fields = {};
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(shape, key)) {
      define(view, key, undefined);
    }
  }
  for (const [key, field] of Object.entries(shape)) {
    if (Object.hasOwn(value, key)) {
      define(view, key, ownView(field as z.ZodType, Reflect.get(value, key)));
    }
  }
  return view;
}

/**
 * Copies the own fields the schema declares (enumerable or not), level by level, so the parse
 * never sees an inherited value. Unknown own enumerable keys are kept as keys with an
 * undefined value: their getters never run, and strict objects still reject them.
 */
function ownView(schema: z.ZodType, value: unknown): unknown {
  const def = defOf(schema);
  if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
    return ownView(def.innerType, value);
  }
  const element = def.element;
  if (def.type === "array" && element !== undefined && Array.isArray(value)) {
    return value.map((item) => ownView(element, item));
  }
  if (def.type === "object" && def.shape !== undefined && isObject(value)) {
    return objectView(def.shape, value);
  }
  return value;
}

/** Returns the error text, or undefined when the value matches the schema. */
function problem(schema: z.ZodType, value: unknown, path: string): string | undefined {
  const parsed = schema.safeParse(ownView(schema, value));
  return parsed.success ? undefined : firstError(parsed.error, value, path);
}

function verdict<T>(error: string | undefined, value: unknown): Validation<T> {
  // The caller has checked `value` against the schema of T; the same object is returned.
  return error === undefined ? { ok: true, value: value as T } : { ok: false, error };
}

function validateWith<T>(schema: z.ZodType, value: unknown, path: string): Validation<T> {
  return verdict(problem(schema, value, path), value);
}

const arrayProblem = (
  check: (item: unknown, path: string) => string | undefined,
  value: unknown,
  path: string,
): string | undefined => {
  if (!Array.isArray(value)) {
    return `${path}: must be an array`;
  }
  for (const [i, item] of value.entries()) {
    const error = check(item, `${path}[${i}]`);
    if (error !== undefined) {
      return error;
    }
  }
  return undefined;
};

/**
 * Rejects keys outside the heartbeat and state shapes; a heartbeat check never carries a
 * secret or a target. Own keys only, so inherited names such as `constructor` stay unknown.
 */
function unknownKey(value: Fields, path: string): string | undefined {
  for (const key of Object.keys(value)) {
    if (
      !Object.hasOwn(heartbeatCheckSchema.shape, key) &&
      !Object.hasOwn(checkStateFieldsSchema.shape, key)
    ) {
      return `${path}.${key}: is not allowed on a heartbeat check`;
    }
  }
  return undefined;
}

/** State fields pass unvalidated, as served `GET /checks` items carry them. */
function checkBase(value: unknown, path: string): string | undefined {
  if (!isObject(value)) {
    return `${path}: must be an object`;
  }
  switch (value.type) {
    case undefined:
    case "http":
      return problem(httpCheckSchema, value, path);
    case "tls":
      return problem(tlsCheckSchema, value, path);
    case "heartbeat":
      return problem(heartbeatCheckSchema, value, path) ?? unknownKey(value, path);
    default:
      return `${path}.type: must be "http", "tls" or "heartbeat"`;
  }
}

function checkWithState(value: unknown, path: string): string | undefined {
  return checkBase(value, path) ?? problem(checkStateFieldsSchema, value, path);
}

/** Validates a `Check` (http, tls or heartbeat). State fields are ignored. Returns the same object. */
export function validateCheck(value: unknown, path = "check"): Validation<Check> {
  return verdict(checkBase(value, path), value);
}

/** Validates a `CheckWithState`. Returns the same object. */
export function validateCheckWithState(value: unknown, path = "check"): Validation<CheckWithState> {
  return verdict(checkWithState(value, path), value);
}

/** Validates a `Result`. Returns the same object. */
export function validateResult(value: unknown, path = "result"): Validation<Result> {
  return validateWith(resultSchema, value, path);
}

/**
 * Validates the body of `POST /results`. Returns the value as sent: `location` and
 * `attempts` are not defaulted (missing `attempts` means 1, missing or blank `location`
 * means `default`).
 */
export function validatePostResultRequest(
  value: unknown,
  path = "result",
): Validation<PostResultRequest> {
  return validateWith(postResultRequestSchema, value, path);
}

/** Validates an `Incident`. Returns the same object. */
export function validateIncident(value: unknown, path = "incident"): Validation<Incident> {
  return validateWith(incidentSchema, value, path);
}

/** Validates a `MaintenanceWindow` (`end` greater than `start`). Returns the same object. */
export function validateMaintenanceWindow(
  value: unknown,
  path = "maintenance",
): Validation<MaintenanceWindow> {
  return validateWith(maintenanceWindowSchema, value, path);
}

/** Validates a `CheckUptime`. Returns the same object. */
export function validateCheckUptime(value: unknown, path = "uptime"): Validation<CheckUptime> {
  return validateWith(checkUptimeSchema, value, path);
}

/** Validates `GET /checks`; fails on the first bad element. */
export function validateChecksResponse(
  value: unknown,
  path = "checks",
): Validation<ChecksResponse> {
  return verdict(arrayProblem(checkWithState, value, path), value);
}

/** Validates `GET /checks/:id/results`; fails on the first bad element. */
export function validateResultsResponse(
  value: unknown,
  path = "results",
): Validation<ResultsResponse> {
  return verdict(
    arrayProblem((item, p) => problem(resultSchema, item, p), value, path),
    value,
  );
}

/** Validates `GET /incidents`; fails on the first bad element. */
export function validateIncidentsResponse(
  value: unknown,
  path = "incidents",
): Validation<IncidentsResponse> {
  return verdict(
    arrayProblem((item, p) => problem(incidentSchema, item, p), value, path),
    value,
  );
}

/** Validates `GET /maintenance`; fails on the first bad element. */
export function validateMaintenanceResponse(
  value: unknown,
  path = "maintenance",
): Validation<MaintenanceResponse> {
  return verdict(
    arrayProblem((item, p) => problem(maintenanceWindowSchema, item, p), value, path),
    value,
  );
}

/** Validates `GET /uptime`; fails on the first bad element. */
export function validateUptimeResponse(
  value: unknown,
  path = "uptime",
): Validation<UptimeResponse> {
  return verdict(
    arrayProblem((item, p) => problem(checkUptimeSchema, item, p), value, path),
    value,
  );
}

/** Validates a `Component`; unknown keys are rejected. Returns the same object. */
export function validateComponent(value: unknown, path = "component"): Validation<Component> {
  return validateWith(componentSchema, value, path);
}

/** Validates a `ComponentWithState`. Returns the same object. */
export function validateComponentWithState(
  value: unknown,
  path = "component",
): Validation<ComponentWithState> {
  return validateWith(componentWithStateSchema, value, path);
}

/** Validates a `ComponentUptime`. Returns the same object. */
export function validateComponentUptime(
  value: unknown,
  path = "uptime",
): Validation<ComponentUptime> {
  return validateWith(componentUptimeSchema, value, path);
}

/** Validates `GET /components`; fails on the first bad element. */
export function validateComponentsResponse(
  value: unknown,
  path = "components",
): Validation<ComponentsResponse> {
  return verdict(
    arrayProblem((item, p) => problem(componentWithStateSchema, item, p), value, path),
    value,
  );
}

/** Validates `GET /components/uptime`; fails on the first bad element. */
export function validateComponentsUptimeResponse(
  value: unknown,
  path = "uptime",
): Validation<ComponentsUptimeResponse> {
  return verdict(
    arrayProblem((item, p) => problem(componentUptimeSchema, item, p), value, path),
    value,
  );
}

/** Validates a `ManualIncident` including its invariants. Returns the same object. */
export function validateManualIncident(
  value: unknown,
  path = "manualIncident",
): Validation<ManualIncident> {
  return validateWith(manualIncidentSchema, value, path);
}

/** Validates `GET /manual-incidents`; fails on the first bad element. */
export function validateManualIncidentsResponse(
  value: unknown,
  path = "manualIncidents",
): Validation<ManualIncidentsResponse> {
  return verdict(
    arrayProblem((item, p) => problem(manualIncidentSchema, item, p), value, path),
    value,
  );
}

/** Validates the body of `POST /manual-incidents`. Returns the same object. */
export function validateManualIncidentInput(
  value: unknown,
  path = "manualIncident",
): Validation<ManualIncidentInput> {
  return validateWith(manualIncidentInputSchema, value, path);
}

/** Validates the body of `POST /manual-incidents/{id}/updates`. Returns the same object. */
export function validateManualIncidentUpdateInput(
  value: unknown,
  path = "update",
): Validation<ManualIncidentUpdateInput> {
  return validateWith(manualIncidentUpdateInputSchema, value, path);
}
