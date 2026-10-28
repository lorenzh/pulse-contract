import type {
  Check,
  CheckState,
  CheckStatus,
  ChecksResponse,
  CheckWithState,
  ErrorResponse,
  Incident,
  IncidentsResponse,
  LocationResult,
  MaintenanceResponse,
  MaintenanceWindow,
  PostResultRequest,
  Result,
  ResultsResponse,
} from "../src/index.ts";

// Compile-time fixture: covered by `npm run typecheck`.
const status: CheckStatus = "down";
const state: CheckState = "unknown";
const check: Check = { id: "a", name: "A", url: "http://x", intervalMs: 1000 };
const withTimeout: Check = { ...check, timeoutMs: 500 };
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
const results: ResultsResponse = [request];
const incidents: IncidentsResponse = [incident];
const error: ErrorResponse = { error: "bad" };

export const fixture = { checks, results, incidents, maintenance, error };
