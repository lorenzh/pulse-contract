const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isInteger = (value) => typeof value === "number" && Number.isInteger(value);
const simple = (isValid, problem) => (value, path) => isValid(value) ? undefined : `${path}: ${problem}`;
const text = simple((v) => typeof v === "string", "must be a string");
const nonEmpty = simple((v) => typeof v === "string" && v.length > 0, "must be a non-empty string");
const finite = simple(isFiniteNumber, "must be a finite number");
const nonNegative = simple((v) => isFiniteNumber(v) && v >= 0, "must be a finite number >= 0");
const positive = simple((v) => isFiniteNumber(v) && v > 0, "must be a finite number > 0");
const integer = simple(isInteger, "must be an integer");
const atLeastOne = simple((v) => isInteger(v) && v >= 1, "must be an integer >= 1");
const bool = simple((v) => typeof v === "boolean", "must be a boolean");
const isoDay = simple((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v), "must be a YYYY-MM-DD date");
const statusCode = simple((v) => isInteger(v) && v >= 100 && v <= 599, "must be an integer 100..599");
const oneOf = (allowed) => {
    const list = allowed.map((a) => JSON.stringify(a)).join(", ");
    return simple((v) => typeof v === "string" && allowed.includes(v), `must be one of ${list}`);
};
const nullable = (rule) => (value, path) => value === null ? undefined : rule(value, path);
const arrayOf = (rule) => (value, path) => {
    if (!Array.isArray(value)) {
        return `${path}: must be an array`;
    }
    for (const [i, item] of value.entries()) {
        const error = rule(item, `${path}[${i}]`);
        if (error !== undefined) {
            return error;
        }
    }
    return undefined;
};
const objectOf = (shape) => (value, path) => checkShape(value, path, shape);
function checkShape(value, path, shape) {
    if (!isObject(value)) {
        return `${path}: must be an object`;
    }
    for (const [key, field] of Object.entries(shape)) {
        const fieldValue = value[key];
        if (fieldValue === undefined) {
            if (field.optional === true) {
                continue;
            }
            return `${path}.${key}: is required`;
        }
        const error = field.rule(fieldValue, `${path}.${key}`);
        if (error !== undefined) {
            return error;
        }
    }
    return undefined;
}
function verdict(error, value) {
    // The caller has checked `value` against the shape of T.
    return error === undefined ? { ok: true, value: value } : { ok: false, error };
}
const optional = (rule) => ({ rule, optional: true });
const required = (rule) => ({ rule });
const httpShape = {
    id: required(nonEmpty),
    name: required(text),
    type: optional(oneOf(["http"])),
    url: required(text),
    intervalMs: required(positive),
    timeoutMs: optional(finite),
    latencyObjectiveMs: optional(finite),
    retries: optional(integer),
    retryDelayMs: optional(integer),
    keyword: optional(text),
};
const tlsShape = {
    id: required(nonEmpty),
    name: required(text),
    type: required(oneOf(["tls"])),
    host: required(text),
    port: required(integer),
    warnDays: required(integer),
    intervalMs: required(positive),
    timeoutMs: optional(finite),
};
const statusRule = oneOf(["up", "degraded", "down"]);
const certDaysLeft = optional(nullable(integer));
const resultShape = {
    checkId: required(nonEmpty),
    timestamp: required(integer),
    status: required(statusRule),
    statusCode: required(nullable(statusCode)),
    latencyMs: required(finite),
    reason: required(nullable(text)),
    location: required(text),
    attempts: required(atLeastOne),
    certDaysLeft,
};
const postResultShape = {
    checkId: required(nonEmpty),
    timestamp: required(integer),
    status: required(statusRule),
    statusCode: required(nullable(statusCode)),
    latencyMs: required(nonNegative),
    reason: required(nullable(text)),
    location: optional(text),
    attempts: optional(atLeastOne),
    certDaysLeft,
};
const maintenanceShape = {
    checkId: required(nonEmpty),
    start: required(finite),
    end: required(finite),
    note: required(text),
};
const incidentShape = {
    id: required(integer),
    checkId: required(nonEmpty),
    openedAt: required(finite),
    resolvedAt: required(nullable(finite)),
    reason: required(nullable(text)),
};
const stateShape = {
    state: required(oneOf(["up", "degraded", "down", "unknown", "maintenance"])),
    consecutiveDown: required(integer),
    lastResultAt: required(nullable(finite)),
    lastReason: required(nullable(text)),
    locations: required(arrayOf(objectOf({
        location: required(text),
        result: required(objectOf(resultShape)),
        stale: required(bool),
    }))),
    maintenance: optional(objectOf(maintenanceShape)),
    certDaysLeft,
};
const uptimeShape = {
    checkId: required(nonEmpty),
    days: required(arrayOf(objectOf({
        date: required(isoDay),
        uptime: required(nullable(finite)),
        results: required(simple((v) => isInteger(v) && v >= 0, "must be an integer >= 0")),
    }))),
    uptime: required(nullable(finite)),
};
function checkBase(value, path) {
    if (!isObject(value)) {
        return `${path}: must be an object`;
    }
    switch (value.type) {
        case undefined:
        case "http":
            return checkShape(value, path, httpShape);
        case "tls":
            return checkShape(value, path, tlsShape);
        default:
            return `${path}.type: must be "http" or "tls"`;
    }
}
function checkWithState(value, path) {
    return checkBase(value, path) ?? checkShape(value, path, stateShape);
}
/** Validates a `Check` (http or tls). State fields are ignored. Returns the same object. */
export function validateCheck(value, path = "check") {
    return verdict(checkBase(value, path), value);
}
/** Validates a `CheckWithState`. Returns the same object. */
export function validateCheckWithState(value, path = "check") {
    return verdict(checkWithState(value, path), value);
}
/** Validates a `Result`. Returns the same object. */
export function validateResult(value, path = "result") {
    return verdict(checkShape(value, path, resultShape), value);
}
/**
 * Validates the body of `POST /results`. Returns the value as sent: `location` and
 * `attempts` are not defaulted (missing `attempts` means 1, missing or blank `location`
 * means `default`).
 */
