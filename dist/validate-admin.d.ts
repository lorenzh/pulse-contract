import { type AdminCheckInput, type AdminCheckView, type AdminComponent, type AdminComponentInput, type AdminConfigResponse, type AdminMaintenanceInput, type AdminMaintenanceView } from "./admin.ts";
import { type TokenCreateInput, type TokenMetadata, type TokenSecretResponse, type TokensResponse } from "./tokens.ts";
import { type Validation } from "./validate.ts";
/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check, plus `secret`
 * (a non-empty string) on a heartbeat check only. Unknown keys, including state fields, are
 * rejected. Returns the same object.
 */
export declare function validateAdminCheckInput(value: unknown, path?: string): Validation<AdminCheckInput>;
/** Validates a check as the admin api serves it. A header value, `body` or `secret` is rejected. */
export declare function validateAdminCheckView(value: unknown, path?: string): Validation<AdminCheckView>;
/** Validates the body of `POST|PUT /admin/components`. Unknown keys are rejected. */
export declare function validateAdminComponentInput(value: unknown, path?: string): Validation<AdminComponentInput>;
/** Validates a component as the admin api serves it. */
export declare function validateAdminComponent(value: unknown, path?: string): Validation<AdminComponent>;
/** Validates the body of `POST|PUT /admin/maintenance`. Unknown keys are rejected. */
export declare function validateAdminMaintenanceInput(value: unknown, path?: string): Validation<AdminMaintenanceInput>;
/** Validates a maintenance window as the admin api serves it (with `index`). */
export declare function validateAdminMaintenanceView(value: unknown, path?: string): Validation<AdminMaintenanceView>;
/** Validates `GET /admin/config`. */
export declare function validateAdminConfigResponse(value: unknown, path?: string): Validation<AdminConfigResponse>;
/** Validates a token as the api serves it. A `secret` or digest field is rejected. */
export declare function validateTokenMetadata(value: unknown, path?: string): Validation<TokenMetadata>;
/** Validates `GET /admin/tokens`. */
export declare function validateTokensResponse(value: unknown, path?: string): Validation<TokensResponse>;
/**
 * Validates the body of `POST /admin/tokens`. It has no clock: the api checks that `expiresAt`
 * lies in the future and within its window.
 */
export declare function validateTokenCreateInput(value: unknown, path?: string): Validation<TokenCreateInput>;
/** Validates the answer of a token create or rotate. */
export declare function validateTokenSecretResponse(value: unknown, path?: string): Validation<TokenSecretResponse>;
