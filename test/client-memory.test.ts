import { afterAll, beforeAll, test } from "bun:test";
import assert from "node:assert/strict";

type Report = {
  kind: string;
  growth: number;
  status: number | null;
  hasMessage: boolean;
  cause: string | null;
};

const BUDGET_MIB = 64;
const CHILD = new URL("./client-memory-child.ts", import.meta.url).pathname;

let server: ReturnType<typeof Bun.serve> | undefined;
let inputCpuS = 0;

beforeAll(() => {
  const started = process.cpuUsage();
  // Concatenated gzip members: a small payload that decodes far above the 5 MiB cap.
  const member = Bun.gzipSync(new Uint8Array(2 ** 22), { level: 9 });
  const body = Buffer.concat(Array.from({ length: 4096 }, () => member));
  const spent = process.cpuUsage(started);
  inputCpuS = (spent.user + spent.system) / 1e6;
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) =>
      new Response(body, {
        status: new URL(request.url).pathname === "/fail" ? 503 : 200,
        headers: { "content-encoding": "gzip", "x-pulse-contract": "1" },
      }),
  });
});

afterAll(async () => {
  await server?.stop(true);
});

async function runCase(mode: "read" | "write", path: "/ok" | "/fail"): Promise<Report> {
  const url = `http://127.0.0.1:${server?.port}${path}`;
  const child = Bun.spawn([process.execPath, CHILD, mode, url], {
    stdout: "pipe",
    stderr: "inherit",
  });
  const kill = setTimeout(() => child.kill(), 30_000);
  try {
    const out = await new Response(child.stdout).text();
    await child.exited;
    const line = out.trim().split("\n").at(-1) ?? "";
    const report: unknown = JSON.parse(line);
    assert.ok(typeof report === "object" && report !== null, `no report: ${line}`);
    return report as Report;
  } finally {
    clearTimeout(kill);
  }
}

function assertBudget(report: Report): void {
  console.log(`peak RSS growth ${report.growth} MiB, input CPU ${inputCpuS.toFixed(3)} s`);
  assert.ok(report.growth <= BUDGET_MIB, `peak RSS growth ${report.growth} MiB`);
  assert.ok(inputCpuS <= 0.1, `input CPU ${inputCpuS} s`);
}

const CAUSE = "response content-encoding is not supported";

test("compressed read body larger than the cap is rejected with a bounded peak memory", async () => {
  const report = await runCase("read", "/ok");
  assert.equal(report.kind, "network");
  assert.equal(report.cause, CAUSE);
  assertBudget(report);
}, 60_000);

test("compressed non-success read is dropped with a bounded peak memory", async () => {
  const report = await runCase("read", "/fail");
  assert.equal(report.kind, "http");
  assertBudget(report);
}, 60_000);

test("compressed successful write response larger than the cap is rejected with a bounded peak memory", async () => {
  const report = await runCase("write", "/ok");
  assert.equal(report.kind, "network");
  assert.equal(report.cause, CAUSE);
  assert.equal(report.status, 200);
  assertBudget(report);
}, 60_000);

test("compressed non-success write response is an http error with a bounded peak memory", async () => {
  const report = await runCase("write", "/fail");
  assert.equal(report.kind, "http");
  assert.equal(report.hasMessage, false);
  assert.equal(report.status, 503);
  assertBudget(report);
}, 60_000);
