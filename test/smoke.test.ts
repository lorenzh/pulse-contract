import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, runtimeFixtures, tokenFixtures } from "./types.fixture.ts";

const root = new URL("..", import.meta.url).pathname;

test("type fixtures are loadable", () => {
  assert.equal(fixture.checks.length, 2);
});

test("dist matches a fresh build of src", () => {
  const out = mkdtempSync(join(tmpdir(), "contract-dist-"));
  try {
    const tsc = join(root, "node_modules", "typescript7", "bin", "tsc");
    execFileSync(
      process.execPath,
      [tsc, "-p", join(root, "tsconfig.build.json"), "--outDir", out],
      { cwd: root },
    );
    for (const file of [
      "admin",
      "audit",
      "index",
      "manual-incident-public",
      "notify-channels",
      "resend",
      "revision",
      "runtime-settings",
      "schema",
      "token-id",
      "tokens",
      "validate",
      "validate-admin",
      "validate-audit",
      "validate-core",
      "validate-runtime",
      "validate-tokens",
      "version",
    ].flatMap((n) => [`${n}.d.ts`, `${n}.js`])) {
      assert.equal(
        readFileSync(join(root, "dist", file), "utf8"),
        readFileSync(join(out, file), "utf8"),
        `dist/${file} is out of date; run bun run build`,
      );
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}, 30_000);

test("package entry exports the validators and the wire version", async () => {
  const mod = await import("@lorenzh/pulse-contract");
  const byName = (a: string, b: string): number => a.localeCompare(b);
  assert.deepEqual(
    Object.keys(mod).sort(byName),
    [
      "ADMIN_ETAG_HEADER",
      "ADMIN_IF_MATCH_HEADER",
      "HEADER_ENV_PREFIX",
      "ADMIN_MAX_BODY_BYTES",
      "ADMIN_REVISION_PREFIX",
      "ADMIN_STATUS_ORDER",
      "AUDIT_ACTIONS",
      "AUDIT_DEFAULT_LIMIT",
      "AUDIT_EXPORT_CONTENT_TYPE",
      "AUDIT_MAX_LIMIT",
      "AUDIT_TARGET_KINDS",
      "auditEntrySchema",
      "auditPageSchema",
      "validateAuditEntry",
      "validateAuditPage",
      "adminCheckInputSchema",
      "adminCheckViewSchema",
      "adminComponentInputSchema",
      "adminComponentSchema",
      "adminConfigResponseSchema",
      "adminMaintenanceInputSchema",
      "adminMaintenanceViewSchema",
      "adminMaintenanceWindowInputSchema",
      "adminMaintenanceWindowSchema",
      "adminMaintenanceListSchema",
      "ADMIN_MAINTENANCE_PHASES",
      "MAINTENANCE_WINDOW_ID",
      "MAX_MAINTENANCE_WINDOW_ID",
      "MAX_MAINTENANCE_CHECKS",
      "MAX_MAINTENANCE_NOTE",
      "MAX_MAINTENANCE_TIME",
      "ADMIN_CHECK_SOURCES",
      "adminCheckSourceSchema",
      "ADMIN_FILE_STATES",
      "adminFileStatusSchema",
      "adminKeepSchema",
      "adminExportRedactionSchema",
      "adminConfigExportSchema",
      "validateAdminConfigExport",
      "adminConfigSummarySchema",
      "validateAdminConfigSummary",
      "isAdminRevision",
      "validateAdminCheckInput",
      "validateAdminCheckView",
      "validateAdminComponent",
      "validateAdminComponentInput",
      "validateAdminConfigResponse",
      "validateAdminMaintenanceInput",
      "validateAdminMaintenanceView",
      "validateAdminMaintenanceWindowInput",
      "validateAdminMaintenanceWindow",
      "validateAdminMaintenanceList",
      "DEFAULT_MAX_BODY_BYTES",
      "MANUAL_INCIDENT_IMPACTS",
      "MANUAL_INCIDENT_MAX_BODY_BYTES",
      "MANUAL_INCIDENT_MAX_COMPONENTS",
      "MANUAL_INCIDENT_MAX_UPDATES",
      "MANUAL_INCIDENT_MESSAGE_MAX",
      "MANUAL_INCIDENT_STATUSES",
      "MANUAL_INCIDENT_TITLE_MAX",
      "MAX_REASON_LENGTH",
      "MAX_TIMER_MS",
      "MAX_WARN_DAYS",
      "MIN_DOMAIN_INTERVAL_MS",
      "WIRE_VERSION",
      "WIRE_VERSION_HEADER",
      "aggregateUptime",
      "availabilityTargetSchema",
      "checkLatencySchema",
      "latencyDaySchema",
      "sloSchema",
      "validateCheckLatency",
      "validateLatencyResponse",
      "validateSlo",
      "checkWireVersion",
      "combineStates",
      "dnsCheckSchema",
      "dnsRecordTypeSchema",
      "domainCheckSchema",
      "tcpCheckSchema",
      "expectedStatusSchema",
      "headerValueSchema",
      "httpMethodSchema",
      "jsonAssertSchema",
      "locationSchema",
      "fetchJson",
      "requestJson",
      "getManualIncident",
      "getManualIncidents",
      "incidentImpactState",
      "validateCheck",
      "validateCheckLocationUptime",
      "validateCheckUptime",
      "validateCheckWithState",
      "validateChecksResponse",
      "validateComponent",
      "validateComponentUptime",
      "validateComponentWithState",
      "validateComponentsResponse",
      "validateComponentsUptimeResponse",
      "validateIncident",
      "validateIncidentsResponse",
      "validateLocation",
      "validateLocationsResponse",
      "validateMaintenanceResponse",
      "validateMaintenanceWindow",
      "validateManualIncident",
      "validateManualIncidentDraftInput",
      "validateManualIncidentNoteInput",
      "validateInternalManualIncident",
      "validateInternalManualIncidentsResponse",
      "isPublicManualIncident",
      "publicManualIncident",
      "MANUAL_INCIDENT_VISIBILITIES",
      "MANUAL_INCIDENT_MAX_NOTES",
      "MANUAL_INCIDENT_MAX_DRAFTS",
      "manualIncidentVisibilitySchema",
      "manualIncidentDraftSchema",
      "manualIncidentNoteSchema",
      "internalManualIncidentSchema",
      "manualIncidentDraftInputSchema",
      "manualIncidentNoteInputSchema",
      "validateManualIncidentInput",
      "validateManualIncidentUpdateInput",
      "validateManualIncidentsResponse",
      "validatePostResultRequest",
      "validateResult",
      "validateResultsResponse",
      "validateUptimeResponse",
      "TOKEN_ID_PREFIX",
      "TOKEN_MAX_BODY_BYTES",
      "TOKEN_NAME_MAX",
      "TOKEN_ROTATION_OVERLAP_MS",
      "TOKEN_SCOPES",
      "TOKEN_SECRET_PREFIX",
      "tokenCreateInputSchema",
      "tokenMetadataSchema",
      "tokenScopeSchema",
      "tokenSecretResponseSchema",
      "tokensResponseSchema",
      "validateTokenCreateInput",
      "validateTokenMetadata",
      "validateTokenSecretResponse",
      "validateTokensResponse",
      "validateStatusSettings",
      "validateServiceStatusSettings",
      "validateStatusServiceReport",
      "validateAdminStatusSettingsView",
      "validateNotifyChannelDefinition",
      "validateNotifyChannelRecord",
      "validateServiceNotifyChannels",
      "validateNotifyServiceReport",
      "validateAdminNotifyChannelsView",
      "validateAdminNotifyFailedView",
      "validateResendRequest",
      "validateResendCommand",
      "validateResendClaimResponse",
      "validateResendResultInput",
      "STATUS_COLOR_KEYS",
      "STATUS_FONT_KEYS",
      "STATUS_RADIUS_KEYS",
      "STATUS_NAME_MAX",
      "STATUS_COMPONENT_ORDER_MAX",
      "NOTIFY_SECRET_ENV_PREFIX",
      "NOTIFY_CHANNEL_MAX",
      "NOTIFY_CHANNELS_MAX_BYTES",
      "NOTIFY_FAILED_REPORT_MAX",
      "NOTIFY_FILE_CHANNEL_REPORT_MAX",
      "SERVICE_REPORT_MAX_BYTES",
      "SERVICE_REPORT_STALE_MS",
      "RESEND_CLAIM_MAX",
      "RESEND_CLAIM_TIMEOUT_MS",
      "RESEND_COMMAND_MAX",
      "RESEND_COMMAND_STATES",
      "STATUS_RADIUS_MAX",
      "STATUS_SETTINGS_MAX_BYTES",
      "NOTIFY_CHANNEL_DEFINITION_MAX_BYTES",
      "RESEND_REQUEST_MAX",
      "RESEND_RETENTION_MS",
      "NOTIFY_FAILED_EVENTS",
    ].sort(byName),
  );
  assert.equal(mod.HEADER_ENV_PREFIX, "PULSE_HEADER_");
  assert.equal(mod.MAX_REASON_LENGTH, 1000);
  assert.equal(mod.MAX_WARN_DAYS, 3650);
  const runtimeConstants: Record<string, unknown> = {
    STATUS_NAME_MAX: 60,
    STATUS_COMPONENT_ORDER_MAX: 500,
    NOTIFY_SECRET_ENV_PREFIX: "PULSE_NOTIFY_SECRET_",
    NOTIFY_CHANNEL_MAX: 100,
    NOTIFY_CHANNELS_MAX_BYTES: 262144,
    NOTIFY_FAILED_REPORT_MAX: 200,
    NOTIFY_FILE_CHANNEL_REPORT_MAX: 200,
    SERVICE_REPORT_MAX_BYTES: 524288,
    SERVICE_REPORT_STALE_MS: 180000,
    RESEND_CLAIM_MAX: 20,
    RESEND_CLAIM_TIMEOUT_MS: 60000,
    RESEND_COMMAND_MAX: 1000,
    STATUS_RADIUS_MAX: 32,
    STATUS_SETTINGS_MAX_BYTES: 65536,
    NOTIFY_CHANNEL_DEFINITION_MAX_BYTES: 16384,
    RESEND_REQUEST_MAX: 10000,
    RESEND_RETENTION_MS: 604800000,
  };
  for (const [name, value] of Object.entries(runtimeConstants)) {
    assert.equal((mod as Record<string, unknown>)[name], value, name);
  }
  assert.deepEqual(mod.STATUS_FONT_KEYS, ["font-sans", "font-mono"]);
  assert.deepEqual(mod.STATUS_RADIUS_KEYS, ["radius-sm", "radius-md", "radius-pill"]);
});

test("fixture covers maintenance types", () => {
  assert.equal(fixture.maintenance.length, 1);
  assert.equal(fixture.checks[1]?.state, "maintenance");
  assert.equal(fixture.checks[1]?.maintenance, fixture.maintenance[0]);
});

test("fixture covers http and tls check variants", () => {
  const { httpCheck, tlsAsCheck, tlsWithState } = fixture.variants;
  assert.equal(httpCheck.type, "http");
  assert.equal(tlsAsCheck.type, "tls");
  assert.equal(tlsWithState.certDaysLeft, 5);
  assert.equal(fixture.checks[0]?.type, undefined);
});

test("fixture covers degraded and the latency objective", () => {
  const { withObjective, degradedResult, allStates } = fixture.variants;
  assert.equal(withObjective.latencyObjectiveMs, 500);
  assert.equal(degradedResult.status, "degraded");
  assert.deepEqual(
    allStates.map((c) => c.state),
    ["up", "degraded", "down", "unknown", "maintenance"],
  );
});

test("fixture covers retry fields and attempts", () => {
  assert.equal(fixture.variants.retryCheck.retries, 2);
  assert.equal(fixture.variants.retryCheck.retryDelayMs, 500);
  assert.equal(fixture.results[0]?.attempts, 1);
});

test("fixture covers uptime types", () => {
  const [first, second] = fixture.uptime;
  assert.equal(first?.days[0]?.uptime, null);
  assert.equal(first?.days[1]?.results, 500);
  assert.equal(first?.uptime, 98.4);
  assert.equal(second?.uptime, null);
});

test("fixture covers token types", () => {
  const { metadata, create, secret, list, scope } = tokenFixtures;
  assert.equal(metadata.id, "tok_0123456789abcdef01234567");
  assert.deepEqual(create.scopes, ["probe"]);
  assert.equal(secret.previousValidUntil, null);
  assert.equal(list.tokens.length, 1);
  assert.equal(scope, "admin");
});

test("fixture covers the runtime settings, channel and resend types", () => {
  const f = runtimeFixtures;
  assert.equal(f.statusView.service.state, "never");
  assert.equal(f.channels.channels[0]?.type, "webhook");
  assert.equal(f.envelope.channels[0]?.id, "a");
  assert.equal(f.notifyView.service.report?.failed[0]?.event, "update");
  assert.equal(f.failedView.failedTotal, 1);
  assert.equal(f.claim.commands[0]?.state, "claimed");
  assert.equal(f.result.state, "delivered");
  assert.equal(f.request.requestId, "req_0123456789abcd");
});
