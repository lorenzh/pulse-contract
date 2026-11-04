import {
  type AdminCheckInput,
  type AdminCheckView,
  type AdminComponent,
  type AdminComponentInput,
  type AdminConfigExport,
  type AdminConfigResponse,
  type AdminConfigSummary,
  type AdminMaintenanceInput,
  type AdminMaintenanceView,
  adminCheckInputSchemas,
  adminCheckViewSchema,
  adminComponentInputSchema,
  adminConfigExportSchema,
  adminConfigResponseSchema,
  adminConfigSummarySchema,
  adminMaintenanceInputSchema,
  adminMaintenanceViewSchema,
} from "./admin.ts";
import { arrayProblem, validateCheck } from "./validate.ts";
import {
  isObject,
  ownValue,
  problem,
  type Validation,
  validateWith,
  verdict,
} from "./validate-core.ts";

/** Picks the schema by `type`, so errors name the field instead of the whole union. */
function checkInputProblem(value: unknown, path: string): string | undefined {
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
  const schema =
    typeof type === "string" && Object.hasOwn(adminCheckInputSchemas, type)
      ? adminCheckInputSchemas[type as keyof typeof adminCheckInputSchemas]
      : undefined;
  if (schema === undefined) {
    return `${path}.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"`;
  }
  const unknown = Object.keys(value).find((key) => !Object.hasOwn(schema.shape, key));
  if (unknown !== undefined) {
    return `${path}.${unknown}: is not allowed on this check`;
  }
  return problem(schema, value, path);
}

/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check with keep
 * markers, `source: "database"` on every type, plus `secret` (a non-empty string) and
 * `hasSecret: true` on a heartbeat check only. Unknown keys, including state fields, are
 * rejected. Returns the same object.
 */
export function validateAdminCheckInput(
  value: unknown,
  path = "check",
): Validation<AdminCheckInput> {
  return verdict(value, path, () => checkInputProblem(value, path));
}

/** Validates a check as the admin api serves it. A header value, `body` or `secret` is rejected. */
export function validateAdminCheckView(value: unknown, path = "check"): Validation<AdminCheckView> {
  return validateWith(adminCheckViewSchema, value, path);
}

/** Validates the body of `POST|PUT /admin/components`. Unknown keys are rejected. */
export function validateAdminComponentInput(
  value: unknown,
  path = "component",
): Validation<AdminComponentInput> {
  return validateWith(adminComponentInputSchema, value, path);
}

/** Validates a component as the admin api serves it. */
export function validateAdminComponent(
  value: unknown,
  path = "component",
): Validation<AdminComponent> {
  return validateWith(adminComponentInputSchema, value, path);
}

/** Validates the body of `POST|PUT /admin/maintenance`. Unknown keys are rejected. */
export function validateAdminMaintenanceInput(
  value: unknown,
  path = "maintenance",
): Validation<AdminMaintenanceInput> {
  return validateWith(adminMaintenanceInputSchema, value, path);
}

/** Validates a maintenance window as the admin api serves it (with `index`). */
export function validateAdminMaintenanceView(
  value: unknown,
  path = "maintenance",
): Validation<AdminMaintenanceView> {
  return validateWith(adminMaintenanceViewSchema, value, path);
}

/** Validates `GET /admin/config`. */
export function validateAdminConfigResponse(
  value: unknown,
  path = "config",
): Validation<AdminConfigResponse> {
  return validateWith(adminConfigResponseSchema, value, path);
}

/** Validates `GET /admin/config` as a 1.x or 2.0.0 api answers it: `revision` and the check ids. */
export function validateAdminConfigSummary(
  value: unknown,
  path = "config",
): Validation<AdminConfigSummary> {
  return validateWith(adminConfigSummarySchema, value, path);
}

const EXPORT_FORBIDDEN_KEYS = ["source", "hasSecret", "secret"] as const;

/** A checks-file check: the `Check` rules, no admin field and no keep marker. */
function exportCheckProblem(value: unknown, path: string): string | undefined {
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
export function validateAdminConfigExport(
  value: unknown,
  path = "config",
): Validation<AdminConfigExport> {
  return verdict(value, path, () => {
    const checks = ownValue(value, "checks");
    const checksError = Array.isArray(checks)
      ? arrayProblem(exportCheckProblem, checks, `${path}.checks`)
      : undefined;
    return checksError ?? problem(adminConfigExportSchema, value, path);
  });
}
