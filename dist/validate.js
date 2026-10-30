import { checkLatencySchema, checkStateFieldsSchema, checkUptimeSchema, componentSchema, componentUptimeSchema, componentWithStateSchema, dnsCheckSchema, domainCheckSchema, heartbeatCheckSchema, httpCheckSchema, incidentSchema, locationSchema, maintenanceWindowSchema, manualIncidentInputSchema, manualIncidentSchema, manualIncidentUpdateInputSchema, postResultRequestSchema, resultSchema, sloSchema, tcpCheckSchema, tlsCheckSchema, } from "./schema.js";
export const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/**
 * Reads an own data property. Inherited names such as `constructor` and accessors count as
 * absent; a getter never runs.
 */
function ownValue(parent, key) {
    if (typeof parent !== "object" || parent === null) {
        return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(parent, key);
    return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
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
function defOf(schema) {
    // Zod keeps the schema description in `_zod.def`; only the fields read here are typed.
    return schema._zod.def;
}
function define(target, key, value) {
    // defineProperty, because assigning `__proto__` would replace the prototype.
    Object.defineProperty(target, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
    });
}
const WRAPPERS = new Set(["optional", "nullable", "default", "readonly"]);
function objectView(shape, value) {
    const view = {};
    for (const key of Object.keys(value)) {
        if (!Object.hasOwn(shape, key)) {
            define(view, key, undefined);
        }
    }
    for (const [key, field] of Object.entries(shape)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && "value" in descriptor) {
            define(view, key, ownView(field, descriptor.value));
        }
    }
    return view;
}
function arrayView(element, value) {
    // Index loop: an own `map` property on the input must never run.
    const items = [];
    // An accessor element counts as absent, like an accessor field.
    for (let i = 0; i < value.length; i++) {
        items.push(ownView(element, ownValue(value, i)));
    }
    return items;
}
/** With exactly one object option, an object can only match that one. Other unions pass as is. */
function onlyObjectOption(options) {
    const objects = options.filter((o) => defOf(o).type === "object");
    return objects.length === 1 ? objects[0] : undefined;
}
function recordView(valueType, value) {
    const view = {};
    for (const key of Object.keys(value)) {
        define(view, key, ownView(valueType, ownValue(value, key))); // an accessor reads as undefined
    }
    return view;
}
/**
 * Copies the own data fields the schema declares (enumerable or not), level by level, so the
 * parse never sees an inherited value. An accessor counts as absent and its getter never runs.
 * Unknown own enumerable keys are kept as keys with an undefined value, so strict objects still
 * reject them.
 */
