import type {
  Check,
  CheckState,
  CheckStatus,
  ChecksResponse,
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
} from "../src/index.ts";

// Compile-time fixture: covered by `npm run typecheck`.
const status: CheckStatus = "down";
const state: CheckState = "unknown";
const check: Check = { id: "a", name: "A", url: "http://x", intervalMs: 1000 };
const withTimeout: Check = { ...check, timeoutMs: 500 };
const httpCheck: HttpCheck = { ...check, type: "http" };
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
const window: MaintenanceWindow = { checkId: "a", start: 1, end: 2, note: "upgrade" };
const maintenanceState: CheckState = "maintenance";
const inMaintenance: CheckWithState = {
  ...withState,
  state: maintenanceState,
  maintenance: window,
};
const maintenance: MaintenanceResponse = [window];
const checks: ChecksResponse = [withState, inMaintenance];
const variants = { httpCheck, tlsAsCheck, tlsWithState };
const results: ResultsResponse = [request, tlsResult];
const incidents: IncidentsResponse = [incident];
const error: ErrorResponse = { error: "bad" };

export const fixture = { variants, checks, results, incidents, maintenance, error };
