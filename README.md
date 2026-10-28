# pulse-contract

[![CI](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml)

pulse is an uptime monitor with a status page. This repository is its shared contract: the TypeScript types used by every other pulse repository, namely `Check`, `Result`, `Incident`, `CheckWithState` and the API request/response shapes (`PostResultRequest`, `ChecksResponse`, `ResultsResponse`, `IncidentsResponse`, `ErrorResponse`), plus the `CheckStatus` and `CheckState` unions. Types only, no runtime code.

pulse-contract depends on no other pulse repository. It is consumed by [pulse-probe](https://github.com/lorenzh/pulse-probe), [pulse-api](https://github.com/lorenzh/pulse-api) and [pulse-status](https://github.com/lorenzh/pulse-status).

pulse is built by Paragon Factory agents from the issues in [pulse-meta](https://github.com/lorenzh/pulse-meta).

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

## Development

Requires Node >= 24.

```sh
npm ci
npm run check   # lint, build, typecheck and tests
npm run lint    # Biome format and lint check, changes nothing
npm run format  # Biome autofix (safe fixes only)
```

`npm ci` installs a Lefthook pre-commit hook that runs `biome check` on staged
`*.js`, `*.ts`, `*.json` and `*.jsonc` files and rejects the commit if they are
badly formatted or fail lint. Run `npm run format` to fix them.

There are no settings and no run step: this is a library of types only.