function ownView(schema, value) {
    const def = defOf(schema);
    if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
        return ownView(def.innerType, value);
    }
    const element = def.element;
    if (def.type === "array" && element !== undefined && Array.isArray(value)) {
        return arrayView(element, value);
    }
    if (def.type === "record" && def.valueType !== undefined && isObject(value)) {
        return recordView(def.valueType, value);
    }
    if (def.type === "union" && def.options !== undefined && isObject(value)) {
        const option = onlyObjectOption(def.options);
        return option === undefined ? value : ownView(option, value);
    }
    if (def.type === "object" && def.shape !== undefined && isObject(value)) {
        return objectView(def.shape, value);
    }
    return value;
}
const walks = new WeakMap();
const alwaysOwn = () => true;
// Returns the getter without calling it, and allocates nothing for a data property.
// biome-ignore lint/suspicious/noExplicitAny: Annex B method, absent from the lib types.
const lookupGetter = Object.prototype.__lookupGetter__;
function compileObjectWalk(shape) {
    // Parallel arrays and indexed loops: this runs once per object of a large history.
    const keys = Object.keys(shape);
    const fieldWalks = keys.map((key) => walkOf(shape[key]));
    const hasNested = fieldWalks.some((walk) => walk !== alwaysOwn);
    return (value) => {
        if (!isObject(value)) {
            return true;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
            return false; // the parse would see inherited keys; the copy keeps own keys only
        }
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            if (lookupGetter.call(value, key) !== undefined) {
                return false; // a getter: the copy treats it as absent
            }
            if (!Object.hasOwn(value, key)) {
                if (key in value) {
                    return false; // inherited: the copy treats it as absent
                }
                continue;
            }
            // A setter-only accessor reads as undefined without running code.
            if (hasNested && !fieldWalks[i](value[key])) {
                return false;
            }
        }
        return true;
    };
}
/** The copy keeps own enumerable string keys only, so any other own key takes the copy path. */
function compileRecordWalk(walk) {
    return (value) => {
        if (!isObject(value)) {
            return true;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
            return false;
        }
        const keys = Object.keys(value);
        if (Reflect.ownKeys(value).length !== keys.length) {
            return false;
        }
        for (const key of keys) {
            if (lookupGetter.call(value, key) !== undefined || !walk(value[key])) {
                return false;
            }
        }
        return true;
    };
}
function compileWalk(schema) {
    const def = defOf(schema);
    if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
        return walkOf(def.innerType);
    }
    const element = def.element;
    if (def.type === "array" && element !== undefined) {
        const walk = walkOf(element);
        const nested = walk !== alwaysOwn;
        return (value) => {
            if (!Array.isArray(value)) {
                return true;
            }
            for (let i = 0; i < value.length; i += 1) {
                if (lookupGetter.call(value, i) !== undefined) {
                    return false; // a getter element: the copy treats it as absent
                }
                if (nested && !walk(value[i])) {
                    return false;
                }
            }
            return true;
        };
    }
    if (def.type === "record" && def.valueType !== undefined) {
        return compileRecordWalk(walkOf(def.valueType));
    }
    if (def.type === "union" && def.options !== undefined) {
        const option = onlyObjectOption(def.options);
        if (option === undefined) {
            return alwaysOwn;
        }
        const walk = walkOf(option);
        return (value) => !isObject(value) || walk(value);
    }
    if (def.type === "object" && def.shape !== undefined) {
        return compileObjectWalk(def.shape);
    }
    return alwaysOwn;
}
function walkOf(schema) {
    let walk = walks.get(schema);
    if (walk === undefined) {
        walk = compileWalk(schema);
        walks.set(schema, walk);
    }
    return walk;
}
/**
 * True when every object is plain (prototype `Object.prototype` or null) and every declared
 * field is absent or an own property without a getter, level by level. Then the copy would equal
 * the original, and the parse can read the original. Nothing is allocated, and no getter runs.
 */
function isOwnData(schema, value) {
    return walkOf(schema)(value);
}
/** Returns the error text, or undefined when the value matches the schema. */
export function problem(schema, value, path) {
    const parsed = schema.safeParse(isOwnData(schema, value) ? value : ownView(schema, value));
    return parsed.success ? undefined : firstError(parsed.error, value, path);
}
/**
 * Runs `check` at the validation boundary. Hostile input, such as a Proxy whose traps throw, can
 * make inspection throw; that counts as invalid, because validators never throw.
 */
export function verdict(value, path, check) {
    let error;
    try {
        error = check();
    }
    catch {
        error = `${path}: is not a valid value`;
    }
    // The caller has checked `value` against the schema of T; the same object is returned.
    return error === undefined ? { ok: true, value: value } : { ok: false, error };
}
export function validateWith(schema, value, path) {
    return verdict(value, path, () => problem(schema, value, path));
}
export const arrayProblem = (check, value, path) => {
    if (!Array.isArray(value)) {
        return `${path}: must be an array`;
    }
    for (let i = 0; i < value.length; i += 1) {
        if (lookupGetter.call(value, i) !== undefined) {
            return `${path}[${i}]: is required`; // an accessor element is never read
        }
        const error = check(value[i], `${path}[${i}]`);
        if (error !== undefined) {
            return error;
        }
    }
    return undefined;
};
/**
 * Rejects keys outside the type's shape and the state shape; own keys only, so inherited names
 * such as `constructor` stay unknown. A heartbeat check never carries a secret or a target.
 */
