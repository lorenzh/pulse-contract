import {
  type AdminCheckInput,
  type AdminCheckView,
  type AdminComponent,
  type AdminComponentInput,
  type AdminConfigResponse,
  type AdminMaintenanceInput,
  type AdminMaintenanceView,
  adminCheckInputSchemas,
  adminCheckViewSchema,
  adminComponentInputSchema,
  adminConfigResponseSchema,
  adminMaintenanceInputSchema,
  adminMaintenanceViewSchema,
} from "./admin.ts";
import {
  type TokenCreateInput,
  type TokenMetadata,
  type TokenSecretResponse,
  type TokensResponse,
  tokenCreateInputSchema,
  tokenMetadataSchema,
  tokenSecretResponseSchema,
  tokensResponseSchema,
} from "./tokens.ts";
import {
  isObject,
  ownValue,
  problem,
  type Validation,
  validateCheck,
  validateWith,
  verdict,
} from "./validate.ts";

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

/** Validates a token as the api serves it. A `secret` or digest field is rejected. */
export function validateTokenMetadata(value: unknown, path = "token"): Validation<TokenMetadata> {
  return validateWith(tokenMetadataSchema, value, path);
}

/** Validates `GET /admin/tokens`. */
export function validateTokensResponse(
  value: unknown,
  path = "tokens",
): Validation<TokensResponse> {
  return validateWith(tokensResponseSchema, value, path);
}

/**
 * Validates the body of `POST /admin/tokens`. It has no clock: the api checks that `expiresAt`
 * lies in the future and within its window.
 */
export function validateTokenCreateInput(
  value: unknown,
  path = "token",
): Validation<TokenCreateInput> {
  return validateWith(tokenCreateInputSchema, value, path);
}

/** Validates the answer of a token create or rotate. */
export function validateTokenSecretResponse(
  value: unknown,
  path = "response",
): Validation<TokenSecretResponse> {
  return validateWith(tokenSecretResponseSchema, value, path);
}
