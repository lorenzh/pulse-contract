/** Prefix of a revision: `sha256-` followed by 64 lower-case hex digits of the file bytes. */
export const ADMIN_REVISION_PREFIX = "sha256-";

/** A revision in the unquoted form `sha256-<hex>`. */
export const ADMIN_REVISION = new RegExp(`^${ADMIN_REVISION_PREFIX}[0-9a-f]{64}$`);

/** Whether `value` is a revision in the unquoted form `sha256-<hex>`. */
export function isAdminRevision(value: unknown): value is string {
  return typeof value === "string" && ADMIN_REVISION.test(value);
}
