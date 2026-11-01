import { type AuditEntry, type AuditPage, auditEntrySchema, auditPageSchema } from "./audit.ts";
import { type Validation, validateWith } from "./validate-core.ts";

/** Validates one audit entry, as the api serves it in a page or an export line. */
export function validateAuditEntry(value: unknown, path = "entry"): Validation<AuditEntry> {
  return validateWith(auditEntrySchema, value, path);
}

/** Validates `GET /admin/audit`. */
export function validateAuditPage(value: unknown, path = "page"): Validation<AuditPage> {
  return validateWith(auditPageSchema, value, path);
}
