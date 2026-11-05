import { adminCheckInputSchemas, adminCheckViewSchema, adminComponentInputSchema, adminConfigExportSchema, adminConfigResponseSchema, adminConfigSummarySchema, adminMaintenanceInputSchema, adminMaintenanceListSchema, adminMaintenanceViewSchema, adminMaintenanceWindowInputSchema, adminMaintenanceWindowSchema, } from "./admin.js";
import { arrayProblem, validateCheck } from "./validate.js";
import { isObject, ownValue, problem, validateWith, verdict, } from "./validate-core.js";
/**
 * Zod's record parse skips an own `__proto__` key, while a validator returns the original object.
 * So such a header would pass unchecked: a literal value in a view or a malformed keep marker.
 */
function protoHeaderProblem(check, path) {
    const headers = ownValue(check, "headers");
    return isObject(headers) && Object.hasOwn(headers, "__proto__")
        ? `${path}.headers.__proto__: is not an allowed header name`
        : undefined;
}
/** A check view: the `__proto__` header rule, then the view schema. */
function checkViewProblem(value, path) {
    return protoHeaderProblem(value, path) ?? problem(adminCheckViewSchema, value, path);
}
/** Picks the schema by `type`, so errors name the field instead of the whole union. */
function checkInputProblem(value, path) {
    if (!isObject(value)) {
        return `${path}: must be an object`;
    }
    // Own data properties only: a getter never runs, and an inherited `type` cannot pick a schema.
    const ownType = ownValue(value, "type");
    const type = ownType === undefined ? "http" : ownType;
    if (type !== "heartbeat" && ownValue(value, "secret") !== undefined) {
        return `${path}.secret: is only allowed on a heartbeat check`;
    }
    // `type` is unvalidated: `hasOwn` would coerce a non-string, which can throw.
    const schema = typeof type === "string" && Object.hasOwn(adminCheckInputSchemas, type)
        ? adminCheckInputSchemas[type]
        : undefined;
    if (schema === undefined) {
        return `${path}.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"`;
    }
    const unknown = Object.keys(value).find((key) => !Object.hasOwn(schema.shape, key));
    if (unknown !== undefined) {
        return `${path}.${unknown}: is not allowed on this check`;
    }
    return protoHeaderProblem(value, path) ?? problem(schema, value, path);
}
/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check with keep
 * markers, `source: "database"` on every type, plus `secret` (a non-empty string) and
 * `hasSecret: true` on a heartbeat check only. Unknown keys, including state fields, are
 * rejected. Returns the same object.
 */
export function validateAdminCheckInput(value, path = "check") {
    return verdict(value, path, () => checkInputProblem(value, path));
}
/** Validates a check as the admin api serves it. A header value, `body` or `secret` is rejected. */
export function validateAdminCheckView(value, path = "check") {
    return verdict(value, path, () => checkViewProblem(value, path));
}
/** Validates the body of `POST|PUT /admin/components`. Unknown keys are rejected. */
export function validateAdminComponentInput(value, path = "component") {
    return validateWith(adminComponentInputSchema, value, path);
}
/** Validates a component as the admin api serves it. */
export function validateAdminComponent(value, path = "component") {
    return validateWith(adminComponentInputSchema, value, path);
}
/** Validates the body of `POST|PUT /admin/maintenance`. Unknown keys are rejected. */
export function validateAdminMaintenanceInput(value, path = "maintenance") {
    return validateWith(adminMaintenanceInputSchema, value, path);
}
/** Validates a maintenance window as the admin api serves it (with `index`). */
export function validateAdminMaintenanceView(value, path = "maintenance") {
    return validateWith(adminMaintenanceViewSchema, value, path);
}
/** Validates the body of `POST /admin/maintenance` or `PUT /admin/maintenance/:id`. Strict. */
export function validateAdminMaintenanceWindowInput(value, path = "maintenance") {
    return validateWith(adminMaintenanceWindowInputSchema, value, path);
}
/** Validates one window of `GET /admin/maintenance` or the body of a window write. */
export function validateAdminMaintenanceWindow(value, path = "maintenance") {
    return validateWith(adminMaintenanceWindowSchema, value, path);
}
/** Validates `GET /admin/maintenance`. */
export function validateAdminMaintenanceList(value, path = "maintenance") {
    return validateWith(adminMaintenanceListSchema, value, path);
}
/** Validates `GET /admin/config`. */
export function validateAdminConfigResponse(value, path = "config") {
    return verdict(value, path, () => {
        for (const key of ["checks", "shadowed"]) {
            const checks = ownValue(value, key);
            const error = Array.isArray(checks)
                ? arrayProblem(protoHeaderProblem, checks, `${path}.${key}`)
                : undefined;
            if (error !== undefined) {
                return error;
            }
        }
        return problem(adminConfigResponseSchema, value, path);
    });
}
/** Validates `GET /admin/config` as a 1.x or 2.0.0 api answers it: `revision` and the check ids. */
export function validateAdminConfigSummary(value, path = "config") {
    return validateWith(adminConfigSummarySchema, value, path);
}
const EXPORT_FORBIDDEN_KEYS = ["source", "hasSecret", "secret"];
/** A checks-file check: the `Check` rules, no admin field and no keep marker. */
function exportCheckProblem(value, path) {
    const checked = validateCheck(value, path);
    if (!checked.ok) {
        return checked.error;
    }
    const key = EXPORT_FORBIDDEN_KEYS.find((name) => Object.hasOwn(checked.value, name));
    if (key !== undefined) {
        return `${path}.${key}: is not allowed in an export`;
    }
    const headers = ownValue(checked.value, "headers");
    if (!isObject(headers)) {
        return undefined;
    }
    const marker = Object.keys(headers).find((name) => {
        const header = ownValue(headers, name);
        return isObject(header) && Object.hasOwn(header, "keep");
    });
    return marker === undefined ? undefined : `${path}.headers.${marker}: must not be a keep marker`;
}
/**
 * Validates `GET /admin/config/export`. Each check follows the `Check` rules and carries no
 * `source`, `hasSecret`, `secret` or keep marker; `redacted`, when present, is not empty.
 */
export function validateAdminConfigExport(value, path = "config") {
    return verdict(value, path, () => {
        const checks = ownValue(value, "checks");
        const checksError = Array.isArray(checks)
            ? arrayProblem(exportCheckProblem, checks, `${path}.checks`)
            : undefined;
        return checksError ?? problem(adminConfigExportSchema, value, path);
    });
}
