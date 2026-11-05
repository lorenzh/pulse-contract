import type { ManualIncident } from "./schema.ts";
/**
 * True when an upstream manual incident may be shown publicly. It reads only own property
 * descriptors: a missing `visibility` or `publishedAt` (an older api) counts as public, an
 * accessor on either key makes the item non-public, and no getter ever runs. Never throws.
 */
export declare function isPublicManualIncident(value: unknown): boolean;
/** A new object with exactly the public fields; each update keeps only `at`, `status`, `message`. */
export declare function publicManualIncident(incident: ManualIncident): ManualIncident;
