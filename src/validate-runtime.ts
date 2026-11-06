import {
  type AdminNotifyChannelsView,
  type AdminNotifyFailedView,
  adminNotifyChannelsViewSchema,
  adminNotifyFailedViewSchema,
  type NotifyChannelDefinition,
  type NotifyChannelRecord,
  type NotifyServiceReport,
  notifyChannelDefinitionSchema,
  notifyChannelRecordSchema,
  notifyServiceReportSchema,
  type ServiceNotifyChannelsEnvelope,
  serviceNotifyChannelsEnvelopeSchema,
} from "./notify-channels.ts";
import {
  type ResendClaimResponse,
  type ResendCommand,
  type ResendRequest,
  type ResendResultInput,
  resendClaimResponseSchema,
  resendCommandSchema,
  resendRequestSchema,
  resendResultInputSchema,
} from "./resend.ts";
import {
  type AdminStatusSettingsView,
  adminStatusSettingsViewSchema,
  type ServiceStatusSettings,
  type StatusServiceReport,
  type StatusSettings,
  serviceStatusSettingsSchema,
  statusServiceReportSchema,
  statusSettingsSchema,
} from "./runtime-settings.ts";
import { type Validation, validateWith } from "./validate-core.ts";

/** Validates status page settings, including the 65 536-byte document limit. */
export function validateStatusSettings(
  value: unknown,
  path = "settings",
): Validation<StatusSettings> {
  return validateWith(statusSettingsSchema, value, path);
}

/** Validates `GET /service/status/settings`. */
export function validateServiceStatusSettings(
  value: unknown,
  path = "settings answer",
): Validation<ServiceStatusSettings> {
  return validateWith(serviceStatusSettingsSchema, value, path);
}

/** Validates the body of `PUT /service/status/report`. */
export function validateStatusServiceReport(
  value: unknown,
  path = "report",
): Validation<StatusServiceReport> {
  return validateWith(statusServiceReportSchema, value, path);
}

/** Validates `GET /admin/status/settings`. */
export function validateAdminStatusSettingsView(
  value: unknown,
  path = "view",
): Validation<AdminStatusSettingsView> {
  return validateWith(adminStatusSettingsViewSchema, value, path);
}

/** Validates one database channel, including the 16 384-byte definition limit. */
export function validateNotifyChannelDefinition(
  value: unknown,
  path = "channel",
): Validation<NotifyChannelDefinition> {
  return validateWith(notifyChannelDefinitionSchema, value, path);
}

/**
 * Validates one element of a channels answer: a definition plus `createdAt` and `updatedAt`. The
 * byte limit is measured on the definition without the two timestamps.
 */
export function validateNotifyChannelRecord(
  value: unknown,
  path = "channel",
): Validation<NotifyChannelRecord> {
  return validateWith(notifyChannelRecordSchema, value, path);
}

/**
 * Validates only the envelope of `GET /service/notify/channels`: its keys, the revision, at most
 * 100 elements, and a valid, distinct own `id` per element. The rest of an element is checked
 * with `validateNotifyChannelRecord`; an answer is a `ServiceNotifyChannels` when both pass.
 */
export function validateServiceNotifyChannels(
  value: unknown,
  path = "channels answer",
): Validation<ServiceNotifyChannelsEnvelope> {
  return validateWith(serviceNotifyChannelsEnvelopeSchema, value, path);
}

/** Validates the body of `PUT /service/notify/report`. */
export function validateNotifyServiceReport(
  value: unknown,
  path = "report",
): Validation<NotifyServiceReport> {
  return validateWith(notifyServiceReportSchema, value, path);
}

/** Validates `GET /admin/notify/channels`. */
export function validateAdminNotifyChannelsView(
  value: unknown,
  path = "view",
): Validation<AdminNotifyChannelsView> {
  return validateWith(adminNotifyChannelsViewSchema, value, path);
}

/** Validates `GET /admin/notify/failed`. */
export function validateAdminNotifyFailedView(
  value: unknown,
  path = "view",
): Validation<AdminNotifyFailedView> {
  return validateWith(adminNotifyFailedViewSchema, value, path);
}

/** Validates the body of `POST /admin/notify/resends`. */
export function validateResendRequest(value: unknown, path = "resend"): Validation<ResendRequest> {
  return validateWith(resendRequestSchema, value, path);
}

/** Validates one resend command. */
export function validateResendCommand(value: unknown, path = "command"): Validation<ResendCommand> {
  return validateWith(resendCommandSchema, value, path);
}

/** Validates `POST /service/notify/resends/claim`. */
export function validateResendClaimResponse(
  value: unknown,
  path = "claim",
): Validation<ResendClaimResponse> {
  return validateWith(resendClaimResponseSchema, value, path);
}

/** Validates a resend result. `queued` and `claimed` are refused. */
export function validateResendResultInput(
  value: unknown,
  path = "result",
): Validation<ResendResultInput> {
  return validateWith(resendResultInputSchema, value, path);
}
