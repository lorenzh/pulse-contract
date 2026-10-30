# pulse-contract documentation

pulse-contract holds the shared TypeScript types of pulse, plain-TypeScript runtime validators for them and the wire-format version. Types and validators come from one set of zod schemas (`src/schema.ts`). Its only runtime dependency is `zod`; it has no settings.
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
| `HttpMethod`          | `"GET"`, `"HEAD"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"` or `"OPTIONS"`.                                                                                |
| `HeaderValue`         | A literal header value string, or `{ env: NAME }` that the probe resolves from its environment.                                                            |
| `ExpectedStatus`      | An accepted status: an integer 100..599 or a range string `"lo-hi"`.                                                                                       |
| `JsonAssertion`       | `{ pointer, equals }` or `{ pointer, exists: true }`.                                                                                                      |
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

## HTTP request and judgement options

These optional `HttpCheck` fields are additive; the wire version stays 1. `TlsCheck` and
`HeartbeatCheck` reject all of them.

| Field            | Rule                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`         | `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` or `OPTIONS`; upper case, case-sensitive; absent means `GET`.                                                                                                                                                                                                                                         |
| `headers`        | Object, at most 20 entries. Names are RFC 9110 tokens of 1..256 bytes, unique case-insensitively; `host`, `content-length`, `transfer-encoding`, `connection` and `user-agent` are forbidden. Names plus literal values total at most 16 KiB.                                                                                                         |
| header value     | A literal string of 0..4096 visible ASCII/obs-text characters or spaces (no tab, CR or LF), or `{ "env": "NAME" }` with `NAME` matching `^[A-Za-z_][A-Za-z0-9_]{0,127}$`.                                                                                                                                                                             |
| `body`           | String, at most 65536 bytes (UTF-8). Not allowed with `GET` (the default) or `HEAD`. There is no default `Content-Type`; set it in `headers`.                                                                                                                                                                                                         |
| `expectedStatus` | Non-empty array of at most 20 entries, each an integer 100..599 or a string `"lo-hi"` with `100 <= lo <= hi <= 599`. Absent means `200-299`. The final status after redirects is judged.                                                                                                                                                              |
| `jsonAssert`     | Non-empty array of at most 10 items, each `{ pointer, equals }` or `{ pointer, exists: true }`.`pointer` is an RFC 6901 JSON pointer of at most 256 bytes (`""` is the whole document). `equals` is any JSON value, compared deeply with strict types. `exists` is only `true`. Not allowed with `HEAD`; `keyword` is not allowed with `HEAD` either. |

Validation errors name the field path (for example `check.headers.Host`), never the value.

### Trust model of header values and bodies

The public `GET /checks` never serves `headers`, `body` or `jsonAssert`. The api serves them only
to probes that present the probe Bearer token, on `GET /probe/checks`, exactly as written in the
checks file. The api never resolves `{ "env": NAME }`: the probe resolves it from its own
environment when it loads the checks, so a secret lives only in the probe environment. A reference
to an unset or empty variable makes the check invalid for that probe; the probe logs the header and
variable names (never values) and does not run the check. Literal header values and the body are
stored by the api at rest and reach every authenticated probe: use `env` for secrets and treat the
checks file, the database and the probe tokens as sensitive.

### Reasons

The probe reports the first failure, in this order. `<codes>` is `expectedStatus` joined with
`", "`, or `200-299` by default.

1. `HTTP <code> not in <codes>`
2. `keyword "<text>" not found`
3. `json: invalid body` (body over 1 MiB or not valid JSON)
4. `json <pointer>: expected <JSON>, got <JSON>` (`got` is `missing` when absent), or
   `json <pointer>: missing` for `exists`

Quoted response values are cut to 80 characters with `…`. Only response data is quoted, never
request data.

Example:

```json
{
  "id": "svc",
  "name": "Service",
  "url": "https://svc.example.com/check",
  "intervalMs": 60000,
  "method": "POST",
  "headers": { "Authorization": { "env": "SVC_TOKEN" }, "Content-Type": "application/json" },
  "body": "{\"ping\":true}",
  "expectedStatus": [200],
  "jsonAssert": [{ "pointer": "/status", "equals": "ok" }]
}
```

## Locations

`Result.location` is the probe location name (required). Legacy results without a location count as
`default`; the constant `"default"` is documented here rather than exported. `CheckWithState.locations` lists the latest `LocationResult` per location
(sorted by name, `stale` when outside the evaluation window), and is `[]` for checks without results.

## Validators

Exported from the package root, built on the zod schemas in `src/schema.ts` (types are `z.infer` aliases with the names below). Each takes an untrusted
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
`uptime[0].days[2].uptime: must be null or a number 0..100`. Only the first problem is reported;
a missing required field reads `<path>: is required`. Inherited names (`constructor`, `__proto__`)
never count as present.

Rules: the full declared shape is checked (required fields, types, enums, non-empty `id` and
`checkId`, finite numbers, the bounds below; nullable fields accept `null`; optional fields may be absent or `undefined`). Unknown
extra fields are accepted and kept: on success `value` is the same object, not a copy.
Service-specific bounds (timestamp windows, length limits) stay in the service.

Bounds (a value outside them is rejected):

| Field                                                       | Rule                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `intervalMs` (http, tls), `timeoutMs`, `latencyObjectiveMs` | integer 1..2147483647 (`MAX_TIMER_MS`)                                              |
| `retries`                                                   | integer 0..10                                                                       |
| `retryDelayMs`                                              | integer 0..60000                                                                    |
| tls `port`                                                  | integer 1..65535                                                                    |
| tls `warnDays`                                              | integer 0..`Number.MAX_SAFE_INTEGER` (the `z.int()` cap)                            |
| heartbeat `period`                                          | integer 1000..86400000                                                              |
| heartbeat `grace`                                           | integer 0..86400000                                                                 |
| `uptime` (day and total)                                    | null or number 0..100                                                               |
| `UptimeDay.date`                                            | `YYYY-MM-DD`, a real calendar date (`2030-02-30` is rejected, leap years are right) |
| maintenance `end`                                           | greater than `start`; the error names `<path>.end`                                  |

`MAX_TIMER_MS` (2147483647, 2^31-1) is exported: Node clamps a longer timer delay to 1 ms, so no
layer passes a delay above it to a timer.

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

## API client

`fetchJson(url, options)` GETs a JSON document, checks it and never throws for expected failures.
It uses web APIs only (no `node:` imports), so a browser can import it. It needs
`AbortSignal.any`: Chrome 116, Firefox 124, Safari 17.4, Node 20.3.

Options: `fetch` (injected), `validate` (a contract validator, for example
`(raw) => validateChecksResponse(raw)`), `timeoutMs` (covers headers and body), `signal`
(caller abort), `maxBytes` (default `DEFAULT_MAX_BODY_BYTES`, 5 MiB), `headers`, `onWireAbsent`
(called once for each response without the wire header, also a non-2xx one) and `schedule(fn, ms)` (returns a cancel
function; default `setTimeout`).

The result is `{ ok: true; value; wire: "ok" | "absent" }` or `{ ok: false; error }`. `error.kind`:

| kind            | fields             | meaning                                                          |
| --------------- | ------------------ | ---------------------------------------------------------------- |
| `timeout`       | `timeoutMs`        | no complete response in time, also if `fetch` ignores the signal |
| `aborted`       | `reason`           | the caller's `signal` aborted before the timer fired             |
| `network`       | `cause`            | `fetch` or the body read rejected                                |
| `http`          | `status`, `wire`   | status is not 2xx; `wire` is the `checkWireVersion` result       |
| `too-large`     | `maxBytes`         | `Content-Length` or the streamed bytes exceed the cap            |
| `invalid-json`  | `message`          | the body is not JSON                                             |
| `wire-mismatch` | `message`          | the wire header differs from `WIRE_VERSION`                      |
| `validation`    | `message`, `path?` | the validator refused the body; `message` has the path           |

Order of checks: HTTP status, wire header, size, JSON, validation. A non-2xx response with a
mismatching header is therefore `http`. The timer is always cleared and the request is aborted on
timeout, cap and caller abort.
An error found before the body is read returns at once; the body is cancelled without waiting.

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

Edit `src/` (exports in `index.ts`, schemas in `schema.ts`, validators in `validate.ts`, version in `version.ts`), update `test/types.fixture.ts`, the validator tests and the docs, run `npm run build` and commit
`dist/`, then run `npm run check`. A breaking type change needs a matching section for each
consumer in the spec.
