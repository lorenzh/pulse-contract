import type {
  Check,
  CheckState,
  CheckStatus,
  ChecksResponse,
  CheckUptime,
  CheckWithState,
  ErrorResponse,
  HttpCheck,
  Incident,
  IncidentsResponse,
  LocationResult,
  MaintenanceResponse,
  MaintenanceWindow,
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
  tlsAsCheck,
  tlsWithState,
};
const results: ResultsResponse = [request, tlsResult, degradedResult];
const incidents: IncidentsResponse = [incident];
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

export const fixture = { variants, checks, results, incidents, maintenance, error, uptime };
