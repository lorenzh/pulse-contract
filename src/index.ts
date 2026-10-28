export type CheckStatus = "up" | "down";
export type CheckState = CheckStatus | "unknown";

export interface Check {
  id: string;
  name: string;
  url: string;
  intervalMs: number;
  timeoutMs?: number;
}

export interface Result {
  checkId: string;
  /** Epoch ms, set by the probe. */
  timestamp: number;
  status: CheckStatus;
  /** null when no response arrived. */
  statusCode: number | null;
  latencyMs: number;
  /** null when up; otherwise e.g. "HTTP 503", "timeout after 1000ms", "ECONNREFUSED". */
  reason: string | null;
  /** Name of the probe location that produced the result; `default` for legacy results. */
  location: string;
}

export interface Incident {
  id: number;
  checkId: string;
  openedAt: number;
  resolvedAt: number | null;
  /** The reason of the result that opened the incident. */
  reason: string | null;
}

/** The latest result of one probe location for a check. */
export interface LocationResult {
  location: string;
  result: Result;
  /** True when the latest result is outside the window ending at the check's newest result. */
  stale: boolean;
}

export interface CheckWithState extends Check {
  state: CheckState;
  consecutiveDown: number;
  lastResultAt: number | null;
  lastReason: string | null;
  /** Latest result per location ever seen, sorted by location name; empty without results. */
  locations: LocationResult[];
}

/** Body of POST /results. */
export type PostResultRequest = Result;
/** GET /checks */
export type ChecksResponse = CheckWithState[];
/** GET /checks/:id/results */
export type ResultsResponse = Result[];
/** GET /incidents */
export type IncidentsResponse = Incident[];

export interface ErrorResponse {
  error: string;
}
