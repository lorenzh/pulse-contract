import { auditEntrySchema, auditPageSchema } from "./audit.js";
import { validateWith } from "./validate-core.js";
/** Validates one audit entry, as the api serves it in a page or an export line. */
export function validateAuditEntry(value, path = "entry") {
    return validateWith(auditEntrySchema, value, path);
}
/** Validates `GET /admin/audit`. */
export function validateAuditPage(value, path = "page") {
    return validateWith(auditPageSchema, value, path);
}
