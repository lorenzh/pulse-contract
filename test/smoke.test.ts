import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "./types.fixture.ts";

const root = new URL("..", import.meta.url).pathname;

test("type fixtures are loadable", () => {
  assert.equal(fixture.checks.length, 2);
});

test("dist matches a fresh build of src", () => {
  const out = mkdtempSync(join(tmpdir(), "contract-dist-"));
  try {
    const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
    execFileSync(
      process.execPath,
      [tsc, "-p", join(root, "tsconfig.build.json"), "--outDir", out],
      { cwd: root },
    );
    for (const file of ["index", "schema", "validate", "version"].flatMap((n) => [
      `${n}.d.ts`,
      `${n}.js`,
    ])) {
      assert.equal(
        readFileSync(join(root, "dist", file), "utf8"),
        readFileSync(join(out, file), "utf8"),
        `dist/${file} is out of date; run bun run build`,
      );
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("package entry exports the validators and the wire version", async () => {
  const mod = await import("@lorenzh/pulse-contract");
  const byName = (a: string, b: string): number => a.localeCompare(b);
  assert.deepEqual(
    Object.keys(mod).sort(byName),
    [
      "DEFAULT_MAX_BODY_BYTES",
      "MANUAL_INCIDENT_IMPACTS",
      "MANUAL_INCIDENT_MAX_BODY_BYTES",
      "MANUAL_INCIDENT_MAX_COMPONENTS",
      "MANUAL_INCIDENT_MAX_UPDATES",
      "MANUAL_INCIDENT_MESSAGE_MAX",
      "MANUAL_INCIDENT_STATUSES",
      "MANUAL_INCIDENT_TITLE_MAX",
      "MAX_TIMER_MS",
      "MIN_DOMAIN_INTERVAL_MS",
      "WIRE_VERSION",
      "WIRE_VERSION_HEADER",
      "aggregateUptime",
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
      "getManualIncident",
      "getManualIncidents",
      "incidentImpactState",
      "validateCheck",
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
      "validateManualIncidentInput",
      "validateManualIncidentUpdateInput",
      "validateManualIncidentsResponse",
      "validatePostResultRequest",
      "validateResult",
      "validateResultsResponse",
      "validateUptimeResponse",
    ].sort(byName),
  );
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
