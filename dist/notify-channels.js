import { z } from "zod";
import { addServiceStateIssues, epochMs, jsonByteLength, objectError, oneOf, revisionSchema, serviceStateNameSchema, } from "./runtime-settings.js";
/** Prefix of every env reference of a database channel. */
export const NOTIFY_SECRET_ENV_PREFIX = "PULSE_NOTIFY_SECRET_";
/** Most database channels. */
export const NOTIFY_CHANNEL_MAX = 100;
/**
 * Largest sum over all database channels of the UTF-8 bytes of `JSON.stringify(definition)`,
 * without `createdAt`, `updatedAt` and `source`. The api applies it on every write.
 */
export const NOTIFY_CHANNELS_MAX_BYTES = 262_144;
/** Largest channel definition: UTF-8 bytes of `JSON.stringify(definition)`. */
export const NOTIFY_CHANNEL_DEFINITION_MAX_BYTES = 16_384;
/** Most failed deliveries in a notify report. */
export const NOTIFY_FAILED_REPORT_MAX = 200;
/** Most file channels in a notify report. */
export const NOTIFY_FILE_CHANNEL_REPORT_MAX = 200;
/** Largest report body of a service: UTF-8 bytes of its JSON. */
export const SERVICE_REPORT_MAX_BYTES = 524_288;
/** A report older than this is stale. Exactly this age is still fresh. */
export const SERVICE_REPORT_STALE_MS = 180_000;
/** Events of a failed delivery. `unknown` is a payloadless entry whose key tells nothing. */
export const NOTIFY_FAILED_EVENTS = [
    "opened",
    "update",
    "resolved",
    "reminder",
    "budget-low",
    "tls-expiry",
    "domain-expiry",
    "unknown",
];
const CHANNEL_TYPES = ["webhook", "slack", "teams", "email"];
const FILE_VIEW_TYPES = ["webhook", "file", "slack", "teams", "email"];
const ALERT_EVENTS = ["budget-low", "tls-expiry", "domain-expiry"];
const SMTP_TLS = ["starttls", "tls", "none"];
const LIST_MAX = 200;
const TEXT_MAX = 200;
const URL_MAX = 2048;
const VIEW_TEXT_MAX = 200;
const REFS_MAX = 6;
const REASON_MAX = 300;
const KEY_MAX = 300;
const SHADOWED_MAX = 100;
const REJECTED_MAX = 100;
const CHANNEL_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ENV_REF = /^PULSE_NOTIFY_SECRET_[A-Z0-9_]{1,64}$/;
const FILE_REF = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ADDRESS = /^[^\s<>@]+@[^\s<>@]+$/;
const LINE_BREAK = /[\r\n]/;
function isHttpUrl(url) {
    try {
        const protocol = new URL(url).protocol;
        return protocol === "http:" || protocol === "https:";
    }
    catch {
        // An unparseable URL is not an http(s) URL.
        return false;
    }
}
export const channelIdSchema = z
    .string({ error: "must be a string" })
    .regex(CHANNEL_ID, { error: `must match ${CHANNEL_ID.source}` });
const text = z
    .string({ error: "must be a string" })
    .max(TEXT_MAX, `must be at most ${TEXT_MAX} characters`);
const singleLine = text.refine((v) => !LINE_BREAK.test(v), { error: "must be a single line" });
const list = (item) => z
    .array(item, { error: "must be an array" })
    .max(LIST_MAX, `must hold at most ${LIST_MAX} entries`);
const envRef = z
    .string({ error: "must be a string" })
    .regex(ENV_REF, { error: `must match ${ENV_REF.source}` });
const fileRef = z
    .string({ error: "must be a string" })
    .regex(FILE_REF, { error: `must match ${FILE_REF.source}` });