export function validatePostResultRequest(value, path = "result") {
    return verdict(checkShape(value, path, postResultShape), value);
}
/** Validates an `Incident`. Returns the same object. */
export function validateIncident(value, path = "incident") {
    return verdict(checkShape(value, path, incidentShape), value);
}
/** Validates a `MaintenanceWindow`. Returns the same object. */
export function validateMaintenanceWindow(value, path = "maintenance") {
    return verdict(checkShape(value, path, maintenanceShape), value);
}
/** Validates a `CheckUptime`. Returns the same object. */
export function validateCheckUptime(value, path = "uptime") {
    return verdict(checkShape(value, path, uptimeShape), value);
}
/** Validates `GET /checks`; fails on the first bad element. */
export function validateChecksResponse(value, path = "checks") {
    return verdict(arrayOf(checkWithState)(value, path), value);
}
/** Validates `GET /checks/:id/results`; fails on the first bad element. */
export function validateResultsResponse(value, path = "results") {
    return verdict(arrayOf(objectOf(resultShape))(value, path), value);
}
/** Validates `GET /incidents`; fails on the first bad element. */
export function validateIncidentsResponse(value, path = "incidents") {
    return verdict(arrayOf(objectOf(incidentShape))(value, path), value);
}
/** Validates `GET /maintenance`; fails on the first bad element. */
export function validateMaintenanceResponse(value, path = "maintenance") {
    return verdict(arrayOf(objectOf(maintenanceShape))(value, path), value);
}
/** Validates `GET /uptime`; fails on the first bad element. */
export function validateUptimeResponse(value, path = "uptime") {
    return verdict(arrayOf(objectOf(uptimeShape))(value, path), value);
}
