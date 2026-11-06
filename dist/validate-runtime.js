import { adminNotifyChannelsViewSchema, adminNotifyFailedViewSchema, notifyChannelDefinitionSchema, notifyChannelRecordSchema, notifyServiceReportSchema, serviceNotifyChannelsEnvelopeSchema, } from "./notify-channels.js";
import { resendClaimResponseSchema, resendCommandSchema, resendRequestSchema, resendResultInputSchema, } from "./resend.js";
import { adminStatusSettingsViewSchema, serviceStatusSettingsSchema, statusServiceReportSchema, statusSettingsSchema, } from "./runtime-settings.js";
import { validateWith } from "./validate-core.js";
/** Validates status page settings, including the 65 536-byte document limit. */
export function validateStatusSettings(value, path = "settings") {
    return validateWith(statusSettingsSchema, value, path);
}
/** Validates `GET /service/status/settings`. */
export function validateServiceStatusSettings(value, path = "settings answer") {
    return validateWith(serviceStatusSettingsSchema, value, path);
}
/** Validates the body of `PUT /service/status/report`. */
export function validateStatusServiceReport(value, path = "report") {
    return validateWith(statusServiceReportSchema, value, path);
}
/** Validates `GET /admin/status/settings`. */
export function validateAdminStatusSettingsView(value, path = "view") {
    return validateWith(adminStatusSettingsViewSchema, value, path);
}
/** Validates one database channel, including the 16 384-byte definition limit. */
export function validateNotifyChannelDefinition(value, path = "channel") {
    return validateWith(notifyChannelDefinitionSchema, value, path);
}
/**
 * Validates one element of a channels answer: a definition plus `createdAt` and `updatedAt`. The
 * byte limit is measured on the definition without the two timestamps.
 */
export function validateNotifyChannelRecord(value, path = "channel") {
    return validateWith(notifyChannelRecordSchema, value, path);
}
/**
 * Validates only the envelope of `GET /service/notify/channels`: its keys, the revision, at most
 * 100 elements, and a valid, distinct own `id` per element. The rest of an element is checked
 * with `validateNotifyChannelRecord`; an answer is a `ServiceNotifyChannels` when both pass.
 */
export function validateServiceNotifyChannels(value, path = "channels answer") {
    return validateWith(serviceNotifyChannelsEnvelopeSchema, value, path);
}
/** Validates the body of `PUT /service/notify/report`. */
export function validateNotifyServiceReport(value, path = "report") {
    return validateWith(notifyServiceReportSchema, value, path);
}
/** Validates `GET /admin/notify/channels`. */
export function validateAdminNotifyChannelsView(value, path = "view") {
    return validateWith(adminNotifyChannelsViewSchema, value, path);
}
/** Validates `GET /admin/notify/failed`. */
export function validateAdminNotifyFailedView(value, path = "view") {
    return validateWith(adminNotifyFailedViewSchema, value, path);
}
/** Validates the body of `POST /admin/notify/resends`. */
export function validateResendRequest(value, path = "resend") {
    return validateWith(resendRequestSchema, value, path);
}
/** Validates one resend command. */
export function validateResendCommand(value, path = "command") {
    return validateWith(resendCommandSchema, value, path);
}
/** Validates `POST /service/notify/resends/claim`. */
export function validateResendClaimResponse(value, path = "claim") {
    return validateWith(resendClaimResponseSchema, value, path);
}
/** Validates a resend result. `queued` and `claimed` are refused. */
export function validateResendResultInput(value, path = "result") {
    return validateWith(resendResultInputSchema, value, path);
}
