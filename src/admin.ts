import { z } from "zod";
import {
  componentSchema,
  dnsCheckSchema,
  domainCheckSchema,
  heartbeatCheckSchema,
  httpCheckSchema,
  maintenanceWindowSchema,
  refineHttpCheck,
  tcpCheckSchema,
  tlsCheckSchema,
} from "./schema.ts";

/** Request header that carries the revision a write is based on. Required on every write. */
export const ADMIN_IF_MATCH_HEADER = "if-match";

/** Response header that carries the revision, quoted: `"sha256-<hex>"`. */
export const ADMIN_ETAG_HEADER = "etag";

/** Prefix of a revision: `sha256-` followed by 64 lower-case hex digits of the file bytes. */
export const ADMIN_REVISION_PREFIX = "sha256-";

/** Largest request body of an admin write: 1 MB, answered with 413 beyond it. */
export const ADMIN_MAX_BODY_BYTES = 1_048_576;

/**
 * Statuses of the admin routes, in the order the api decides them. A request gets the first
 * status that applies.
 */
export const ADMIN_STATUS_ORDER = [
  { status: 404, meaning: "feature off" },
  { status: 401, meaning: "missing or wrong token" },
  { status: 403, meaning: "a valid probe token" },
  { status: 413, meaning: "body too large" },
  { status: 400, meaning: "bad JSON, bad If-Match (including *), or id mismatch" },
  { status: 428, meaning: "If-Match missing" },
  { status: 503, meaning: "checks file not writable" },
  { status: 412, meaning: "stale revision" },
  { status: 422, meaning: "schema or reference error" },
  { status: 409, meaning: "id exists, or still referenced" },
  { status: 404, meaning: "unknown id or index" },
] as const;

const REVISION = new RegExp(`^${ADMIN_REVISION_PREFIX}[0-9a-f]{64}$`);

/** Whether `value` is a revision in the unquoted form `sha256-<hex>`. */
export function isAdminRevision(value: unknown): value is string {
  return typeof value === "string" && REVISION.test(value);
}

const objectError = {
  error: (issue: { code: string; keys?: string[] }): string =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
      : "must be an object",
};

const revisionSchema = z
  .string({ error: "must be a string" })
  .regex(REVISION, { error: `must match ${REVISION.source}` });

const secretSchema = z
  .string({ error: "must be a non-empty string" })
  .min(1, "must be a non-empty string");

/** Strict object of a check shape without refinements. */
const strictView = <S extends z.ZodRawShape>(shape: S): z.ZodObject<S, z.core.$strict> =>
  z.strictObject(shape, objectError);

const { headers: _headers, body: _body, ...httpViewShape } = httpCheckSchema.shape;

const httpViewSchema = strictView({
  ...httpViewShape,
  /** Names of the configured request headers; never their values or `{ env }` references. */
  headers: z
    .array(z.string({ error: "must be a string" }), { error: "must be an array" })
    .optional(),
  /** True when the check has a request body; the body itself is never served. */
  hasBody: z.boolean({ error: "must be a boolean" }).optional(),
}).superRefine(refineHttpCheck);

const heartbeatViewSchema = strictView({
  ...heartbeatCheckSchema.shape,
  /** Always true: a heartbeat check has a secret, which is never served. */
  hasSecret: z.literal(true, { error: "must be true" }),
});

/** A check as the admin api serves it: no header values, no body, no secret. Strict. */
export const adminCheckViewSchema = z.union(
  [
    httpViewSchema,
    tlsCheckSchema.strict(),
    tcpCheckSchema.strict(),
    dnsCheckSchema.strict(),
    domainCheckSchema.strict(),
    heartbeatViewSchema,
  ],
  { error: "must be a check view" },
);

/** Strict schema of a check write body, per `type` (absent means `http`). Keeps every check refinement. */
export const adminCheckInputSchemas = {
  http: httpCheckSchema.strict(),
  tls: tlsCheckSchema.strict(),
  tcp: tcpCheckSchema.strict(),
  dns: dnsCheckSchema.strict(),
  domain: domainCheckSchema.strict(),
  /** `secret` is write-only: a `PUT` without it keeps the old one. */
  heartbeat: strictView({ ...heartbeatCheckSchema.shape, secret: secretSchema.optional() }),
} as const;

/**
 * Body of `POST /admin/checks` and `PUT /admin/checks/:id`: a `Check`, plus for a heartbeat check
 * a write-only `secret`. Strict: only the declared fields are allowed.
 */
export const adminCheckInputSchema = z.union(Object.values(adminCheckInputSchemas), {
  error: "must be a check",
});

/** A component as configured; the same shape in requests and responses. */
export const adminComponentSchema = componentSchema;
export const adminComponentInputSchema = componentSchema;

/** A maintenance window as written in a request. Strict. */
export const adminMaintenanceInputSchema = z
  .strictObject(maintenanceWindowSchema.shape, objectError)
  .refine((window) => window.end > window.start, {
    path: ["end"],
    error: "must be greater than start",
  });

/** A maintenance window as served: `index` is its position, the address of `/admin/maintenance/:index`. */
export const adminMaintenanceViewSchema = z
  .strictObject(
    {
      ...maintenanceWindowSchema.shape,
      index: z.int({ error: "must be an integer >= 0" }).min(0, "must be an integer >= 0"),
    },
    objectError,
  )
  .refine((window) => window.end > window.start, {
    path: ["end"],
    error: "must be greater than start",
  });

/** `GET /admin/config`: the whole configuration without secrets. */
export const adminConfigResponseSchema = z.strictObject(
  {
    /** `sha256-<hex>` of the raw file bytes; the `ETag` header carries it quoted. */
    revision: revisionSchema,
    checks: z.array(adminCheckViewSchema, { error: "must be an array" }),
    components: z.array(adminComponentSchema, { error: "must be an array" }),
    maintenance: z.array(adminMaintenanceViewSchema, { error: "must be an array" }),
  },
  objectError,
);

/** The schema of the optional write-only heartbeat secret; exported for the validators. */
export const adminSecretSchema = secretSchema;

export type AdminCheckView = z.infer<typeof adminCheckViewSchema>;
export type AdminComponent = z.infer<typeof adminComponentSchema>;
export type AdminComponentInput = z.infer<typeof adminComponentInputSchema>;
export type AdminMaintenanceInput = z.infer<typeof adminMaintenanceInputSchema>;
export type AdminMaintenanceView = z.infer<typeof adminMaintenanceViewSchema>;
export type AdminConfigResponse = z.infer<typeof adminConfigResponseSchema>;

export type AdminCheckInput = z.infer<typeof adminCheckInputSchema>;

/**
 * Body of a successful admin write: the redacted entity that was stored. `DELETE` answers 204
 * without a body. The new revision is in the `ETag` header.
 */
export type AdminWriteResponse = AdminCheckView | AdminComponent | AdminMaintenanceView;
