import { z } from "zod";
import { isAdminRevision } from "./revision.ts";
import { TOKEN_ID } from "./token-id.ts";

/** Actions an audit entry records, one per successful admin or token write. */
export const AUDIT_ACTIONS = [
  "check.create",
  "check.replace",
  "check.delete",
  "component.create",
  "component.replace",
  "component.delete",
  "maintenance.create",
  "maintenance.replace",
  "maintenance.delete",
  "manual-incident.create",
  "manual-incident.update",
  "manual-incident.resolve",
  "manual-incident.delete",
  "manual-incident.edit",
  "manual-incident.draft-save",
  "manual-incident.draft-discard",
  "manual-incident.publish",
  "manual-incident.note-add",
  "manual-incident.note-delete",
  "token.create",
  "token.rotate",
  "token.revoke",
  "token.import",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Kinds of the object an audit entry names. */
export const AUDIT_TARGET_KINDS = [
  "check",
  "component",
  "maintenance",
  "manual-incident",
  "token",
] as const;
export type AuditTargetKind = (typeof AUDIT_TARGET_KINDS)[number];

/** Page size of `GET /admin/audit` without `limit`. */
export const AUDIT_DEFAULT_LIMIT = 100;

/** Largest `limit` of `GET /admin/audit`. */
export const AUDIT_MAX_LIMIT = 1000;

/** Media type of `GET /admin/audit/export`: one JSON entry per line. */
export const AUDIT_EXPORT_CONTENT_TYPE = "application/x-ndjson";

const objectError = {
  error: (issue: { code: string; keys?: string[] }): string =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
      : "must be an object",
};

const positiveInt = z
  .int({ error: "must be a positive integer" })
  .min(1, "must be a positive integer")
  .max(Number.MAX_SAFE_INTEGER, "must be a positive integer");
const nonEmpty = z.string({ error: "must be a string" }).min(1, "must not be empty");
const oneOf = (values: readonly string[]): string =>
  `must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`;

/** The target kind that an action names: the text before its last dot. */
const kindOf = (action: AuditAction): string => action.slice(0, action.lastIndexOf("."));

export const auditEntrySchema = z
  .strictObject(
    {
      id: positiveInt,
      at: z.number({ error: "must be a finite number" }),
      actor: z.strictObject(
        {
          tokenId: z
            .string({ error: "must be a string or null" })
            .regex(TOKEN_ID, { error: `must match ${TOKEN_ID.source}` })
            .nullable(),
          name: nonEmpty,
        },
        objectError,
      ),
      action: z.enum(AUDIT_ACTIONS, { error: oneOf(AUDIT_ACTIONS) }),
      target: z.strictObject(
        {
          kind: z.enum(AUDIT_TARGET_KINDS, { error: oneOf(AUDIT_TARGET_KINDS) }),
          // No maximum, like check and component ids.
          id: nonEmpty,
        },
        objectError,
      ),
      revision: z
        .string({ error: "must be a string or null" })
        .refine(isAdminRevision, { error: "must be a revision sha256-<hex>" })
        .nullable(),
    },
    objectError,
  )
  .superRefine((entry, ctx) => {
    if (kindOf(entry.action) !== entry.target.kind) {
      ctx.addIssue({
        code: "custom",
        path: ["target", "kind"],
        message: "must match the action",
      });
    }
  });
/** One audit entry. It stores no body, header, secret or URL. */
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditPageSchema = z.strictObject(
  {
    entries: z.array(auditEntrySchema, { error: "must be an array" }),
    nextBefore: positiveInt.nullable(),
  },
  objectError,
);
/** `GET /admin/audit`: entries by id descending, and the cursor of the next page or null. */
export type AuditPage = z.infer<typeof auditPageSchema>;
