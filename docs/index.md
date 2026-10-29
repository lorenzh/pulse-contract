# pulse-contract documentation

pulse-contract holds the shared TypeScript types of pulse. It has no runtime code and no settings.
For how the services fit together, see the
[architecture](https://github.com/lorenzh/pulse-meta/blob/main/docs/architecture.md) in the meta
repository. The main README is [README.md](../README.md).

## Type reference

Every type exported from `src/index.ts`. Import them with `import type` only.

| Type                  | Meaning                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CheckStatus`         | Result status: `"up"`, `"degraded"` or `"down"`.                                                                                                        |
| `CheckState`          | A `CheckStatus`, or `"unknown"` (no result yet) or `"maintenance"` (active window).                                                                     |
| `HttpCheck`           | An HTTP check: `url`, interval, optional timeout, latency objective, retries and retry delay.                                                           |
| `TlsCheck`            | A check of the leaf certificate of a TLS endpoint: `host`, `port`, `warnDays`, interval.                                                                |
| `Check`               | `HttpCheck \| TlsCheck`.                                                                                                                                |
| `Result`              | One probe result: check id, timestamp, status, status code, latency, reason, location, attempts, optional `certDaysLeft`.                               |
| `Incident`            | A run of down results: check id, `openedAt`, `resolvedAt` (null while open), reason.                                                                    |
| `LocationResult`      | The latest `Result` of one probe location, with a `stale` flag.                                                                                         |
| `MaintenanceWindow`   | A planned window for one check, half-open `[start, end)` in epoch ms, with a note.                                                                      |
| `CheckStateFields`    | The evaluated state added to a check: `state`, `consecutiveDown`, `lastResultAt`, `lastReason`, `locations`, optional `maintenance` and `certDaysLeft`. |
| `CheckWithState`      | `Check & CheckStateFields`; distributes over both check variants.                                                                                       |
| `UptimeDay`           | Uptime of one UTC day (`date`, `uptime` 0..100 or null, `results`).                                                                                     |
| `CheckUptime`         | The 90-day uptime of one check: `checkId`, 90 `days` oldest first, weighted `uptime`.                                                                   |
| `PostResultRequest`   | Body of `POST /results`: a `Result`.                                                                                                                    |
| `ChecksResponse`      | Response of `GET /checks`: `CheckWithState[]`.                                                                                                          |
| `ResultsResponse`     | Response of `GET /checks/:id/results`: `Result[]`.                                                                                                      |
| `IncidentsResponse`   | Response of `GET /incidents`: `Incident[]`.                                                                                                             |
| `MaintenanceResponse` | Response of `GET /maintenance`: `MaintenanceWindow[]`.                                                                                                  |
| `UptimeResponse`      | Response of `GET /uptime`: `CheckUptime[]`, one per check, in the order of `GET /checks`.                                                               |
| `ErrorResponse`       | Error body: `{ error: string }`.                                                                                                                        |

## Bump the pin in a consumer

Consumers are pulse-api, pulse-probe, pulse-status and pulse-notify. Each pins the contract to a
full commit SHA on its `main`.

1. Merge the contract change to `main` of pulse-contract and note the full commit SHA.
2. In the consumer, set the dependency in `package.json`:
   `"@lorenzh/pulse-contract": "github:lorenzh/pulse-contract#<full commit sha>"`.
3. Run `npm install` to update `package-lock.json`.
4. Run `npm run check` and fix any type errors.
5. Commit `package.json` and `package-lock.json` together.

## Change the contract

Edit `src/index.ts`, update `test/types.fixture.ts` and the README, run `npm run build` and commit
`dist/`, then run `npm run check`. A breaking type change needs a matching section for each
consumer in the spec.
