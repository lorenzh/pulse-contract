import { type AdminCheckInput, type AdminCheckView, type AdminComponent, type AdminComponentInput, type AdminConfigExport, type AdminConfigResponse, type AdminConfigSummary, type AdminMaintenanceInput, type AdminMaintenanceList, type AdminMaintenanceView, type AdminMaintenanceWindow, type AdminMaintenanceWindowInput } from "./admin.ts";
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
/** Validates the body of `POST /admin/maintenance` or `PUT /admin/maintenance/:id`. Strict. */
export declare function validateAdminMaintenanceWindowInput(value: unknown, path?: string): Validation<AdminMaintenanceWindowInput>;
/** Validates one window of `GET /admin/maintenance` or the body of a window write. */
export declare function validateAdminMaintenanceWindow(value: unknown, path?: string): Validation<AdminMaintenanceWindow>;
/** Validates `GET /admin/maintenance`. */
export declare function validateAdminMaintenanceList(value: unknown, path?: string): Validation<AdminMaintenanceList>;
/** Validates `GET /admin/config`. */
export declare function validateAdminConfigResponse(value: unknown, path?: string): Validation<AdminConfigResponse>;
/** Validates `GET /admin/config` as a 1.x or 2.0.0 api answers it: `revision` and the check ids. */
export declare function validateAdminConfigSummary(value: unknown, path?: string): Validation<AdminConfigSummary>;
/**
 * Validates `GET /admin/config/export`. Each check follows the `Check` rules and carries no
 * `source`, `hasSecret`, `secret` or keep marker; `redacted`, when present, is not empty.
 */
export declare function validateAdminConfigExport(value: unknown, path?: string): Validation<AdminConfigExport>;
