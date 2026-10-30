import type {
  Check,
  CheckState,
  CheckStatus,
  ChecksResponse,
  CheckUptime,
  CheckWithState,
  Component,
  ComponentsResponse,
  ComponentsUptimeResponse,
  ComponentUptime,
  ComponentWithState,
  ErrorResponse,
  ExpectedStatus,
  FetchJsonError,
  FetchJsonResult,
  HeaderValue,
  HeartbeatCheck,
  HttpCheck,
  HttpMethod,
  Incident,
  IncidentsResponse,
  JsonAssertion,
  LocationResult,
  MaintenanceResponse,
  MaintenanceWindow,
  ManualIncident,
  ManualIncidentInput,
  ManualIncidentsResponse,
  ManualIncidentUpdateInput,
  PostResultRequest,
  Result,
  ResultsResponse,
  TlsCheck,
  UptimeDay,
  UptimeResponse,
} from "../src/index.ts";

// Compile-time fixture: covered by `npm run typecheck`.
const status: CheckStatus = "down";
const state: CheckState = "unknown";
const check: Check = { id: "a", name: "A", url: "https://x", intervalMs: 1000 };
const withObjective: HttpCheck = { ...check, latencyObjectiveMs: 500 };
const degradedStatus: CheckStatus = "degraded";
const degradedResult: Result = {
  checkId: "a",
  timestamp: 2,
  status: degradedStatus,
  statusCode: 200,
  latencyMs: 850,
  attempts: 1,
  reason: "latency 850ms over objective 500ms",
  location: "default",
};
const withTimeout: Check = { ...check, timeoutMs: 500 };
const httpCheck: HttpCheck = { ...check, type: "http" };
const keywordCheck: HttpCheck = { ...check, keyword: "ok" };
const method: HttpMethod = "POST";
const secret: HeaderValue = { env: "TOKEN" };
const range: ExpectedStatus = "200-299";
const assertion: JsonAssertion = { pointer: "/status", equals: "ok" };
const requestCheck: HttpCheck = {
  ...check,
  method,
  headers: { Authorization: secret, Accept: "application/json" },
  body: "{}",
  expectedStatus: [200, range],
  jsonAssert: [assertion, { pointer: "", exists: true }],
};
const retryCheck: HttpCheck = { ...check, retries: 2, retryDelayMs: 500 };
const tlsCheck: TlsCheck = {
  id: "t",
  name: "T",
  type: "tls",
  host: "example.com",
  port: 443,
  warnDays: 14,
  intervalMs: 1000,
  timeoutMs: 5000,
};
const tlsAsCheck: Check = tlsCheck;
const tlsResult: Result = {
  checkId: "t",
  timestamp: 1,
  status: "down",
  statusCode: null,
  latencyMs: 3,
  reason: "certificate expires in 5 days",
  location: "default",
  attempts: 1,
  certDaysLeft: 5,
};
const tlsWithState: CheckWithState = {
  ...tlsCheck,
  state: "down",
  consecutiveDown: 1,
  lastResultAt: 1,
  lastReason: tlsResult.reason,
  locations: [{ location: "default", result: tlsResult, stale: false }],
  certDaysLeft: 5,
};
const heartbeatCheck: HeartbeatCheck = {
  id: "h",
  name: "H",
  type: "heartbeat",
  period: 60000,
  grace: 5000,
};
const heartbeatAsCheck: Check = heartbeatCheck;
const heartbeatWithState: CheckWithState = {
  ...heartbeatCheck,
  state: "unknown",
  consecutiveDown: 0,
  lastResultAt: null,
  lastReason: null,
  locations: [],
};
const checkTarget = (c: Check): string => {
  switch (c.type) {
    case "heartbeat":
      return `every ${c.period}ms`;
    case "tls":
      return c.host;
    case "http":
    case undefined:
      return c.url;
    default: {
      const unreachable: never = c;
      return unreachable;
    }
  }
};
const result: Result = {
  checkId: "a",
  timestamp: 1,
  status,
  statusCode: null,
  latencyMs: 3,
  reason: "ECONNREFUSED",
  location: "default",
  attempts: 1,
};
const locationResult: LocationResult = { location: "default", result, stale: false };
const request: PostResultRequest = result;
const { location: _location, attempts: _attempts, ...minimalBase }: Result = result;
const minimalRequest: PostResultRequest = minimalBase;
const incident: Incident = { id: 1, checkId: "a", openedAt: 1, resolvedAt: null, reason: null };
const withState: CheckWithState = {
  ...withTimeout,
  state,
  consecutiveDown: 0,
  lastResultAt: null,
  lastReason: null,
  locations: [locationResult],
};
const stateOf = (state: CheckState): CheckWithState => ({ ...withObjective, ...withState, state });
const allStates: CheckWithState[] = (
  ["up", "degraded", "down", "unknown", "maintenance"] as const
).map(stateOf);
const window: MaintenanceWindow = { checkId: "a", start: 1, end: 2, note: "upgrade" };
const maintenanceState: CheckState = "maintenance";
const inMaintenance: CheckWithState = {
  ...withState,
  state: maintenanceState,
  maintenance: window,
};
const maintenance: MaintenanceResponse = [window];
const checks: ChecksResponse = [withState, inMaintenance];
const variants = {
  withObjective,
  degradedResult,
  allStates,
  httpCheck,
  retryCheck,
  keywordCheck,
  requestCheck,
  tlsAsCheck,
  tlsWithState,
  heartbeatAsCheck,
  heartbeatWithState,
  checkTarget,
};
const results: ResultsResponse = [result, tlsResult, degradedResult];
const incidents: IncidentsResponse = [incident];
const manualIncident: ManualIncident = {
  id: 1,
  title: "Slow checkout",
  componentIds: ["web"],
  impact: "minor",
  status: "resolved",
  createdAt: 1000,
  resolvedAt: 3000,
  updates: [
    { at: 1000, status: "investigating", message: "Looking into it." },
    { at: 3000, status: "resolved", message: "Resolved." },
  ],
};
const manualIncidents: ManualIncidentsResponse = [manualIncident];
const manualInput: ManualIncidentInput = {
  title: "Slow checkout",
  impact: "minor",
  componentIds: [],
  message: "Looking into it.",
};
const manualUpdateInput: ManualIncidentUpdateInput = { status: "monitoring", message: "Fix out." };
const error: ErrorResponse = { error: "bad" };

