import { z } from "zod";
import { ADMIN_REVISION } from "./revision.ts";
import {
  componentSchema,
  dnsCheckSchema,
  domainCheckSchema,
  headerValueSchema,
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

/** Largest request body of an admin write: 1 MB, answered with 413 beyond it. */
export const ADMIN_MAX_BODY_BYTES = 1_048_576;

/**
 * Statuses of the admin routes, in the order the api decides them. A request gets the first
 * status that applies.
 */
export const ADMIN_STATUS_ORDER = [
  { status: 404, meaning: "feature off" },
  { status: 401, meaning: "missing, unknown, expired, revoked or retired token" },
  { status: 403, meaning: "a valid token without the needed scope" },
  { status: 413, meaning: "body too large" },
  { status: 400, meaning: "bad JSON, bad If-Match (including *), or id mismatch" },
  { status: 428, meaning: "If-Match missing" },
  { status: 503, meaning: "checks file not writable (component and maintenance writes)" },
  { status: 412, meaning: "stale revision" },
  { status: 422, meaning: "schema or reference error" },
  {
    status: 409,
    meaning: "id exists, still referenced, a file check, or a shadowed database check",
  },
  { status: 404, meaning: "unknown id or index" },
] as const;

const objectError = {
  error: (issue: { code: string; keys?: string[] }): string =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
      : "must be an object",
};

const revisionSchema = z
  .string({ error: "must be a string" })
  .regex(ADMIN_REVISION, { error: `must match ${ADMIN_REVISION.source}` });

const secretSchema = z
  .string({ error: "must be a non-empty string" })
  .min(1, "must be a non-empty string");

/** Strict object of a check shape without refinements. */
const strictView = <S extends z.ZodRawShape>(shape: S): z.ZodObject<S, z.core.$strict> =>
  z.strictObject(shape, objectError);

/** Where a check comes from: the applied checks file or the database. */
export const ADMIN_CHECK_SOURCES = ["file", "database"] as const;
export const adminCheckSourceSchema = z.enum(ADMIN_CHECK_SOURCES, {
  error: 'must be "file" or "database"',
});

/** Stands for a stored write-only value (a literal header value or a body). Exactly `{ keep: true }`. */
export const adminKeepSchema = z.strictObject(
  { keep: z.literal(true, { error: "must be true" }) },
  objectError,
);

const isKeep = (value: unknown): boolean =>
  typeof value === "object" && value !== null && Object.hasOwn(value, "keep");

const { headers: checkHeaders, body: checkBody, ...httpViewShape } = httpCheckSchema.shape;
const headerRules = checkHeaders.unwrap();
const [literalHeaderSchema, envHeaderSchema] = headerValueSchema.options;
const envRefSchema = envHeaderSchema.strict();

/**
 * Headers with the check's header rules (count, names, 16 KiB total). A keep marker counts as
 * 0 literal bytes, so it stands in as an empty string for the shared rules.
 */
const headersWith = <V extends z.ZodType>(valueSchema: V) =>
  z.record(z.string(), valueSchema, { error: "must be an object" }).superRefine((headers, ctx) => {
    const literal: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(headers)) {
      Object.defineProperty(literal, name, {
        value: isKeep(value) ? "" : value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    const parsed = headerRules.safeParse(literal);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
    }
  });

const keepOrEnv = z.union([envRefSchema, adminKeepSchema], {
  error: "must be an object {env: NAME} or {keep: true}",
});
const inputHeaderValue = z.union([literalHeaderSchema, envRefSchema, adminKeepSchema], {
  error: "must be a string, an object {env: NAME} or {keep: true}",
});

const viewSource = { source: adminCheckSourceSchema };
const inputSource = {
  source: z.literal("database", { error: 'must be "database"' }).optional(),
};

const httpViewSchema = strictView({
  ...httpViewShape,
  ...viewSource,
  /** `{ env }` references as stored; a literal value is served as `{ keep: true }`. */
  headers: headersWith(keepOrEnv).optional(),
  /** `{ keep: true }` when the check has a request body; the body itself is never served. */
  body: adminKeepSchema.optional(),
}).superRefine(refineHttpCheck);

const heartbeatViewSchema = strictView({
  ...heartbeatCheckSchema.shape,
  ...viewSource,
  /** Always true: a heartbeat check has a secret, which is never served. */
  hasSecret: z.literal(true, { error: "must be true" }),
});

/**
 * A check as the admin api serves it: `source`, `{ env }` references and keep markers, never a
 * literal header value, body or secret. Strict.
 */
export const adminCheckViewSchema = z.union(
  [
    httpViewSchema,
    tlsCheckSchema.safeExtend(viewSource).strict(),
    tcpCheckSchema.safeExtend(viewSource).strict(),
    dnsCheckSchema.safeExtend(viewSource).strict(),
    domainCheckSchema.safeExtend(viewSource).strict(),
    heartbeatViewSchema,
  ],
  { error: "must be a check view" },
);

/**
 * Strict schema of a check write body, per `type` (absent means `http`). Keeps every check
 * refinement. The view of a database check passes unchanged.
 */
export const adminCheckInputSchemas = {
  http: strictView({
    ...httpViewShape,
    ...inputSource,
    headers: headersWith(inputHeaderValue).optional(),
    body: z
      .union([checkBody.unwrap(), adminKeepSchema], { error: "must be a string or {keep: true}" })
      .optional(),
  }).superRefine(refineHttpCheck),
  tls: tlsCheckSchema.safeExtend(inputSource).strict(),
  tcp: tcpCheckSchema.safeExtend(inputSource).strict(),
  dns: dnsCheckSchema.safeExtend(inputSource).strict(),
  domain: domainCheckSchema.safeExtend(inputSource).strict(),
  /** `secret` is write-only: a `PUT` without it keeps the old one. */
  heartbeat: strictView({
    ...heartbeatCheckSchema.shape,
    ...inputSource,
    secret: secretSchema.optional(),
    hasSecret: z.literal(true, { error: "must be true" }).optional(),
  }),
} as const;

/**
 * Body of `POST /admin/checks` and `PUT /admin/checks/:id`: a `Check` with keep markers, plus
 * for a heartbeat check a write-only `secret`. Strict: only the declared fields are allowed.
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

/** States of the checks file, as the last read or apply left it. */
export const ADMIN_FILE_STATES = ["ok", "invalid", "unreadable", "written-not-applied"] as const;

/** State of the checks file. `message` is `null` exactly when `state` is `ok`; it never quotes a value. */
export const adminFileStatusSchema = z
  .strictObject(
    {
      state: z.enum(ADMIN_FILE_STATES, {
        error: 'must be "ok", "invalid", "unreadable" or "written-not-applied"',
      }),
      message: z.string({ error: "must be a string or null" }).nullable(),
      /** Epoch ms of the last successful file apply; a database write never moves it. */
      lastAppliedAt: z.int({ error: "must be an integer >= 0" }).min(0, "must be an integer >= 0"),
    },
    objectError,
  )
  .refine((file) => (file.state === "ok") === (file.message === null), {
    path: ["message"],
    error: "must be null exactly when state is ok",
  });

/** `GET /admin/config`: the whole configuration without secrets. */
export const adminConfigResponseSchema = z.strictObject(
  {
    /**
     * `sha256-<hex>` of the applied configuration (file and database); the `ETag` header carries
     * it quoted.
     */
    revision: revisionSchema,
    /** The effective checks: file checks, then database checks that no file check shadows. */
    checks: z.array(adminCheckViewSchema, { error: "must be an array" }),
    /** Database checks that a file check with the same id shadows, in creation order. */
    shadowed: z.array(adminCheckViewSchema, { error: "must be an array" }),
    components: z.array(adminComponentSchema, { error: "must be an array" }),
    maintenance: z.array(adminMaintenanceViewSchema, { error: "must be an array" }),
    file: adminFileStatusSchema,
  },
  objectError,
);

const checkIdSchema = httpCheckSchema.shape.id;

/**
 * What a client that only counts checks reads from `GET /admin/config`: `revision` and the check
 * ids. Other keys are ignored, so the answers of the 1.x and 2.0.0 api both pass.
 */
export const adminConfigSummarySchema = z.object(
  {
    revision: revisionSchema,
    checks: z.array(z.object({ id: checkIdSchema }, objectError), { error: "must be an array" }),
  },
  objectError,
);

/** A value left out of the export: `body`, `secret` or `headers.<name>` of check `checkId`. */
export const adminExportRedactionSchema = z.strictObject(
  {
    checkId: checkIdSchema,
    field: z.string({ error: "must be a string" }).regex(/^(body|secret|headers\..+)$/, {
      error: 'must be "body", "secret" or "headers.<name>"',
    }),
  },
  objectError,
);

/** A maintenance window as the checks file writes it: ISO 8601 times with an offset. */
const exportMaintenanceSchema = z.strictObject(
  {
    checkId: checkIdSchema,
    start: z.iso.datetime({ offset: true, error: "must be an ISO 8601 time with offset" }),
    end: z.iso.datetime({ offset: true, error: "must be an ISO 8601 time with offset" }),
    note: maintenanceWindowSchema.shape.note,
  },
  objectError,
);

const exportCheckSchema = z.union(
  [
    httpCheckSchema.strict(),
    tlsCheckSchema.strict(),
    tcpCheckSchema.strict(),
    dnsCheckSchema.strict(),
    domainCheckSchema.strict(),
    heartbeatCheckSchema.strict(),
  ],
  { error: "must be a check" },
);

/**
 * `GET /admin/config/export`: the effective checks as a checks file. Literal header values,
 * bodies and heartbeat secrets are left out and listed in `redacted`, which is absent when
 * nothing was left out. A document with `redacted` does not load as a checks file.
 */
export const adminConfigExportSchema = z.strictObject(
  {
    checks: z.array(exportCheckSchema, { error: "must be an array" }),
    components: z.array(componentSchema, { error: "must be an array" }),
    maintenance: z.array(exportMaintenanceSchema, { error: "must be an array" }),
    redacted: z
      .array(adminExportRedactionSchema, { error: "must be an array" })
      .min(1, "must not be empty")
      .optional(),
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
export type AdminCheckSource = z.infer<typeof adminCheckSourceSchema>;
export type AdminKeep = z.infer<typeof adminKeepSchema>;
export type AdminFileStatus = z.infer<typeof adminFileStatusSchema>;
export type AdminConfigSummary = z.infer<typeof adminConfigSummarySchema>;
export type AdminExportRedaction = z.infer<typeof adminExportRedactionSchema>;
export type AdminConfigExport = z.infer<typeof adminConfigExportSchema>;

/**
 * Body of a successful admin write: the redacted entity that was stored. `DELETE` answers 204
 * without a body. The new revision is in the `ETag` header.
 */
export type AdminWriteResponse = AdminCheckView | AdminComponent | AdminMaintenanceView;
