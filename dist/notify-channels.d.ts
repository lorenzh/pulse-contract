import { z } from "zod";
/** Prefix of every env reference of a database channel. */
export declare const NOTIFY_SECRET_ENV_PREFIX = "PULSE_NOTIFY_SECRET_";
/** Most database channels. */
export declare const NOTIFY_CHANNEL_MAX = 100;
/**
 * Largest sum over all database channels of the UTF-8 bytes of `JSON.stringify(definition)`,
 * without `createdAt`, `updatedAt` and `source`. The api applies it on every write.
 */
export declare const NOTIFY_CHANNELS_MAX_BYTES = 262144;
/** Largest channel definition: UTF-8 bytes of `JSON.stringify(definition)`. */
export declare const NOTIFY_CHANNEL_DEFINITION_MAX_BYTES = 16384;
/** Most failed deliveries in a notify report. */
export declare const NOTIFY_FAILED_REPORT_MAX = 200;
/** Most file channels in a notify report. */
export declare const NOTIFY_FILE_CHANNEL_REPORT_MAX = 200;
/** Largest report body of a service: UTF-8 bytes of its JSON. */
export declare const SERVICE_REPORT_MAX_BYTES = 524288;
/** A report older than this is stale. Exactly this age is still fresh. */
export declare const SERVICE_REPORT_STALE_MS = 180000;
/** Events of a failed delivery. `unknown` is a payloadless entry whose key tells nothing. */
export declare const NOTIFY_FAILED_EVENTS: readonly ["opened", "update", "resolved", "reminder", "budget-low", "tls-expiry", "domain-expiry", "unknown"];
export declare const channelIdSchema: z.ZodString;
export declare const notifyChannelDefinitionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"webhook">;
    secretEnv: z.ZodOptional<z.ZodString>;
    secretFile: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"slack">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"teams">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"email">;
    smtp: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodInt;
        tls: z.ZodOptional<z.ZodEnum<{
            none: "none";
            starttls: "starttls";
            tls: "tls";
        }>>;
        username: z.ZodOptional<z.ZodString>;
        passwordEnv: z.ZodOptional<z.ZodString>;
        passwordFile: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    from: z.ZodString;
    to: z.ZodArray<z.ZodString>;
    subjectPrefix: z.ZodOptional<z.ZodString>;
}, z.core.$strict>], "type">;
/** A database channel. Secrets are references only, never values. */
export type NotifyChannelDefinition = z.infer<typeof notifyChannelDefinitionSchema>;
export declare const notifyChannelRecordSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"webhook">;
    secretEnv: z.ZodOptional<z.ZodString>;
    secretFile: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"slack">;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"teams">;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"email">;
    smtp: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodInt;
        tls: z.ZodOptional<z.ZodEnum<{
            none: "none";
            starttls: "starttls";
            tls: "tls";
        }>>;
        username: z.ZodOptional<z.ZodString>;
        passwordEnv: z.ZodOptional<z.ZodString>;
        passwordFile: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    from: z.ZodString;
    to: z.ZodArray<z.ZodString>;
    subjectPrefix: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
}, z.core.$strict>], "type">;
/** A database channel as the api stores it. */
export type NotifyChannelRecord = z.infer<typeof notifyChannelRecordSchema>;
export declare const notifyDatabaseChannelViewSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"webhook">;
    secretEnv: z.ZodOptional<z.ZodString>;
    secretFile: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
    source: z.ZodLiteral<"database">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"slack">;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
    source: z.ZodLiteral<"database">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    urlEnv: z.ZodOptional<z.ZodString>;
    urlFile: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<"teams">;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
    source: z.ZodLiteral<"database">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    components: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remindEverySeconds: z.ZodOptional<z.ZodInt>;
    alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        "tls-expiry": "tls-expiry";
    }>>>;
    sendIncidents: z.ZodOptional<z.ZodBoolean>;
    statusUrl: z.ZodOptional<z.ZodString>;
    hideReason: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodLiteral<"email">;
    smtp: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodInt;
        tls: z.ZodOptional<z.ZodEnum<{
            none: "none";
            starttls: "starttls";
            tls: "tls";
        }>>;
        username: z.ZodOptional<z.ZodString>;
        passwordEnv: z.ZodOptional<z.ZodString>;
        passwordFile: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    from: z.ZodString;
    to: z.ZodArray<z.ZodString>;
    subjectPrefix: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodInt;
    updatedAt: z.ZodInt;
    source: z.ZodLiteral<"database">;
}, z.core.$strict>], "type">;
/** A database channel in an admin view. */
export type NotifyDatabaseChannelView = z.infer<typeof notifyDatabaseChannelViewSchema>;
export declare const serviceNotifyChannelsEnvelopeSchema: z.ZodObject<{
    revision: z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>;
    channels: z.ZodArray<z.ZodUnknown>;
}, z.core.$strict>;
/** The envelope of `GET /service/notify/channels`: the elements are checked one by one. */
export type ServiceNotifyChannelsEnvelope = {
    revision: string;
    channels: ReadonlyArray<{
        id: string;
    } & Record<string, unknown>>;
};
/** Answer of `GET /service/notify/channels`: every database channel, in creation order. */
export type ServiceNotifyChannels = {
    revision: string;
    channels: NotifyChannelRecord[];
};
export declare const notifyFileChannelViewSchema: z.ZodObject<{
    source: z.ZodLiteral<"file">;
    id: z.ZodString;
    type: z.ZodEnum<{
        email: "email";
        file: "file";
        slack: "slack";
        teams: "teams";
        webhook: "webhook";
    }>;
    refs: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
/** A file channel in a notify report: reference names only, never values. */
export type NotifyFileChannelView = z.infer<typeof notifyFileChannelViewSchema>;
export declare const notifyRejectedChannelSchema: z.ZodObject<{
    channelId: z.ZodNullable<z.ZodString>;
    reason: z.ZodString;
}, z.core.$strict>;
/** A channel that notify did not install, or a whole answer it refused (`channelId: null`). */
export type NotifyRejectedChannel = z.infer<typeof notifyRejectedChannelSchema>;
export declare const notifyFailedEventSchema: z.ZodEnum<{
    "budget-low": "budget-low";
    "domain-expiry": "domain-expiry";
    opened: "opened";
    reminder: "reminder";
    resolved: "resolved";
    "tls-expiry": "tls-expiry";
    unknown: "unknown";
    update: "update";
}>;
/** The event of a failed delivery. */
export type NotifyFailedEvent = z.infer<typeof notifyFailedEventSchema>;
export declare const notifyFailedDeliverySchema: z.ZodObject<{
    channelId: z.ZodString;
    key: z.ZodString;
    event: z.ZodEnum<{
        "budget-low": "budget-low";
        "domain-expiry": "domain-expiry";
        opened: "opened";
        reminder: "reminder";
        resolved: "resolved";
        "tls-expiry": "tls-expiry";
        unknown: "unknown";
        update: "update";
    }>;
    isManual: z.ZodBoolean;
    failedAt: z.ZodInt;
    hasPayload: z.ZodBoolean;
}, z.core.$strict>;
/** A delivery that failed for good. It never carries a payload or a destination. */
export type NotifyFailedDelivery = z.infer<typeof notifyFailedDeliverySchema>;
export declare const notifyServiceReportSchema: z.ZodObject<{
    at: z.ZodInt;
    startedAt: z.ZodInt;
    appliedRevision: z.ZodNullable<z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>>;
    fileChannels: z.ZodArray<z.ZodObject<{
        source: z.ZodLiteral<"file">;
        id: z.ZodString;
        type: z.ZodEnum<{
            email: "email";
            file: "file";
            slack: "slack";
            teams: "teams";
            webhook: "webhook";
        }>;
        refs: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    fileChannelsTotal: z.ZodInt;
    shadowedIds: z.ZodArray<z.ZodString>;
    rejected: z.ZodArray<z.ZodObject<{
        channelId: z.ZodNullable<z.ZodString>;
        reason: z.ZodString;
    }, z.core.$strict>>;
    failed: z.ZodArray<z.ZodObject<{
        channelId: z.ZodString;
        key: z.ZodString;
        event: z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            opened: "opened";
            reminder: "reminder";
            resolved: "resolved";
            "tls-expiry": "tls-expiry";
            unknown: "unknown";
            update: "update";
        }>;
        isManual: z.ZodBoolean;
        failedAt: z.ZodInt;
        hasPayload: z.ZodBoolean;
    }, z.core.$strict>>;
    failedTotal: z.ZodInt;
}, z.core.$strict>;
/** Body of `PUT /service/notify/report`: what notify applied, and its failed deliveries. */
export type NotifyServiceReport = z.infer<typeof notifyServiceReportSchema>;
export declare const notifyServiceStateSchema: z.ZodObject<{
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
        fileChannels: z.ZodArray<z.ZodObject<{
            source: z.ZodLiteral<"file">;
            id: z.ZodString;
            type: z.ZodEnum<{
                email: "email";
                file: "file";
                slack: "slack";
                teams: "teams";
                webhook: "webhook";
            }>;
            refs: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        fileChannelsTotal: z.ZodInt;
        shadowedIds: z.ZodArray<z.ZodString>;
        rejected: z.ZodArray<z.ZodObject<{
            channelId: z.ZodNullable<z.ZodString>;
            reason: z.ZodString;
        }, z.core.$strict>>;
        failed: z.ZodArray<z.ZodObject<{
            channelId: z.ZodString;
            key: z.ZodString;
            event: z.ZodEnum<{
                "budget-low": "budget-low";
                "domain-expiry": "domain-expiry";
                opened: "opened";
                reminder: "reminder";
                resolved: "resolved";
                "tls-expiry": "tls-expiry";
                unknown: "unknown";
                update: "update";
            }>;
            isManual: z.ZodBoolean;
            failedAt: z.ZodInt;
            hasPayload: z.ZodBoolean;
        }, z.core.$strict>>;
        failedTotal: z.ZodInt;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** The last notify report as the api holds it. */
export type NotifyServiceState = z.infer<typeof notifyServiceStateSchema>;
export declare const adminNotifyChannelsViewSchema: z.ZodObject<{
    revision: z.ZodString & z.ZodType<string, string, z.core.$ZodTypeInternals<string, string>>;
    channels: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"webhook">;
        secretEnv: z.ZodOptional<z.ZodString>;
        secretFile: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"slack">;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"teams">;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"email">;
        smtp: z.ZodObject<{
            host: z.ZodString;
            port: z.ZodInt;
            tls: z.ZodOptional<z.ZodEnum<{
                none: "none";
                starttls: "starttls";
                tls: "tls";
            }>>;
            username: z.ZodOptional<z.ZodString>;
            passwordEnv: z.ZodOptional<z.ZodString>;
            passwordFile: z.ZodOptional<z.ZodString>;
            clientName: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        from: z.ZodString;
        to: z.ZodArray<z.ZodString>;
        subjectPrefix: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>], "type">>;
    shadowed: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"webhook">;
        secretEnv: z.ZodOptional<z.ZodString>;
        secretFile: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"slack">;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        urlEnv: z.ZodOptional<z.ZodString>;
        urlFile: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"teams">;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        checks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeChecks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        components: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludeComponents: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remindEverySeconds: z.ZodOptional<z.ZodInt>;
        alerts: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            "tls-expiry": "tls-expiry";
        }>>>;
        sendIncidents: z.ZodOptional<z.ZodBoolean>;
        statusUrl: z.ZodOptional<z.ZodString>;
        hideReason: z.ZodOptional<z.ZodBoolean>;
        type: z.ZodLiteral<"email">;
        smtp: z.ZodObject<{
            host: z.ZodString;
            port: z.ZodInt;
            tls: z.ZodOptional<z.ZodEnum<{
                none: "none";
                starttls: "starttls";
                tls: "tls";
            }>>;
            username: z.ZodOptional<z.ZodString>;
            passwordEnv: z.ZodOptional<z.ZodString>;
            passwordFile: z.ZodOptional<z.ZodString>;
            clientName: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        from: z.ZodString;
        to: z.ZodArray<z.ZodString>;
        subjectPrefix: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodInt;
        updatedAt: z.ZodInt;
        source: z.ZodLiteral<"database">;
    }, z.core.$strict>], "type">>;
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
            fileChannels: z.ZodArray<z.ZodObject<{
                source: z.ZodLiteral<"file">;
                id: z.ZodString;
                type: z.ZodEnum<{
                    email: "email";
                    file: "file";
                    slack: "slack";
                    teams: "teams";
                    webhook: "webhook";
                }>;
                refs: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
            fileChannelsTotal: z.ZodInt;
            shadowedIds: z.ZodArray<z.ZodString>;
            rejected: z.ZodArray<z.ZodObject<{
                channelId: z.ZodNullable<z.ZodString>;
                reason: z.ZodString;
            }, z.core.$strict>>;
            failed: z.ZodArray<z.ZodObject<{
                channelId: z.ZodString;
                key: z.ZodString;
                event: z.ZodEnum<{
                    "budget-low": "budget-low";
                    "domain-expiry": "domain-expiry";
                    opened: "opened";
                    reminder: "reminder";
                    resolved: "resolved";
                    "tls-expiry": "tls-expiry";
                    unknown: "unknown";
                    update: "update";
                }>;
                isManual: z.ZodBoolean;
                failedAt: z.ZodInt;
                hasPayload: z.ZodBoolean;
            }, z.core.$strict>>;
            failedTotal: z.ZodInt;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
/** `GET /admin/notify/channels`. File channels are only in `service.report.fileChannels`. */
export type AdminNotifyChannelsView = z.infer<typeof adminNotifyChannelsViewSchema>;
export declare const adminNotifyFailedViewSchema: z.ZodObject<{
    state: z.ZodEnum<{
        fresh: "fresh";
        never: "never";
        stale: "stale";
    }>;
    receivedAt: z.ZodNullable<z.ZodInt>;
    failed: z.ZodArray<z.ZodObject<{
        channelId: z.ZodString;
        key: z.ZodString;
        event: z.ZodEnum<{
            "budget-low": "budget-low";
            "domain-expiry": "domain-expiry";
            opened: "opened";
            reminder: "reminder";
            resolved: "resolved";
            "tls-expiry": "tls-expiry";
            unknown: "unknown";
            update: "update";
        }>;
        isManual: z.ZodBoolean;
        failedAt: z.ZodInt;
        hasPayload: z.ZodBoolean;
    }, z.core.$strict>>;
    failedTotal: z.ZodInt;
}, z.core.$strict>;
/** `GET /admin/notify/failed`: the failed list of the last report, without the rest of it. */
export type AdminNotifyFailedView = z.infer<typeof adminNotifyFailedViewSchema>;
