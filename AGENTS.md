# AGENTS.md

## Commands

```sh
npm ci           # install from the lockfile
npm run check    # lint, build, typecheck, then tests
npm run lint     # Biome and SonarJS (ESLint, tools/sonarjs) check (changes nothing)
npm run format   # Biome autofix
```

A Lefthook pre-commit hook (installed by `npm ci` via `prepare`) runs Biome and ESLint (SonarJS) on
staged files and blocks the commit on format or lint errors. Fix with `npm run format`.

## Conventions

- SonarJS config lives in `tools/sonarjs` (own TypeScript 6; root keeps TypeScript 7). Cognitive complexity max 15, line coverage min 80 % (`npm test`).
- Strict TypeScript, ESM, Node 24 type stripping (erasable syntax only).
- Every change gets tests with `node:test`, next to the code they cover.
- Time-dependent logic takes an injectable clock. Tests never use real timers.
- Network tests run only against local servers started inside the test.
