// CPU A/B runner for the history validators: `bun test/validate-cpu.ts <contract root>`.
// It is not a *.test.ts file, so `bun test` does not run it.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Validator = (value: unknown) => { ok: boolean; value?: unknown };

const CHECKS = 1000;
const DAYS = 90;
const WARMUP = 2;
const RUNS = 7;

const date = (i: number): string => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);

const uptime: unknown = JSON.parse(
  JSON.stringify(
    Array.from({ length: CHECKS }, (_, c) => ({
      checkId: `check-${c}`,
      days: Array.from({ length: DAYS }, (_, d) => ({ date: date(d), uptime: 99.5, results: 288 })),
      uptime: 99.5,
    })),
  ),
);

const latency: unknown = JSON.parse(
  JSON.stringify(
    Array.from({ length: CHECKS }, (_, c) => ({
      checkId: `check-${c}`,
      days: Array.from({ length: DAYS }, (_, d) => ({
        date: date(d),
        p50Ms: 120,
        p95Ms: 340,
        count: 288,
      })),
    })),
  ),
);

function validatorOf(module: unknown, name: string): Validator {
  if (typeof module !== "object" || module === null) {
    throw new TypeError("the contract root has no module exports");
  }
  const candidate: unknown = Reflect.get(module, name);
  if (typeof candidate !== "function") {
    throw new TypeError(`the contract root does not export ${name}`);
  }
  return candidate as Validator;
}

function cpuMs(): number {
  const usage = process.cpuUsage();
  return (usage.user + usage.system) / 1000;
}

function measure(validate: Validator, input: unknown): { samples: number[]; median: number } {
  const first = validate(input);
  assert.equal(first.ok, true);
  assert.equal(first.value, input);
  for (let i = 0; i < WARMUP; i += 1) {
    validate(input);
  }
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const start = cpuMs();
    validate(input);
    samples.push(cpuMs() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return { samples, median: sorted[3] ?? Number.NaN };
}

const rootArg = process.argv[2];
if (rootArg === undefined) {
  console.error("usage: bun test/validate-cpu.ts <contract root>");
  process.exit(2);
}
const root = resolve(rootArg);
const module: unknown = await import(pathToFileURL(resolve(root, "src/index.ts")).href);
const uptimeResult = measure(validatorOf(module, "validateUptimeResponse"), uptime);
const latencyResult = measure(validatorOf(module, "validateLatencyResponse"), latency);
console.log(
  JSON.stringify({ root, bun: Bun.version, uptime: uptimeResult, latency: latencyResult }),
);
