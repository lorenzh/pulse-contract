import { z } from "zod";
/** Actions an audit entry records, one per successful admin or token write. */
export declare const AUDIT_ACTIONS: readonly ["check.create", "check.replace", "check.delete", "component.create", "component.replace", "component.delete", "maintenance.create", "maintenance.replace", "maintenance.delete", "manual-incident.create", "manual-incident.update", "manual-incident.resolve", "manual-incident.delete", "manual-incident.edit", "manual-incident.draft-save", "manual-incident.draft-discard", "manual-incident.publish", "manual-incident.note-add", "manual-incident.note-delete", "token.create", "token.rotate", "token.revoke", "token.import"];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
/** Kinds of the object an audit entry names. */
export declare const AUDIT_TARGET_KINDS: readonly ["check", "component", "maintenance", "manual-incident", "token"];
export type AuditTargetKind = (typeof AUDIT_TARGET_KINDS)[number];
/** Page size of `GET /admin/audit` without `limit`. */
export declare const AUDIT_DEFAULT_LIMIT = 100;
/** Largest `limit` of `GET /admin/audit`. */
export declare const AUDIT_MAX_LIMIT = 1000;
/** Media type of `GET /admin/audit/export`: one JSON entry per line. */
export declare const AUDIT_EXPORT_CONTENT_TYPE = "application/x-ndjson";
export declare const auditEntrySchema: z.ZodObject<{
    id: z.ZodInt;
    at: z.ZodNumber;
    actor: z.ZodObject<{
        tokenId: z.ZodNullable<z.ZodString>;
        name: z.ZodString;
    }, z.core.$strict>;
    action: z.ZodEnum<{
        "check.create": "check.create";
        "check.delete": "check.delete";
        "check.replace": "check.replace";
        "component.create": "component.create";
        "component.delete": "component.delete";
        "component.replace": "component.replace";
        "maintenance.create": "maintenance.create";
        "maintenance.delete": "maintenance.delete";
        "maintenance.replace": "maintenance.replace";
        "manual-incident.create": "manual-incident.create";
        "manual-incident.delete": "manual-incident.delete";
        "manual-incident.draft-discard": "manual-incident.draft-discard";
        "manual-incident.draft-save": "manual-incident.draft-save";
        "manual-incident.edit": "manual-incident.edit";
        "manual-incident.note-add": "manual-incident.note-add";
        "manual-incident.note-delete": "manual-incident.note-delete";
        "manual-incident.publish": "manual-incident.publish";
        "manual-incident.resolve": "manual-incident.resolve";
        "manual-incident.update": "manual-incident.update";
        "token.create": "token.create";
        "token.import": "token.import";
        "token.revoke": "token.revoke";
        "token.rotate": "token.rotate";
    }>;
    target: z.ZodObject<{
        kind: z.ZodEnum<{
            check: "check";
            component: "component";
            maintenance: "maintenance";
            "manual-incident": "manual-incident";
            token: "token";
        }>;
        id: z.ZodString;
    }, z.core.$strict>;
    revision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
}, z.core.$strict>;
/** One audit entry. It stores no body, header, secret or URL. */
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export declare const auditPageSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodObject<{
        id: z.ZodInt;
        at: z.ZodNumber;
        actor: z.ZodObject<{
            tokenId: z.ZodNullable<z.ZodString>;
            name: z.ZodString;
        }, z.core.$strict>;
        action: z.ZodEnum<{
            "check.create": "check.create";
            "check.delete": "check.delete";
            "check.replace": "check.replace";
            "component.create": "component.create";
            "component.delete": "component.delete";
            "component.replace": "component.replace";
            "maintenance.create": "maintenance.create";
            "maintenance.delete": "maintenance.delete";
            "maintenance.replace": "maintenance.replace";
            "manual-incident.create": "manual-incident.create";
            "manual-incident.delete": "manual-incident.delete";
            "manual-incident.draft-discard": "manual-incident.draft-discard";
            "manual-incident.draft-save": "manual-incident.draft-save";
            "manual-incident.edit": "manual-incident.edit";
            "manual-incident.note-add": "manual-incident.note-add";
            "manual-incident.note-delete": "manual-incident.note-delete";
            "manual-incident.publish": "manual-incident.publish";
            "manual-incident.resolve": "manual-incident.resolve";
            "manual-incident.update": "manual-incident.update";
            "token.create": "token.create";
            "token.import": "token.import";
            "token.revoke": "token.revoke";
            "token.rotate": "token.rotate";
        }>;
        target: z.ZodObject<{
            kind: z.ZodEnum<{
                check: "check";
                component: "component";
                maintenance: "maintenance";
                "manual-incident": "manual-incident";
                token: "token";
            }>;
            id: z.ZodString;
        }, z.core.$strict>;
        revision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
    }, z.core.$strict>>;
    nextBefore: z.ZodNullable<z.ZodInt>;
}, z.core.$strict>;
/** `GET /admin/audit`: entries by id descending, and the cursor of the next page or null. */
export type AuditPage = z.infer<typeof auditPageSchema>;
