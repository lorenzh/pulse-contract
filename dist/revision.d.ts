/** Prefix of a revision: `sha256-` followed by 64 lower-case hex digits of the file bytes. */
export declare const ADMIN_REVISION_PREFIX = "sha256-";
/** A revision in the unquoted form `sha256-<hex>`. */
export declare const ADMIN_REVISION: RegExp;
/** Whether `value` is a revision in the unquoted form `sha256-<hex>`. */
export declare function isAdminRevision(value: unknown): value is string;
