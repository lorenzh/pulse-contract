import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixture } from "./types.fixture.ts";

const root = new URL("..", import.meta.url).pathname;

test("type fixtures are loadable", () => {
  assert.equal(fixture.checks.length, 2);
});

test("dist matches a fresh build of src", () => {
  const out = mkdtempSync(join(tmpdir(), "contract-dist-"));
  try {
    const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
    execFileSync(
      process.execPath,
      [tsc, "-p", join(root, "tsconfig.build.json"), "--outDir", out],
      { cwd: root },
    );
    for (const file of ["index.d.ts", "index.js"]) {
      assert.equal(
        readFileSync(join(root, "dist", file), "utf8"),
        readFileSync(join(out, file), "utf8"),
        `dist/${file} is out of date; run npm run build`,
      );
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("package entry imports as an empty module", async () => {
  const mod = await import("@lorenzh/pulse-contract");
  assert.deepEqual(Object.keys(mod), []);
});

test("fixture covers maintenance types", () => {
  assert.equal(fixture.maintenance.length, 1);
  assert.equal(fixture.checks[1]?.state, "maintenance");
  assert.equal(fixture.checks[1]?.maintenance, fixture.maintenance[0]);
});

test("fixture covers http and tls check variants", () => {
  const { httpCheck, tlsAsCheck, tlsWithState } = fixture.variants;
  assert.equal(httpCheck.type, "http");
  assert.equal(tlsAsCheck.type, "tls");
  assert.equal(tlsWithState.certDaysLeft, 5);
  assert.equal(fixture.checks[0]?.type, undefined);
});

test("fixture covers degraded and the latency objective", () => {
  const { withObjective, degradedResult, allStates } = fixture.variants;
  assert.equal(withObjective.latencyObjectiveMs, 500);
  assert.equal(degradedResult.status, "degraded");
  assert.deepEqual(
    allStates.map((c) => c.state),
    ["up", "degraded", "down", "unknown", "maintenance"],
  );
});