const address = singleLine.refine((v) => ADDRESS.test(envelopeAddress(v)), {
    error: "must hold an email address",
});
/** The address inside the last `<…>`, or the whole trimmed text. */
function envelopeAddress(value) {
    const open = value.lastIndexOf("<");
    const close = value.lastIndexOf(">");
    return open !== -1 && close > open ? value.slice(open + 1, close) : value.trim();
}
const flag = z.boolean({ error: "must be true or false" }).optional();
const routingShape = {
    id: channelIdSchema,
    checks: list(text).optional(),
    excludeChecks: list(text).optional(),
    components: list(text).optional(),
    excludeComponents: list(text).optional(),
    remindEverySeconds: z
        .int({ error: "must be an integer of at least 60" })
        .min(60, "must be an integer of at least 60")
        .max(Number.MAX_SAFE_INTEGER, "must be an integer of at least 60")
        .optional(),
    alerts: list(z.enum(ALERT_EVENTS, { error: oneOf(ALERT_EVENTS) })).optional(),
    sendIncidents: flag,
};
const messageShape = {
    statusUrl: z
        .string({ error: "must be a string" })
        .max(URL_MAX, `must be at most ${URL_MAX} characters`)
        .refine(isHttpUrl, { error: "must be a valid http(s) url" })
        .optional(),
    hideReason: flag,
};
const urlRefShape = { urlEnv: envRef.optional(), urlFile: fileRef.optional() };
const shapes = {
    webhook: {
        ...routingShape,
        type: z.literal("webhook"),
        ...urlRefShape,
        secretEnv: envRef.optional(),
        secretFile: fileRef.optional(),
    },
    slack: { ...routingShape, type: z.literal("slack"), ...urlRefShape, ...messageShape },
    teams: { ...routingShape, type: z.literal("teams"), ...urlRefShape, ...messageShape },
    email: {
        ...routingShape,
        type: z.literal("email"),
        smtp: z.strictObject({
            host: text.refine((v) => v !== "" && !/\s/.test(v), { error: "must be a host name" }),
            port: z
                .int({ error: "must be an integer from 1 to 65535" })
                .min(1, "must be an integer from 1 to 65535")
                .max(65_535, "must be an integer from 1 to 65535"),
            tls: z.enum(SMTP_TLS, { error: oneOf(SMTP_TLS) }).optional(),
            username: singleLine.min(1, "must not be empty").optional(),
            passwordEnv: envRef.optional(),
            passwordFile: fileRef.optional(),
            clientName: text
                .refine((v) => v !== "" && !/\s/.test(v), { error: "must be a host name" })
                .optional(),
        }, objectError),
        from: address,
        to: list(address).min(1, "must not be empty"),
        subjectPrefix: singleLine.optional(),
        ...messageShape,
    },
};
const timestamps = { createdAt: epochMs, updatedAt: epochMs };
const databaseSource = { source: z.literal("database", { error: 'must be "database"' }) };
/** The cross-field rules of a channel: one url reference, and no secret given twice. */
function addReferenceIssues(channel, ctx) {
    if (channel.type !== "email" &&
        (channel.urlEnv === undefined) === (channel.urlFile === undefined)) {
        ctx.addIssue({
            code: "custom",
            path: [],
            message: "needs exactly one of urlEnv, urlFile",
        });
    }
    if (channel.secretEnv !== undefined && channel.secretFile !== undefined) {
        ctx.addIssue({
            code: "custom",
            path: ["secretEnv"],
            message: "must not be set together with secretFile",
        });
    }
    if (channel.smtp?.passwordEnv !== undefined && channel.smtp.passwordFile !== undefined) {
        ctx.addIssue({
            code: "custom",
            path: ["smtp", "passwordEnv"],
            message: "must not be set together with passwordFile",
        });
    }
}
/** The definition part of a channel: every field except the timestamps and `source`. */
const NON_DEFINITION_KEYS = new Set(["createdAt", "updatedAt", "source"]);
function definitionOf(channel) {
    const definition = {};
    for (const [key, value] of Object.entries(channel)) {
        if (!NON_DEFINITION_KEYS.has(key)) {
            definition[key] = value;
        }
    }
    return definition;
}
function addSizeIssue(channel, ctx) {
    if (jsonByteLength(definitionOf(channel)) > NOTIFY_CHANNEL_DEFINITION_MAX_BYTES) {
        ctx.addIssue({
            code: "custom",
            message: `must be at most ${NOTIFY_CHANNEL_DEFINITION_MAX_BYTES} bytes as JSON`,
        });
    }
}
function unionMessage(code) {
    if (code === "invalid_union") {
        return oneOf(CHANNEL_TYPES);
    }
    return code === "invalid_type" ? "must be an object" : undefined;
}
const unionError = {
    error: (issue) => unionMessage(issue.code),
};
function addChannelIssues(channel, ctx) {
    addReferenceIssues(channel, ctx);
    addSizeIssue(channel, ctx);
}
export const notifyChannelDefinitionSchema = z
    .discriminatedUnion("type", [
    z.strictObject(shapes.webhook, objectError),
    z.strictObject(shapes.slack, objectError),
    z.strictObject(shapes.teams, objectError),
    z.strictObject(shapes.email, objectError),
], unionError)
    .superRefine(addChannelIssues);
