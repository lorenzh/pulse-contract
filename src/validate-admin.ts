import {
  type AdminCheckInput,
  type AdminCheckView,
  type AdminComponent,
  type AdminComponentInput,
  type AdminConfigResponse,
  type AdminMaintenanceInput,
  type AdminMaintenanceView,
  adminCheckViewSchema,
  adminComponentInputSchema,
  adminConfigResponseSchema,
  adminMaintenanceInputSchema,
  adminMaintenanceViewSchema,
  adminSecretSchema,
} from "./admin.ts";
import {
  dnsCheckSchema,
  domainCheckSchema,
  heartbeatCheckSchema,
  httpCheckSchema,
  tcpCheckSchema,
  tlsCheckSchema,
} from "./schema.ts";
import {
  isObject,
  problem,
  type Validation,
  validateCheck,
  validateWith,
  verdict,
} from "./validate.ts";

type Fields = Record<string, unknown>;

function declaredKeys(type: unknown): readonly string[] {
  switch (type) {
    case "tls":
      return Object.keys(tlsCheckSchema.shape);
    case "tcp":
      return Object.keys(tcpCheckSchema.shape);
    case "dns":
      return Object.keys(dnsCheckSchema.shape);
    case "domain":
      return Object.keys(domainCheckSchema.shape);
    case "heartbeat":
      return Object.keys(heartbeatCheckSchema.shape);
    default:
      return Object.keys(httpCheckSchema.shape);
  }
}

function checkInputProblem(value: unknown, path: string): string | undefined {
  if (!isObject(value)) {
    return `${path}: must be an object`;
  }
  const isHeartbeat = value.type === "heartbeat";
  const rest: Fields = {};
  for (const key of Object.keys(value)) {
    if (key !== "secret") {
      Object.defineProperty(rest, key, {
        value: Reflect.get(value, key),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  if (Object.hasOwn(value, "secret") && Reflect.get(value, "secret") !== undefined) {
    if (!isHeartbeat) {
      return `${path}.secret: is only allowed on a heartbeat check`;
    }
    const secret = problem(adminSecretSchema, Reflect.get(value, "secret"), `${path}.secret`);
    if (secret !== undefined) {
      return secret;
    }
  }
  const base = validateCheck(rest, path);
  if (!base.ok) {
    return base.error;
  }
  const allowed = declaredKeys(value.type);
  const unknown = Object.keys(rest).find((key) => !allowed.includes(key));
  return unknown === undefined ? undefined : `${path}.${unknown}: is not allowed on this check`;
}

/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check, plus `secret`
 * (a non-empty string) on a heartbeat check only. Unknown keys, including state fields, are
 * rejected. Returns the same object.
 */
export function validateAdminCheckInput(
  value: unknown,
  path = "check",
): Validation<AdminCheckInput> {
  return verdict(checkInputProblem(value, path), value);
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
