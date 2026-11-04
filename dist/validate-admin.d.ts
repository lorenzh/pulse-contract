import { type AdminCheckInput, type AdminCheckView, type AdminComponent, type AdminComponentInput, type AdminConfigExport, type AdminConfigResponse, type AdminConfigSummary, type AdminMaintenanceInput, type AdminMaintenanceView } from "./admin.ts";
import { type Validation } from "./validate-core.ts";
/**
 * Validates the body of `POST /admin/checks` or `PUT /admin/checks/:id`: a check with keep
 * markers, `source: "database"` on every type, plus `secret` (a non-empty string) and
 * `hasSecret: true` on a heartbeat check only. Unknown keys, including state fields, are
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
/** Validates `GET /admin/config` as a 1.x or 2.0.0 api answers it: `revision` and the check ids. */
export declare function validateAdminConfigSummary(value: unknown, path?: string): Validation<AdminConfigSummary>;
/**
 * Validates `GET /admin/config/export`. Each check follows the `Check` rules and carries no
 * `source`, `hasSecret`, `secret` or keep marker; `redacted`, when present, is not empty.
 */
export declare function validateAdminConfigExport(value: unknown, path?: string): Validation<AdminConfigExport>;