export const notifyChannelRecordSchema = z
    .discriminatedUnion("type", [
    z.strictObject({ ...shapes.webhook, ...timestamps }, objectError),
    z.strictObject({ ...shapes.slack, ...timestamps }, objectError),
    z.strictObject({ ...shapes.teams, ...timestamps }, objectError),
    z.strictObject({ ...shapes.email, ...timestamps }, objectError),
], unionError)
    .superRefine(addChannelIssues);
export const notifyDatabaseChannelViewSchema = z
    .discriminatedUnion("type", [
    z.strictObject({ ...shapes.webhook, ...timestamps, ...databaseSource }, objectError),
    z.strictObject({ ...shapes.slack, ...timestamps, ...databaseSource }, objectError),
    z.strictObject({ ...shapes.teams, ...timestamps, ...databaseSource }, objectError),
    z.strictObject({ ...shapes.email, ...timestamps, ...databaseSource }, objectError),
], unionError)
    .superRefine(addChannelIssues);
const ownId = z.looseObject({ id: channelIdSchema }, objectError);
const envelopeChannels = z
    .array(ownId, { error: "must be an array" })
    .max(NOTIFY_CHANNEL_MAX, `must hold at most ${NOTIFY_CHANNEL_MAX} channels`)
    .superRefine((channels, ctx) => {
    const seen = new Set();
    channels.forEach((channel, i) => {
        if (seen.has(channel.id)) {
            ctx.addIssue({ code: "custom", path: [i, "id"], message: "must not repeat an id" });
        }
        seen.add(channel.id);
    });
});
export const serviceNotifyChannelsEnvelopeSchema = z.strictObject({ revision: revisionSchema, channels: envelopeChannels }, objectError);
const viewText = (max) => z
    .string({ error: "must be a string" })
    .min(1, `must be 1..${max} characters`)
    .max(max, `must be 1..${max} characters`);
export const notifyFileChannelViewSchema = z.strictObject({
    source: z.literal("file", { error: 'must be "file"' }),
    id: viewText(VIEW_TEXT_MAX),
    type: z.enum(FILE_VIEW_TYPES, { error: oneOf(FILE_VIEW_TYPES) }),
    refs: z
        .array(viewText(VIEW_TEXT_MAX), { error: "must be an array" })
        .max(REFS_MAX, `must hold at most ${REFS_MAX} entries`),
}, objectError);
export const notifyRejectedChannelSchema = z.strictObject({ channelId: viewText(VIEW_TEXT_MAX).nullable(), reason: viewText(REASON_MAX) }, objectError);
export const notifyFailedEventSchema = z.enum(NOTIFY_FAILED_EVENTS, {
    error: oneOf(NOTIFY_FAILED_EVENTS),
});
export const notifyFailedDeliverySchema = z.strictObject({
    channelId: viewText(VIEW_TEXT_MAX),
    key: viewText(KEY_MAX),
    event: notifyFailedEventSchema,
    isManual: z.boolean({ error: "must be true or false" }),
    failedAt: epochMs,
    hasPayload: z.boolean({ error: "must be true or false" }),
}, objectError);
const total = z
    .int({ error: "must be a non-negative integer" })
    .min(0, "must be a non-negative integer")
    .max(Number.MAX_SAFE_INTEGER, "must be a non-negative integer");
