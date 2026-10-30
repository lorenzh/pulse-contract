import { adminCheckInputSchemas, adminCheckViewSchema, adminComponentInputSchema, adminConfigResponseSchema, adminMaintenanceInputSchema, adminMaintenanceViewSchema, } from "./admin.js";
import { isObject, problem, validateCheck, validateWith, verdict, } from "./validate.js";
/** Picks the schema by `type`, so errors name the field instead of the whole union. */
function checkInputProblem(value, path) {
    if (!isObject(value)) {
        return `${path}: must be an object`;
    }
    const type = value.type === undefined ? "http" : value.type;
    if (type !== "heartbeat" && Reflect.get(value, "secret") !== undefined) {
        return `${path}.secret: is only allowed on a heartbeat check`;
    }
    // `type` is unvalidated: `hasOwn` would coerce a non-string, which can throw.
    const schema = typeof type === "string" && Object.hasOwn(adminCheckInputSchemas, type)
        ? adminCheckInputSchemas[type]
        : undefined;
    if (schema === undefined) {
        const base = validateCheck(value, path); // only for its type message
        return base.ok ? undefined : base.error;
    }
    const unknown = Object.keys(value).find((key) => !Object.hasOwn(schema.shape, key));
    if (unknown !== undefined) {
        return `${path}.${unknown}: is not allowed on this check`;
    }
    return problem(schema, value, path);
}
/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check, plus `secret`
 * (a non-empty string) on a heartbeat check only. Unknown keys, including state fields, are
 * rejected. Returns the same object.
 */
export function validateAdminCheckInput(value, path = "check") {
    return verdict(value, path, () => checkInputProblem(value, path));
}
/** Validates a check as the admin api serves it. A header value, `body` or `secret` is rejected. */
export function validateAdminCheckView(value, path = "check") {
    return validateWith(adminCheckViewSchema, value, path);
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
/** Validates `GET /admin/config`. */
export function validateAdminConfigResponse(value, path = "config") {
    return validateWith(adminConfigResponseSchema, value, path);
}
