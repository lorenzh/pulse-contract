import { type AuditEntry, type AuditPage } from "./audit.ts";
import { type Validation } from "./validate-core.ts";
/** Validates one audit entry, as the api serves it in a page or an export line. */
export declare function validateAuditEntry(value: unknown, path?: string): Validation<AuditEntry>;
/** Validates `GET /admin/audit`. */
export declare function validateAuditPage(value: unknown, path?: string): Validation<AuditPage>;
