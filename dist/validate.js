import { checkStateFieldsSchema, checkUptimeSchema, componentSchema, componentUptimeSchema, componentWithStateSchema, heartbeatCheckSchema, httpCheckSchema, incidentSchema, maintenanceWindowSchema, postResultRequestSchema, resultSchema, tlsCheckSchema, } from "./schema.js";
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Reads an own property; inherited names such as `constructor` count as absent. */
function ownValue(parent, key) {
    if (typeof parent !== "object" || parent === null || !Object.hasOwn(parent, key)) {
        return undefined;
    }
    return Reflect.get(parent, key);
}
/** `checks[2].intervalMs` style: indexes in brackets, keys after a dot. */
function formatPath(base, keys) {
    let path = base;
    for (const key of keys) {
        path += typeof key === "number" ? `[${key}]` : `.${String(key)}`;
    }
    return path;
}
/** The first problem of a failed parse as `<path>: <problem>`. */
function firstError(error, value, base) {
    const issue = error.issues[0];
    if (issue === undefined) {
        return `${base}: is invalid`;
    }
    const path = formatPath(base, issue.path);
    let at = value;
    for (const key of issue.path) {
        at = ownValue(at, key);
    }
    return `${path}: ${at === undefined && issue.path.length > 0 ? "is required" : issue.message}`;
}
/** Returns the error text, or undefined when the value matches the schema. */
function problem(schema, value, path) {
    // Spread keeps own enumerable keys only, so a field found only on the prototype counts as missing.
    const parsed = schema.safeParse(isObject(value) ? { ...value } : value);
    return parsed.success ? undefined : firstError(parsed.error, value, path);
}
function verdict(error, value) {
    // The caller has checked `value` against the schema of T; the same object is returned.
    return error === undefined ? { ok: true, value: value } : { ok: false, error };
}
function validateWith(schema, value, path) {
    return verdict(problem(schema, value, path), value);
}
const arrayProblem = (check, value, path) => {
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
function unknownKey(value, path) {
    for (const key of Object.keys(value)) {
        if (!Object.hasOwn(heartbeatCheckSchema.shape, key) &&
            !Object.hasOwn(checkStateFieldsSchema.shape, key)) {
            return `${path}.${key}: is not allowed on a heartbeat check`;
        }
    }
    return undefined;
}
/** State fields pass unvalidated, as served `GET /checks` items carry them. */
function checkBase(value, path) {
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
function checkWithState(value, path) {
    return checkBase(value, path) ?? problem(checkStateFieldsSchema, value, path);
}
/** Validates a `Check` (http, tls or heartbeat). State fields are ignored. Returns the same object. */
export function validateCheck(value, path = "check") {
    return verdict(checkBase(value, path), value);
}
/** Validates a `CheckWithState`. Returns the same object. */
export function validateCheckWithState(value, path = "check") {
    return verdict(checkWithState(value, path), value);
}
/** Validates a `Result`. Returns the same object. */
export function validateResult(value, path = "result") {
    return validateWith(resultSchema, value, path);
}
/**
 * Validates the body of `POST /results`. Returns the value as sent: `location` and
 * `attempts` are not defaulted (missing `attempts` means 1, missing or blank `location`
 * means `default`).
 */
export function validatePostResultRequest(value, path = "result") {
    return validateWith(postResultRequestSchema, value, path);
}
/** Validates an `Incident`. Returns the same object. */
export function validateIncident(value, path = "incident") {
    return validateWith(incidentSchema, value, path);
}
/** Validates a `MaintenanceWindow` (`end` greater than `start`). Returns the same object. */
export function validateMaintenanceWindow(value, path = "maintenance") {
    return validateWith(maintenanceWindowSchema, value, path);
}
/** Validates a `CheckUptime`. Returns the same object. */
export function validateCheckUptime(value, path = "uptime") {
    return validateWith(checkUptimeSchema, value, path);
}
/** Validates `GET /checks`; fails on the first bad element. */
export function validateChecksResponse(value, path = "checks") {
    return verdict(arrayProblem(checkWithState, value, path), value);
}
/** Validates `GET /checks/:id/results`; fails on the first bad element. */
export function validateResultsResponse(value, path = "results") {
    return verdict(arrayProblem((item, p) => problem(resultSchema, item, p), value, path), value);
}
/** Validates `GET /incidents`; fails on the first bad element. */
export function validateIncidentsResponse(value, path = "incidents") {
    return verdict(arrayProblem((item, p) => problem(incidentSchema, item, p), value, path), value);
}
/** Validates `GET /maintenance`; fails on the first bad element. */
export function validateMaintenanceResponse(value, path = "maintenance") {
    return verdict(arrayProblem((item, p) => problem(maintenanceWindowSchema, item, p), value, path), value);
}
/** Validates `GET /uptime`; fails on the first bad element. */
export function validateUptimeResponse(value, path = "uptime") {
    return verdict(arrayProblem((item, p) => problem(checkUptimeSchema, item, p), value, path), value);
}
/** Validates a `Component`; unknown keys are rejected. Returns the same object. */
export function validateComponent(value, path = "component") {
    return validateWith(componentSchema, value, path);
}
/** Validates a `ComponentWithState`. Returns the same object. */
export function validateComponentWithState(value, path = "component") {
    return validateWith(componentWithStateSchema, value, path);
}
/** Validates a `ComponentUptime`. Returns the same object. */
export function validateComponentUptime(value, path = "uptime") {
    return validateWith(componentUptimeSchema, value, path);
}
/** Validates `GET /components`; fails on the first bad element. */
export function validateComponentsResponse(value, path = "components") {
    return verdict(arrayProblem((item, p) => problem(componentWithStateSchema, item, p), value, path), value);
}
/** Validates `GET /components/uptime`; fails on the first bad element. */
export function validateComponentsUptimeResponse(value, path = "uptime") {
    return verdict(arrayProblem((item, p) => problem(componentUptimeSchema, item, p), value, path), value);
}
