import { z } from "zod";
/** The 20 colour keys of a status theme palette, in the order of status `theme-config.ts`. */
export declare const STATUS_COLOR_KEYS: readonly ["bg", "surface", "rule", "line-strong", "field-line", "text", "lead", "muted", "accent", "accent-text", "tint", "tint-line", "success", "success-tint", "warning", "warning-tint", "error", "error-tint", "info", "info-tint"];
/** The font keys of a status theme. */
export declare const STATUS_FONT_KEYS: readonly ["font-sans", "font-mono"];
/** The radius keys of a status theme. */
export declare const STATUS_RADIUS_KEYS: readonly ["radius-sm", "radius-md", "radius-pill"];
/** Longest status page name, in characters. */
export declare const STATUS_NAME_MAX = 60;
/** Most ids in `componentOrder`. */
export declare const STATUS_COMPONENT_ORDER_MAX = 500;
/** Longest radius value, in characters. */
export declare const STATUS_RADIUS_MAX = 32;
/** Largest `StatusSettings` document: UTF-8 bytes of `JSON.stringify(settings)`. */
export declare const STATUS_SETTINGS_MAX_BYTES = 65536;
/** UTF-8 bytes of `JSON.stringify(value)`: the measure of every byte limit of this contract. */
export declare function jsonByteLength(value: unknown): number;
export declare const objectError: {
    error: (issue: {
        code: string;
        keys?: string[];
    }) => string;
};
export declare const oneOf: (values: readonly string[]) => string;
/** Epoch milliseconds: a non-negative safe integer. */
export declare const epochMs: z.ZodInt;
export declare const revisionSchema: z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>;
export declare const statusThemeSchema: z.ZodObject<{
    light: z.ZodOptional<z.ZodObject<{
        accent: z.ZodOptional<z.ZodString>;
        "accent-text": z.ZodOptional<z.ZodString>;
        bg: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        "error-tint": z.ZodOptional<z.ZodString>;
        "field-line": z.ZodOptional<z.ZodString>;
        info: z.ZodOptional<z.ZodString>;
        "info-tint": z.ZodOptional<z.ZodString>;
        lead: z.ZodOptional<z.ZodString>;
        "line-strong": z.ZodOptional<z.ZodString>;
        muted: z.ZodOptional<z.ZodString>;
        rule: z.ZodOptional<z.ZodString>;
        success: z.ZodOptional<z.ZodString>;
        "success-tint": z.ZodOptional<z.ZodString>;
        surface: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        tint: z.ZodOptional<z.ZodString>;
        "tint-line": z.ZodOptional<z.ZodString>;
        warning: z.ZodOptional<z.ZodString>;
        "warning-tint": z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    dark: z.ZodOptional<z.ZodObject<{
        accent: z.ZodOptional<z.ZodString>;
        "accent-text": z.ZodOptional<z.ZodString>;
        bg: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
        "error-tint": z.ZodOptional<z.ZodString>;
        "field-line": z.ZodOptional<z.ZodString>;
        info: z.ZodOptional<z.ZodString>;
        "info-tint": z.ZodOptional<z.ZodString>;
        lead: z.ZodOptional<z.ZodString>;
        "line-strong": z.ZodOptional<z.ZodString>;
        muted: z.ZodOptional<z.ZodString>;
        rule: z.ZodOptional<z.ZodString>;
        success: z.ZodOptional<z.ZodString>;
        "success-tint": z.ZodOptional<z.ZodString>;
        surface: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        tint: z.ZodOptional<z.ZodString>;
        "tint-line": z.ZodOptional<z.ZodString>;
        warning: z.ZodOptional<z.ZodString>;
        "warning-tint": z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    "font-sans": z.ZodOptional<z.ZodString>;
    "font-mono": z.ZodOptional<z.ZodString>;
    "radius-sm": z.ZodOptional<z.ZodString>;
    "radius-md": z.ZodOptional<z.ZodString>;
    "radius-pill": z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Theme tokens of the status page. Every key is optional. */
export type StatusTheme = z.infer<typeof statusThemeSchema>;
export declare const statusSettingsSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    theme: z.ZodOptional<z.ZodObject<{
        light: z.ZodOptional<z.ZodObject<{
            accent: z.ZodOptional<z.ZodString>;
            "accent-text": z.ZodOptional<z.ZodString>;
            bg: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            "error-tint": z.ZodOptional<z.ZodString>;
            "field-line": z.ZodOptional<z.ZodString>;
            info: z.ZodOptional<z.ZodString>;
            "info-tint": z.ZodOptional<z.ZodString>;
            lead: z.ZodOptional<z.ZodString>;
            "line-strong": z.ZodOptional<z.ZodString>;
            muted: z.ZodOptional<z.ZodString>;
            rule: z.ZodOptional<z.ZodString>;
            success: z.ZodOptional<z.ZodString>;
            "success-tint": z.ZodOptional<z.ZodString>;
            surface: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            tint: z.ZodOptional<z.ZodString>;
            "tint-line": z.ZodOptional<z.ZodString>;
            warning: z.ZodOptional<z.ZodString>;
            "warning-tint": z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        dark: z.ZodOptional<z.ZodObject<{
            accent: z.ZodOptional<z.ZodString>;
            "accent-text": z.ZodOptional<z.ZodString>;
            bg: z.ZodOptional<z.ZodString>;
            error: z.ZodOptional<z.ZodString>;
            "error-tint": z.ZodOptional<z.ZodString>;
            "field-line": z.ZodOptional<z.ZodString>;
            info: z.ZodOptional<z.ZodString>;
            "info-tint": z.ZodOptional<z.ZodString>;
            lead: z.ZodOptional<z.ZodString>;
            "line-strong": z.ZodOptional<z.ZodString>;
            muted: z.ZodOptional<z.ZodString>;
            rule: z.ZodOptional<z.ZodString>;
            success: z.ZodOptional<z.ZodString>;
            "success-tint": z.ZodOptional<z.ZodString>;
            surface: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            tint: z.ZodOptional<z.ZodString>;
            "tint-line": z.ZodOptional<z.ZodString>;
            warning: z.ZodOptional<z.ZodString>;
            "warning-tint": z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        "font-sans": z.ZodOptional<z.ZodString>;
        "font-mono": z.ZodOptional<z.ZodString>;
        "radius-sm": z.ZodOptional<z.ZodString>;
        "radius-md": z.ZodOptional<z.ZodString>;
        "radius-pill": z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    componentOrder: z.ZodOptional<z.ZodArray<z.ZodString>>;
    showChecks: z.ZodOptional<z.ZodBoolean>;
    showLatency: z.ZodOptional<z.ZodBoolean>;
    showSlos: z.ZodOptional<z.ZodBoolean>;
    hideDetails: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
/** Status page settings as the console edits them. An absent field takes the default. */
export type StatusSettings = z.infer<typeof statusSettingsSchema>;
export declare const serviceStatusSettingsSchema: z.ZodObject<{
    revision: z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>;
    settings: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
        theme: z.ZodOptional<z.ZodObject<{
            light: z.ZodOptional<z.ZodObject<{
                accent: z.ZodOptional<z.ZodString>;
                "accent-text": z.ZodOptional<z.ZodString>;
                bg: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                "error-tint": z.ZodOptional<z.ZodString>;
                "field-line": z.ZodOptional<z.ZodString>;
                info: z.ZodOptional<z.ZodString>;
                "info-tint": z.ZodOptional<z.ZodString>;
                lead: z.ZodOptional<z.ZodString>;
                "line-strong": z.ZodOptional<z.ZodString>;
                muted: z.ZodOptional<z.ZodString>;
                rule: z.ZodOptional<z.ZodString>;
                success: z.ZodOptional<z.ZodString>;
                "success-tint": z.ZodOptional<z.ZodString>;
                surface: z.ZodOptional<z.ZodString>;
                text: z.ZodOptional<z.ZodString>;
                tint: z.ZodOptional<z.ZodString>;
                "tint-line": z.ZodOptional<z.ZodString>;
                warning: z.ZodOptional<z.ZodString>;
                "warning-tint": z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            dark: z.ZodOptional<z.ZodObject<{
                accent: z.ZodOptional<z.ZodString>;
                "accent-text": z.ZodOptional<z.ZodString>;
                bg: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                "error-tint": z.ZodOptional<z.ZodString>;
                "field-line": z.ZodOptional<z.ZodString>;
                info: z.ZodOptional<z.ZodString>;
                "info-tint": z.ZodOptional<z.ZodString>;
                lead: z.ZodOptional<z.ZodString>;
                "line-strong": z.ZodOptional<z.ZodString>;
                muted: z.ZodOptional<z.ZodString>;
                rule: z.ZodOptional<z.ZodString>;
                success: z.ZodOptional<z.ZodString>;
                "success-tint": z.ZodOptional<z.ZodString>;
                surface: z.ZodOptional<z.ZodString>;
                text: z.ZodOptional<z.ZodString>;
                tint: z.ZodOptional<z.ZodString>;
                "tint-line": z.ZodOptional<z.ZodString>;
                warning: z.ZodOptional<z.ZodString>;
                "warning-tint": z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            "font-sans": z.ZodOptional<z.ZodString>;
            "font-mono": z.ZodOptional<z.ZodString>;
            "radius-sm": z.ZodOptional<z.ZodString>;
            "radius-md": z.ZodOptional<z.ZodString>;
            "radius-pill": z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        componentOrder: z.ZodOptional<z.ZodArray<z.ZodString>>;
        showChecks: z.ZodOptional<z.ZodBoolean>;
        showLatency: z.ZodOptional<z.ZodBoolean>;
        showSlos: z.ZodOptional<z.ZodBoolean>;
        hideDetails: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>;
}, z.core.$strict>;
/** Answer of `GET /service/status/settings`. */
export type ServiceStatusSettings = z.infer<typeof serviceStatusSettingsSchema>;
export declare const statusLockedFieldSchema: z.ZodObject<{
    field: z.ZodString;
    source: z.ZodEnum<{
        env: "env";
        file: "file";
    }>;
    via: z.ZodString;
    value: z.ZodOptional<z.ZodJSONSchema>;
}, z.core.$strict>;
/** A setting that a local value holds, so the database value has no effect. */
export type StatusLockedField = z.infer<typeof statusLockedFieldSchema>;
export declare const statusServiceReportSchema: z.ZodObject<{
    at: z.ZodInt;
    startedAt: z.ZodInt;
    appliedRevision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
    rejected: z.ZodNullable<z.ZodObject<{
        source: z.ZodEnum<{
            database: "database";
            file: "file";
        }>;
        reason: z.ZodString;
    }, z.core.$strict>>;
    locked: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        source: z.ZodEnum<{
            env: "env";
            file: "file";
        }>;
        via: z.ZodString;
        value: z.ZodOptional<z.ZodJSONSchema>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Body of `PUT /service/status/report`: what status applied. */
export type StatusServiceReport = z.infer<typeof statusServiceReportSchema>;
export declare const serviceStateNameSchema: z.ZodEnum<{
    fresh: "fresh";
    never: "never";
    stale: "stale";
}>;
/** `never` has no time and no report; `fresh` and `stale` have both. */
export declare function addServiceStateIssues(service: {
    state: string;
    receivedAt: number | null;
    report: unknown;
}, ctx: z.RefinementCtx): void;
export declare const statusServiceStateSchema: z.ZodObject<{
    state: z.ZodEnum<{
        fresh: "fresh";
        never: "never";
        stale: "stale";
    }>;
    receivedAt: z.ZodNullable<z.ZodInt>;
    report: z.ZodNullable<z.ZodObject<{
        at: z.ZodInt;
        startedAt: z.ZodInt;
        appliedRevision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
        rejected: z.ZodNullable<z.ZodObject<{
            source: z.ZodEnum<{
                database: "database";
                file: "file";
            }>;
            reason: z.ZodString;
        }, z.core.$strict>>;
        locked: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            source: z.ZodEnum<{
                env: "env";
                file: "file";
            }>;
            via: z.ZodString;
            value: z.ZodOptional<z.ZodJSONSchema>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** The last status report as the api holds it. */
export type StatusServiceState = z.infer<typeof statusServiceStateSchema>;
export declare const adminStatusSettingsViewSchema: z.ZodObject<{
    revision: z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>;
    settings: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
        theme: z.ZodOptional<z.ZodObject<{
            light: z.ZodOptional<z.ZodObject<{
                accent: z.ZodOptional<z.ZodString>;
                "accent-text": z.ZodOptional<z.ZodString>;
                bg: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                "error-tint": z.ZodOptional<z.ZodString>;
                "field-line": z.ZodOptional<z.ZodString>;
                info: z.ZodOptional<z.ZodString>;
                "info-tint": z.ZodOptional<z.ZodString>;
                lead: z.ZodOptional<z.ZodString>;
                "line-strong": z.ZodOptional<z.ZodString>;
                muted: z.ZodOptional<z.ZodString>;
                rule: z.ZodOptional<z.ZodString>;
                success: z.ZodOptional<z.ZodString>;
                "success-tint": z.ZodOptional<z.ZodString>;
                surface: z.ZodOptional<z.ZodString>;
                text: z.ZodOptional<z.ZodString>;
                tint: z.ZodOptional<z.ZodString>;
                "tint-line": z.ZodOptional<z.ZodString>;
                warning: z.ZodOptional<z.ZodString>;
                "warning-tint": z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            dark: z.ZodOptional<z.ZodObject<{
                accent: z.ZodOptional<z.ZodString>;
                "accent-text": z.ZodOptional<z.ZodString>;
                bg: z.ZodOptional<z.ZodString>;
                error: z.ZodOptional<z.ZodString>;
                "error-tint": z.ZodOptional<z.ZodString>;
                "field-line": z.ZodOptional<z.ZodString>;
                info: z.ZodOptional<z.ZodString>;
                "info-tint": z.ZodOptional<z.ZodString>;
                lead: z.ZodOptional<z.ZodString>;
                "line-strong": z.ZodOptional<z.ZodString>;
                muted: z.ZodOptional<z.ZodString>;
                rule: z.ZodOptional<z.ZodString>;
                success: z.ZodOptional<z.ZodString>;
                "success-tint": z.ZodOptional<z.ZodString>;
                surface: z.ZodOptional<z.ZodString>;
                text: z.ZodOptional<z.ZodString>;
                tint: z.ZodOptional<z.ZodString>;
                "tint-line": z.ZodOptional<z.ZodString>;
                warning: z.ZodOptional<z.ZodString>;
                "warning-tint": z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            "font-sans": z.ZodOptional<z.ZodString>;
            "font-mono": z.ZodOptional<z.ZodString>;
            "radius-sm": z.ZodOptional<z.ZodString>;
            "radius-md": z.ZodOptional<z.ZodString>;
            "radius-pill": z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        componentOrder: z.ZodOptional<z.ZodArray<z.ZodString>>;
        showChecks: z.ZodOptional<z.ZodBoolean>;
        showLatency: z.ZodOptional<z.ZodBoolean>;
        showSlos: z.ZodOptional<z.ZodBoolean>;
        hideDetails: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>;
    service: z.ZodObject<{
        state: z.ZodEnum<{
            fresh: "fresh";
            never: "never";
            stale: "stale";
        }>;
        receivedAt: z.ZodNullable<z.ZodInt>;
        report: z.ZodNullable<z.ZodObject<{
            at: z.ZodInt;
            startedAt: z.ZodInt;
            appliedRevision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
            rejected: z.ZodNullable<z.ZodObject<{
                source: z.ZodEnum<{
                    database: "database";
                    file: "file";
                }>;
                reason: z.ZodString;
            }, z.core.$strict>>;
            locked: z.ZodArray<z.ZodObject<{
                field: z.ZodString;
                source: z.ZodEnum<{
                    env: "env";
                    file: "file";
                }>;
                via: z.ZodString;
                value: z.ZodOptional<z.ZodJSONSchema>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
/** `GET /admin/status/settings`. */
export type AdminStatusSettingsView = z.infer<typeof adminStatusSettingsViewSchema>;
