/**
 * The state of a component from the states of its member checks. First match wins: any `down`
 * gives `down`; any `degraded` gives `degraded`; else, ignoring `maintenance` and `unknown`,
 * any `up` gives `up`; else any `maintenance` gives `maintenance`; else `unknown`.
 */
export function combineStates(states) {
    for (const state of ["down", "degraded", "up", "maintenance"]) {
        if (states.includes(state)) {
            return state;
        }
    }
    return "unknown";
}
const percentOf = ({ good, total }) => total === 0 ? null : Math.min(100, (good / total) * 100);
/**
 * Aggregates the `days` of several checks, result-weighted: per date,
 * sum(up + degraded results) / sum(results) * 100, with `uptime` null and `results` 0 when no
 * member has results that day. `uptime` is the same over all days. Days are matched by date
 * and returned oldest first.
 */
export function aggregateUptime(members) {
    const perDate = new Map();
    const window = { good: 0, total: 0 };
    for (const member of members) {
        for (const day of member) {
            const tally = perDate.get(day.date) ?? { good: 0, total: 0 };
            perDate.set(day.date, tally);
            if (day.uptime === null || day.results === 0) {
                continue;
            }
            const good = (day.uptime / 100) * day.results;
            tally.good += good;
            tally.total += day.results;
            window.good += good;
            window.total += day.results;
        }
    }
    const days = [...perDate.keys()].sort(byDate).map((date) => {
        const tally = perDate.get(date) ?? { good: 0, total: 0 };
        return { date, uptime: percentOf(tally), results: tally.total };
    });
    return { days, uptime: percentOf(window) };
}
// ISO dates sort lexically.
const byDate = (a, b) => Number(a > b) - Number(a < b);