const noDataDay: UptimeDay = { date: "2026-10-26", uptime: null, results: 0 };
const uptimeDay: UptimeDay = { date: "2026-10-27", uptime: 98.4, results: 500 };
const checkUptime: CheckUptime = {
  checkId: "a",
  days: [noDataDay, uptimeDay],
  uptime: 98.4,
};
const emptyUptime: CheckUptime = { checkId: "b", days: [noDataDay], uptime: null };
const uptime: UptimeResponse = [checkUptime, emptyUptime];

const component: Component = {
  id: "web",
  name: "Website",
  description: "Public site",
  checkIds: ["a", "b"],
  group: "Services",
};
const minimalComponent: Component = { id: "api", name: "API", checkIds: ["a"] };
const componentWithState: ComponentWithState = {
  ...component,
  state: "up",
  uptime: 98.4,
  incidentIds: [3, 7],
};
const components: ComponentsResponse = [componentWithState];
const componentUptime: ComponentUptime = { componentId: "web", days: [uptimeDay], uptime: 98.4 };
const componentsUptime: ComponentsUptimeResponse = [componentUptime];

const fetchError: FetchJsonError = { kind: "http", status: 500, wire: { status: "absent" } };
const fetchResult: FetchJsonResult<Check> = { ok: false, error: fetchError };

export const fixture = {
  fetchResult,
  request,
  minimalRequest,
  variants,
  checks,
  results,
  incidents,
  maintenance,
  error,
  uptime,
  component,
  minimalComponent,
  components,
  componentsUptime,
  manualIncident,
  manualIncidents,
  manualInput,
  manualUpdateInput,
};
