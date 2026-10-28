# pulse-contract

Shared TypeScript types used by all pulse repos: `Check`, `Result`, `Incident`,
`CheckWithState` and the API request/response shapes. Types only, no runtime code.

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

```sh
npm ci
npm run check   # build, typecheck and tests
```

Part of pulse — issues and specs live in https://github.com/lorenzh/pulse-meta
