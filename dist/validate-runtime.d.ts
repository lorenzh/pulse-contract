import { type AdminNotifyChannelsView, type AdminNotifyFailedView, type NotifyChannelDefinition, type NotifyChannelRecord, type NotifyServiceReport, type ServiceNotifyChannelsEnvelope } from "./notify-channels.ts";
import { type ResendClaimResponse, type ResendCommand, type ResendRequest, type ResendResultInput } from "./resend.ts";
import { type AdminStatusSettingsView, type ServiceStatusSettings, type StatusServiceReport, type StatusSettings } from "./runtime-settings.ts";
import { type Validation } from "./validate-core.ts";
/** Validates status page settings, including the 65 536-byte document limit. */
export declare function validateStatusSettings(value: unknown, path?: string): Validation<StatusSettings>;
/** Validates `GET /service/status/settings`. */
export declare function validateServiceStatusSettings(value: unknown, path?: string): Validation<ServiceStatusSettings>;
/** Validates the body of `PUT /service/status/report`. */
export declare function validateStatusServiceReport(value: unknown, path?: string): Validation<StatusServiceReport>;
/** Validates `GET /admin/status/settings`. */
export declare function validateAdminStatusSettingsView(value: unknown, path?: string): Validation<AdminStatusSettingsView>;
/** Validates one database channel, including the 16 384-byte definition limit. */
export declare function validateNotifyChannelDefinition(value: unknown, path?: string): Validation<NotifyChannelDefinition>;
/**
 * Validates one element of a channels answer: a definition plus `createdAt` and `updatedAt`. The
 * byte limit is measured on the definition without the two timestamps.
 */
export declare function validateNotifyChannelRecord(value: unknown, path?: string): Validation<NotifyChannelRecord>;
/**
 * Validates only the envelope of `GET /service/notify/channels`: its keys, the revision, at most
 * 100 elements, and a valid, distinct own `id` per element. The rest of an element is checked
 * with `validateNotifyChannelRecord`; an answer is a `ServiceNotifyChannels` when both pass.
 */
export declare function validateServiceNotifyChannels(value: unknown, path?: string): Validation<ServiceNotifyChannelsEnvelope>;
/** Validates the body of `PUT /service/notify/report`. */
export declare function validateNotifyServiceReport(value: unknown, path?: string): Validation<NotifyServiceReport>;
/** Validates `GET /admin/notify/channels`. */
export declare function validateAdminNotifyChannelsView(value: unknown, path?: string): Validation<AdminNotifyChannelsView>;
/** Validates `GET /admin/notify/failed`. */
export declare function validateAdminNotifyFailedView(value: unknown, path?: string): Validation<AdminNotifyFailedView>;
/** Validates the body of `POST /admin/notify/resends`. */
export declare function validateResendRequest(value: unknown, path?: string): Validation<ResendRequest>;
/** Validates one resend command. */
export declare function validateResendCommand(value: unknown, path?: string): Validation<ResendCommand>;
/** Validates `POST /service/notify/resends/claim`. */
export declare function validateResendClaimResponse(value: unknown, path?: string): Validation<ResendClaimResponse>;
/** Validates a resend result. `queued` and `claimed` are refused. */
export declare function validateResendResultInput(value: unknown, path?: string): Validation<ResendResultInput>;