function unknownKey(value, path, shape, type) {
    for (const key of Object.keys(value)) {
        if (!Object.hasOwn(shape, key) && !Object.hasOwn(checkStateFieldsSchema.shape, key)) {
            return `${path}.${key}: is not allowed on ${type} check`;
        }
    }
    return undefined;
}
/** State fields pass unvalidated, as served `GET /checks` items carry them. */
function checkBase(value, path) {
    if (!isObject(value)) {
        return `${path}: must be an object`;
    }
    switch (ownValue(value, "type")) {
        case undefined:
        case "http":
            return problem(httpCheckSchema, value, path);
        case "tls":
            return problem(tlsCheckSchema, value, path);
        case "heartbeat":
            return (problem(heartbeatCheckSchema, value, path) ??
                unknownKey(value, path, heartbeatCheckSchema.shape, "a heartbeat"));
        case "tcp":
            return (problem(tcpCheckSchema, value, path) ??
                unknownKey(value, path, tcpCheckSchema.shape, "a tcp"));
        case "dns":
            return (problem(dnsCheckSchema, value, path) ??
                unknownKey(value, path, dnsCheckSchema.shape, "a dns"));
        case "domain":
            return (problem(domainCheckSchema, value, path) ??
                unknownKey(value, path, domainCheckSchema.shape, "a domain"));
        default:
            return `${path}.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"`;
    }
}
function checkWithState(value, path) {
    return checkBase(value, path) ?? problem(checkStateFieldsSchema, value, path);
}
/** Validates a `Check` (http, tls or heartbeat). State fields are ignored. Returns the same object. */
export function validateCheck(value, path = "check") {
    return verdict(value, path, () => checkBase(value, path));
}
/** Validates a `CheckWithState`. Returns the same object. */
export function validateCheckWithState(value, path = "check") {
    return verdict(value, path, () => checkWithState(value, path));
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
    return verdict(value, path, () => arrayProblem(checkWithState, value, path));
}
/** Validates `GET /checks/:id/results`; fails on the first bad element. */
export function validateResultsResponse(value, path = "results") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(resultSchema, item, p), value, path));
}
/** Validates `GET /incidents`; fails on the first bad element. */
export function validateIncidentsResponse(value, path = "incidents") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(incidentSchema, item, p), value, path));
}
/** Validates `GET /maintenance`; fails on the first bad element. */
export function validateMaintenanceResponse(value, path = "maintenance") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(maintenanceWindowSchema, item, p), value, path));
}
/** Validates a `CheckLatency`: exactly 90 days, null values exactly on days with `count` 0. */
export function validateCheckLatency(value, path = "latency") {
    return validateWith(checkLatencySchema, value, path);
}
/** Validates `GET /latency`; fails on the first bad element. */
export function validateLatencyResponse(value, path = "latency") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(checkLatencySchema, item, p), value, path));
}
/** Validates an `Slo`. Returns the same object. */
export function validateSlo(value, path = "slo") {
    return validateWith(sloSchema, value, path);
}
/** Validates `GET /uptime`; fails on the first bad element. */
export function validateUptimeResponse(value, path = "uptime") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(checkUptimeSchema, item, p), value, path));
}
/** Validates a `Location`; unknown keys are rejected. Returns the same object. */
export function validateLocation(value, path = "location") {
    return validateWith(locationSchema, value, path);
}
/** Validates `GET /locations`; fails on the first bad element. */
export function validateLocationsResponse(value, path = "locations") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(locationSchema, item, p), value, path));
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
    return verdict(value, path, () => arrayProblem((item, p) => problem(componentWithStateSchema, item, p), value, path));
}
/** Validates `GET /components/uptime`; fails on the first bad element. */
export function validateComponentsUptimeResponse(value, path = "uptime") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(componentUptimeSchema, item, p), value, path));
}
/** Validates a `ManualIncident` including its invariants. Returns the same object. */
export function validateManualIncident(value, path = "manualIncident") {
    return validateWith(manualIncidentSchema, value, path);
}
/** Validates `GET /manual-incidents`; fails on the first bad element. */
export function validateManualIncidentsResponse(value, path = "manualIncidents") {
    return verdict(value, path, () => arrayProblem((item, p) => problem(manualIncidentSchema, item, p), value, path));
}
/** Validates the body of `POST /manual-incidents`. Returns the same object. */
export function validateManualIncidentInput(value, path = "manualIncident") {
    return validateWith(manualIncidentInputSchema, value, path);
}
/** Validates the body of `POST /manual-incidents/{id}/updates`. Returns the same object. */
export function validateManualIncidentUpdateInput(value, path = "update") {
    return validateWith(manualIncidentUpdateInputSchema, value, path);
}
