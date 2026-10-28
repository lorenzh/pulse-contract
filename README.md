# pulse-contract

[![CI](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml)

pulse is an uptime monitor with a status page. This repository is its shared contract: the TypeScript types used by every other pulse repository, namely `Check`, `Result`, `Incident`, `MaintenanceWindow`, `CheckWithState`, `LocationResult` and the API request/response shapes (`PostResultRequest`, `ChecksResponse`, `ResultsResponse`, `IncidentsResponse`, `MaintenanceResponse`, `UptimeResponse`, `ErrorResponse`), plus the `CheckStatus` and `CheckState` unions. `CheckState` includes `"maintenance"`: a check whose `MaintenanceWindow` (`checkId`, `start`, `end` as epoch ms with `[start, end)` semantics, `note`) is active is reported with that state and the window in `CheckWithState.maintenance`. `GET /maintenance` returns a `MaintenanceResponse`. `GET /uptime` returns an `UptimeResponse`: per check a `CheckUptime` with 90 UTC `UptimeDay`s (oldest first, `uptime` 0..100 or null without results) and the result-weighted 90-day `uptime`. Types only, no runtime code.

pulse-contract depends on no other pulse repository. It is consumed by [pulse-probe](https://github.com/lorenzh/pulse-probe), [pulse-api](https://github.com/lorenzh/pulse-api) and [pulse-status](https://github.com/lorenzh/pulse-status).

pulse is built by Paragon Factory agents from the issues in [pulse-meta](https://github.com/lorenzh/pulse-meta).

Contributing: see [AGENTS.md](AGENTS.md).

## Usage

Depend on a pinned commit of `main` and use `import type` only:

```json
"@lorenzh/pulse-contract": "github:lorenzh/pulse-contract#<full commit sha>"
```

```ts
import type { Check, Result } from "@lorenzh/pulse-contract";
```

The compiled output in `dist/` is committed, because Node does not strip types under
`node_modules` and Git dependencies have no build step. After changing `src/`, run
`npm run build` and commit `dist/`. A test fails when `dist/` is out of date.

## Check types

`Check` is `HttpCheck | TlsCheck`. An `HttpCheck` has a `url` and an optional `type: "http"` (absent
means http) and an optional `latencyObjectiveMs` (ms; a successful result slower than it is `degraded`; absent means no objective). `CheckStatus` is `"up" | "degraded" | "down"`. A `TlsCheck` (`type: "tls"`, `host`, `port`, `warnDays`, `intervalMs`, optional
`timeoutMs`) watches the leaf certificate of a TLS endpoint; `port` and `warnDays` are always set in
served data. Only the leaf's expiry is judged: the chain and hostname are not verified.
`Result.certDaysLeft` and `CheckWithState.certDaysLeft` hold the floored whole days until expiry
(negative when expired, `null` when no certificate was read, absent or `null` for HTTP).
`CheckWithState` is `Check & CheckStateFields`, so it distributes over both variants.

## Retries

An `HttpCheck` may set `retries` (integer 0..10, absent means 0) and `retryDelayMs` (integer
0..60000, absent means 1000 when `retries` > 0); the api serves resolved values. A failed attempt
(non-2xx, timeout, network error) is repeated before the probe reports down. `Result.attempts`
(integer >= 1, required) is the number of attempts made; the other result fields are those of the
last attempt, except `timestamp`, which is the start of the first. The api treats a missing
`attempts` on `POST /results` as 1. TLS checks have no retry fields.

## Locations

`Result.location` is the probe location name (required). Legacy results without a location count as
`default`; since this package has no runtime code, the constant `"default"` is documented here
rather than exported. `CheckWithState.locations` lists the latest `LocationResult` per location
(sorted by name, `stale` when outside the evaluation window), and is `[]` for checks without results.

## Development

Requires Node >= 24.

```sh
npm ci
npm run check   # lint, build, typecheck and tests
npm run lint    # Biome and SonarJS (ESLint) check, changes nothing
npm run format  # Biome autofix (safe fixes only)
```

`npm ci` installs a Lefthook pre-commit hook that runs `biome check` on staged
`*.js`, `*.ts`, `*.json` and `*.jsonc` files and ESLint on staged `*.js` and `*.ts` files, and rejects the commit if they are
badly formatted or fail lint. Run `npm run format` to fix them.

Checks: Biome, SonarJS via ESLint (recommended rules, cognitive complexity <= 15; config and
pinned tooling in `tools/sonarjs`, an npm workspace with its own TypeScript 6 because
typescript-eslint does not support TypeScript 7) and line coverage >= 80 %. Run them with
`npm run lint` and `npm test`.

There are no settings and no run step: this is a library of types only.

Licensed under the MIT licence, see [LICENSE](LICENSE).