export const notifyServiceReportSchema = z
    .strictObject({
    at: epochMs,
    startedAt: epochMs,
    appliedRevision: revisionSchema.nullable(),
    fileChannels: z
        .array(notifyFileChannelViewSchema, { error: "must be an array" })
        .max(NOTIFY_FILE_CHANNEL_REPORT_MAX, `must hold at most ${NOTIFY_FILE_CHANNEL_REPORT_MAX} channels`),
    fileChannelsTotal: total,
    shadowedIds: z
        .array(channelIdSchema, { error: "must be an array" })
        .max(SHADOWED_MAX, `must hold at most ${SHADOWED_MAX} ids`),
    rejected: z
        .array(notifyRejectedChannelSchema, { error: "must be an array" })
        .max(REJECTED_MAX, `must hold at most ${REJECTED_MAX} entries`),
    failed: z
        .array(notifyFailedDeliverySchema, { error: "must be an array" })
        .max(NOTIFY_FAILED_REPORT_MAX, `must hold at most ${NOTIFY_FAILED_REPORT_MAX} entries`),
    failedTotal: total,
}, objectError)
    .superRefine((report, ctx) => {
    if (report.fileChannelsTotal < report.fileChannels.length) {
        ctx.addIssue({
            code: "custom",
            path: ["fileChannelsTotal"],
            message: "must be at least the number of fileChannels",
        });
    }
    if (report.failedTotal < report.failed.length) {
        ctx.addIssue({
            code: "custom",
            path: ["failedTotal"],
            message: "must be at least the number of failed entries",
        });
    }
});
export const notifyServiceStateSchema = z
    .strictObject({
    state: serviceStateNameSchema,
    receivedAt: epochMs.nullable(),
    report: notifyServiceReportSchema.nullable(),
}, objectError)
    .superRefine(addServiceStateIssues);
export const adminNotifyChannelsViewSchema = z.strictObject({
    revision: revisionSchema,
    channels: z.array(notifyDatabaseChannelViewSchema, { error: "must be an array" }),
    shadowed: z.array(notifyDatabaseChannelViewSchema, { error: "must be an array" }),
    service: notifyServiceStateSchema,
}, objectError);
const SERVICE_STATES = ["fresh", "stale", "never"];
export const adminNotifyFailedViewSchema = z
    .strictObject({
    state: z.enum(SERVICE_STATES, { error: oneOf(SERVICE_STATES) }),
    receivedAt: epochMs.nullable(),
    failed: z
        .array(notifyFailedDeliverySchema, { error: "must be an array" })
        .max(NOTIFY_FAILED_REPORT_MAX, `must hold at most ${NOTIFY_FAILED_REPORT_MAX} entries`),
    failedTotal: total,
}, objectError)
    .superRefine((view, ctx) => {
    if ((view.state === "never") !== (view.receivedAt === null)) {
        ctx.addIssue({
            code: "custom",
            path: ["receivedAt"],
            message: "must be null exactly when state is never",
        });
    }
    if (view.failedTotal < view.failed.length) {
        ctx.addIssue({
            code: "custom",
            path: ["failedTotal"],
            message: "must be at least the number of failed entries",
        });
    }
});
