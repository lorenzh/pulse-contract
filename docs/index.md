# pulse-contract documentation

pulse-contract holds the shared TypeScript types of pulse, plain-TypeScript runtime validators for them and the wire-format version. It has no runtime dependency and no settings.
For how the services fit together, see the
[architecture](https://github.com/lorenzh/pulse-meta/blob/main/docs/architecture.md) in the meta
repository. The main README is [README.md](../README.md).

## Type reference

Every type exported from `src/index.ts`. Import them with `import type`.

| Type                  | Meaning                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CheckStatus`         | Result status: `"up"`, `"degraded"` or `"down"`.                                                                                                           |
| `CheckState`          | A `CheckStatus`, or `"unknown"` (no result yet) or `"maintenance"` (active window).                                                                        |
| `HttpCheck`           | An HTTP check: `url`, interval, optional timeout, latency objective, retries, retry delay and keyword.                                                     |
| `TlsCheck`            | A check of the leaf certificate of a TLS endpoint: `host`, `port`, `warnDays`, interval.                                                                   |
| `HeartbeatCheck`      | A check that a job pings: `period` and `grace` in ms. The probe never runs it.                                                                             |
| `Check`               | `HttpCheck \| TlsCheck \| HeartbeatCheck`.                                                                                                                 |
| `Result`              | One probe result: check id, timestamp, status, status code, latency, reason, location, attempts, optional `certDaysLeft`.                                  |
| `Incident`            | A run of down results: check id, `openedAt`, `resolvedAt` (null while open), reason.                                                                       |
| `LocationResult`      | The latest `Result` of one probe location, with a `stale` flag.                                                                                            |
| `MaintenanceWindow`   | A planned window for one check, half-open `[start, end)` in epoch ms, with a note.                                                                         |
| `CheckStateFields`    | The evaluated state added to a check: `state`, `consecutiveDown`, `lastResultAt`, `lastReason`, `locations`, optional `maintenance` and `certDaysLeft`.    |
| `CheckWithState`      | `Check & CheckStateFields`; distributes over both check variants.                                                                                          |
| `UptimeDay`           | Uptime of one UTC day (`date`, `uptime` 0..100 or null, `results`).                                                                                        |
| `CheckUptime`         | The 90-day uptime of one check: `checkId`, 90 `days` oldest first, weighted `uptime`.                                                                      |
| `PostResultRequest`   | Body of `POST /results`: a `Result` where `location` and `attempts` may be absent (absent `attempts` means 1, absent or blank `location` means `default`). |
| `ChecksResponse`      | Response of `GET /checks`: `CheckWithState[]`.                                                                                                             |
| `ResultsResponse`     | Response of `GET /checks/:id/results`: `Result[]`.                                                                                                         |
| `IncidentsResponse`   | Response of `GET /incidents`: `Incident[]`.                                                                                                                |
| `MaintenanceResponse` | Response of `GET /maintenance`: `MaintenanceWindow[]`.                                                                                                     |
| `UptimeResponse`      | Response of `GET /uptime`: `CheckUptime[]`, one per check, in the order of `GET /checks`.                                                                  |
| `ErrorResponse`       | Error body: `{ error: string }`.                                                                                                                           |

## Details of the shared shapes

`CheckState` includes `"maintenance"`: a check whose `MaintenanceWindow` (`checkId`, `start`, `end` as
epoch ms with `[start, end)` semantics, `note`) is active is reported with that state and the window
in `CheckWithState.maintenance`. `GET /maintenance` returns a `MaintenanceResponse`.

`GET /uptime` returns an `UptimeResponse`: per check a `CheckUptime` with 90 UTC `UptimeDay`s (oldest
first, `uptime` 0..100 or null without results) and the result-weighted 90-day `uptime`.

## Check types

`Check` is `HttpCheck | TlsCheck | HeartbeatCheck`. An `HttpCheck` has a `url` and an optional `type: "http"` (absent
means http) and an optional `latencyObjectiveMs` (ms; a successful result slower than it is `degraded`; absent means no objective). `CheckStatus` is `"up" | "degraded" | "down"`. A `TlsCheck` (`type: "tls"`, `host`, `port`, `warnDays`, `intervalMs`, optional
`timeoutMs`) watches the leaf certificate of a TLS endpoint; `port` and `warnDays` are always set in
served data. Only the leaf's expiry is judged: the chain and hostname are not verified.
`Result.certDaysLeft` and `CheckWithState.certDaysLeft` hold the floored whole days until expiry
(negative when expired, `null` when no certificate was read, absent or `null` for HTTP).
A `HeartbeatCheck` (`type: "heartbeat"`, `period`, `grace`) is pinged by a cron job or worker
instead of being probed. `period` is the expected time between pings (integer ms, 1000..86400000);
`grace` is the extra wait before the check is down (integer ms, 0..86400000, always set in served
data). It has no `url`, `host`, `intervalMs` or `timeoutMs`, and the ping secret is never part of the
contract. The probe never runs it. In `CheckWithState`, `lastResultAt` is the time of the last ping
(`null` before the first). `validateCheck` rejects unknown keys on a heartbeat check, including
`url`, `host`, `intervalMs` and `secret`.
`CheckWithState` is `Check & CheckStateFields`, so it distributes over all variants.

## Retries

An `HttpCheck` may set `retries` (integer 0..10, absent means 0) and `retryDelayMs` (integer
0..60000, absent means 1000 when `retries` > 0); the api serves resolved values. A failed attempt
(non-2xx, timeout, network error) is repeated before the probe reports down. `Result.attempts`
(integer >= 1, required) is the number of attempts made; the other result fields are those of the
last attempt, except `timestamp`, which is the start of the first. The api treats a missing
`attempts` on `POST /results` as 1. TLS checks have no retry fields.

## Keyword

An `HttpCheck` may set `keyword`, a plain case-sensitive substring (no regular expression). A 2xx
answer whose body does not contain it is `down`: the probe sets `statusCode` to the 2xx code
received and `reason` to `keyword "<text>" not found`. The probe searches only within its body size
limit (1 MiB). Absent means the body is not read. `TlsCheck` has no `keyword`.

Example of an `HttpCheck` with a keyword:

```json
{
  "id": "home",
  "name": "Home page",
  "type": "http",
  "url": "https://example.com/",
  "intervalMs": 60000,
  "keyword": "Welcome"
}
```

## Locations

`Result.location` is the probe location name (required). Legacy results without a location count as
`default`; the constant `"default"` is documented here rather than exported. `CheckWithState.locations` lists the latest `LocationResult` per location
(sorted by name, `stale` when outside the evaluation window), and is `[]` for checks without results.

## Validators

Exported from the package root, all plain TypeScript with no dependency. Each takes an untrusted
value and an optional `path` (the name used in the error, so a caller can say `checks[3]`) and
returns `Validation<T>`: `{ ok: true; value: T } | { ok: false; error: string }`. They never throw.

- Item validators: `validateCheck` (http, tls or heartbeat; ignores state fields), `validateCheckWithState`,
  `validateResult`, `validateIncident`, `validateMaintenanceWindow`, `validateCheckUptime`,
  `validatePostResultRequest`. Default paths: `check`, `result`, `incident`, `maintenance`, `uptime`.
- Array validators, which fail on the first bad element and name its index: `validateChecksResponse`
  (uses `validateCheckWithState`), `validateResultsResponse`, `validateIncidentsResponse`,
  `validateMaintenanceResponse`, `validateUptimeResponse`. A consumer that skips bad items loops over
  the raw array with the item validator and the path `checks[<i>]`; one that fails the whole
  response uses the array validator.

Error format: `<path>: <problem>` with a JSONPath-like path, e.g.
`checks[1].locations[0].result.status: must be one of "up", "degraded", "down"` or
`uptime[0].days[2].uptime: must be a finite number`.

Rules: the full declared shape is checked (required fields, types, enums, non-empty `id` and
`checkId`, finite numbers, `intervalMs` > 0, integer `port`, `warnDays`, `retries`, `retryDelayMs`,
`attempts`; nullable fields accept `null`; optional fields may be absent or `undefined`). Unknown
extra fields are accepted and kept: on success `value` is the same object, not a copy.
Service-specific bounds (timestamp windows, length limits, Date ranges) stay in the service.

`validatePostResultRequest` checks `checkId`, integer `timestamp`, `status`, `statusCode` (null or
integer 100..599), `latencyMs` (finite, >= 0), `reason`, optional string `location`, optional
integer `attempts` >= 1 and optional null or integer `certDaysLeft`. It returns the value as sent,
without defaults.

## Wire-format version

`WIRE_VERSION` (integer, now `1`) changes only on an incompatible wire change. The api sends it in
the `WIRE_VERSION_HEADER` header (`x-pulse-contract`) on every response.
`checkWireVersion(header)` returns `{ status: "ok" }`, `{ status: "absent" }` or
`{ status: "mismatch"; error }`; the comparison is an exact integer match and a malformed value is a
mismatch. Consumer policy: `absent` is tolerated (an old api during rollout) and logged once per
process; `mismatch` fails the call like a network error and is never ignored.

The package version (`package.json`, semver) is separate: it follows semver, while `WIRE_VERSION`
moves only with an incompatible wire change.

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

Edit `src/` (types in `index.ts`, validators in `validate.ts`, version in `version.ts`), update `test/types.fixture.ts`, the validator tests and the docs, run `npm run build` and commit
`dist/`, then run `npm run check`. A breaking type change needs a matching section for each
consumer in the spec.
