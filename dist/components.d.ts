import type { CheckState, ManualIncidentImpact, UptimeDay } from "./schema.ts";
/**
 * The state of a component from the states of its member checks. First match wins: any `down`
 * gives `down`; any `degraded` gives `degraded`; else, ignoring `maintenance` and `unknown`,
 * any `up` gives `up`; else any `maintenance` gives `maintenance`; else `unknown`.
 */
export declare function combineStates(states: readonly CheckState[]): CheckState;
/** Uptime days and the window value of a component. */
export type AggregatedUptime = {
    days: UptimeDay[];
    uptime: number | null;
};
/**
 * Aggregates the `days` of several checks, result-weighted: per date,
 * sum(up + degraded results) / sum(results) * 100, with `uptime` null and `results` 0 when no
 * member has results that day. `uptime` is the same over all days. Days are matched by date
 * and returned oldest first.
 */
export declare function aggregateUptime(members: readonly (readonly UptimeDay[])[]): AggregatedUptime;
/**
 * The component state that an open manual incident of this impact implies: `none` gives
 * `undefined` (no change), `minor` gives `degraded`, `major` and `critical` give `down`.
 * Only open incidents count; the caller combines the result with `combineStates`.
 */
export declare function incidentImpactState(impact: ManualIncidentImpact): CheckState | undefined;
