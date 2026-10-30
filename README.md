# pulse-contract

[![CI](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/lorenzh/pulse-contract/actions/workflows/ci.yml)

pulse is an uptime monitor with a status page. This repository is its shared contract: the TypeScript types used by every other pulse repository (checks, results, incidents, manual incidents, maintenance windows, uptime, status page components and the API request and response shapes). It also holds runtime validators for those shapes and the wire-format version, so every service checks the wire format the same way. Types and validators come from one set of [zod](https://zod.dev) schemas; `zod` is the only runtime dependency.

pulse-contract depends on no other pulse repository. It is consumed by [pulse-api](https://github.com/lorenzh/pulse-api), [pulse-probe](https://github.com/lorenzh/pulse-probe), [pulse-status](https://github.com/lorenzh/pulse-status) and [pulse-notify](https://github.com/lorenzh/pulse-notify).

Documentation: the type reference, check types, retries, locations and the pin bump steps are in [docs/index.md](docs/index.md).

pulse is built by Paragon Factory agents from the issues in [pulse-meta](https://github.com/lorenzh/pulse-meta).

Contributing: see [AGENTS.md](AGENTS.md).

## Usage

Depend on a pinned commit of `main`. Import types with `import type`; the validators and the wire version are runtime exports:

```json
"@lorenzh/pulse-contract": "github:lorenzh/pulse-contract#<full commit sha>"
```

```ts
import { checkWireVersion, validateCheck, WIRE_VERSION_HEADER } from "@lorenzh/pulse-contract";
import type { Check, Result } from "@lorenzh/pulse-contract";

const checked = validateCheck(body, "checks[3]"); // { ok: true, value } | { ok: false, error }
const version = checkWireVersion(response.headers.get(WIRE_VERSION_HEADER));
```

Validators never throw. `error` reads `<path>: <problem>`, for example
`checks[3].intervalMs: must be an integer 1..2147483647`. Ranges are enforced (timer values at most `MAX_TIMER_MS`, dates must exist, uptime 0..100); see the bounds table in [docs/index.md](docs/index.md#validators).

`fetchJson` is a shared JSON GET client with timeout, size cap (5 MiB by default), wire-version
check and validation; it returns a typed result instead of throwing. See
[docs/index.md](docs/index.md#api-client).

The compiled output in `dist/` is committed, because Node does not strip types under
`node_modules` and Git dependencies have no build step. After changing `src/`, run
`npm run build` and commit `dist/`. A test fails when `dist/` is out of date.

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

Checks: Biome, SonarJS via ESLint (recommended rules, cognitive complexity <= 15) and
line coverage >= 80 %. Run them with `npm run lint` and `npm test`.

## Shared tooling configuration

The shared tooling configuration lives in `lorenzh/pulse-config`. The other pulse repositories use it through `extends` (Biome, TypeScript, Lefthook), a one-line ESLint config and `uses:` (CI). A rule change is made in `pulse-config` and reaches a target when its pin is updated. "Never weaken `biome.json`, `tsconfig.json` or CI" refers to the shared config.
The pin is in `package.json` and in the `uses:` ref of `.github/workflows/ci.yml`; update both together.
The local `eslint.config.js` also ignores `.repos/`.

There are no settings and no run step: this is a library.

Licensed under the MIT licence, see [LICENSE](LICENSE).
