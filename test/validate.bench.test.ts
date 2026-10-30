import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { validateLatencyResponse, validateUptimeResponse } from "../src/index.ts";

const CHECKS = 1000;
const DAYS = 90;
const WARMUP = 2;
const RUNS = 7;

const date = (i: number): string => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);

const uptime = Array.from({ length: CHECKS }, (_, c) => ({
  checkId: `check-${c}`,
  days: Array.from({ length: DAYS }, (_, d) => ({ date: date(d), uptime: 99.5, results: 288 })),
  uptime: 99.5,
}));

const latency = Array.from({ length: CHECKS }, (_, c) => ({
  checkId: `check-${c}`,
  days: Array.from({ length: DAYS }, (_, d) => ({
    date: date(d),
    p50Ms: 120,
    p95Ms: 340,
    count: 288,
  })),
}));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

test("history validation time (1,000 checks x 90 days), median of several runs", () => {
  const run = (): void => {
    assert.equal(validateUptimeResponse(uptime).ok, true);
    assert.equal(validateLatencyResponse(latency).ok, true);
  };
  for (let i = 0; i < WARMUP; i += 1) {
    run();
  }
  const times: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  console.log(`history validation median of ${RUNS}: ${median(times).toFixed(0)} ms`);
  // A loose sanity bound only; timing is not asserted tightly.
  expect(median(times)).toBeLessThan(5000);
}, 60_000); // two warmups and seven runs can exceed the default 5 s on a loaded machine
