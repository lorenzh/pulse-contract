// One memory case per process, started by client-memory.test.ts. Not a test file itself.
// argv: "read" (fetchJson) or "write" (requestJson), and the URL of the local peer that the test runs.
import { type FetchJsonResult, fetchJson, requestJson } from "../src/index.ts";

const MIB = 2 ** 20;
const isRead = process.argv[2] === "read";

const url = process.argv[3] ?? "";
const common = {
  fetch: fetch.bind(globalThis),
  validate: (raw: unknown) => ({ ok: true as const, value: raw }),
  timeoutMs: 20_000,
};

Bun.gc(true);
const baseline = process.memoryUsage().rss;
let peak = baseline;
const sample = (): void => {
  peak = Math.max(peak, process.memoryUsage().rss);
};
const timer = setInterval(sample, 2);
sample();
let result: FetchJsonResult<unknown>;
let status: number | null = null;
if (isRead) {
  result = await fetchJson(url, common);
} else {
  const written = await requestJson(url, { ...common, method: "POST", body: "{}" });
  status = written.ok ? written.status : (written.response?.status ?? null);
  result = written.ok ? { ok: true, value: written.value, wire: written.wire } : written;
}
const until = Date.now() + 1000;
while (Date.now() < until) {
  sample();
  await Bun.sleep(2);
}
clearInterval(timer);
sample();

const error = result.ok ? undefined : result.error;
console.log(
  JSON.stringify({
    kind: error?.kind ?? "ok",
    growth: Math.floor((peak - baseline) / MIB),
    status,
    hasMessage: error !== undefined && "message" in error,
    cause: error?.kind === "network" && error.cause instanceof Error ? error.cause.message : null,
  }),
);
