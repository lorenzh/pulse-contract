import { afterAll, beforeAll, expect, test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MAX_BODY_BYTES,
  type FetchJsonOptions,
  fetchJson,
  requestJson,
  type Validation,
} from "../src/index.ts";

type Server = ReturnType<typeof Bun.serve>;
type Hit = { path: string; authorization: string | null };

const CAUSE = "response content-encoding is not supported";
const REDIRECTS = [301, 302, 303, 307, 308];
const SECRET = "Bearer caller-secret";

const hits: Hit[] = [];
const seenCodings: (string | null)[] = [];
const servers: Server[] = [];
let tls: { cert: string; key: string } | undefined;

function record(request: Request): void {
  hits.push({
    path: new URL(request.url).pathname,
    authorization: request.headers.get("authorization"),
  });
}

/** A peer that answers JSON and counts the requests to it. */
function destination(options: { tls?: { cert: string; key: string } } = {}): Server {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    ...options,
    fetch: (request) => {
      record(request);
      return Response.json({ reached: true }, { headers: { "x-pulse-contract": "1" } });
    },
  });
  servers.push(server);
  return server;
}

/** Answers each request with `status` and a `Location` pointing at `target(path)`. */
function redirector(
  target: (path: string) => string,
  options: { tls?: { cert: string; key: string } } = {},
): Server {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    ...options,
    fetch: (request) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/dest")) {
        record(request);
        return Response.json({ reached: true }, { headers: { "x-pulse-contract": "1" } });
      }
      const status = Number(url.pathname.slice(1));
      return new Response(null, { status, headers: { location: target(url.pathname) } });
    },
  });
  servers.push(server);
  return server;
}

/** Makes a throwaway self-signed certificate for 127.0.0.1; no key material is committed. */
function makeCertificate(): { cert: string; key: string } {
  const dir = mkdtempSync(join(tmpdir(), "contract-tls-"));
  try {
    const key = join(dir, "key.pem");
    const cert = join(dir, "cert.pem");
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- test-only openssl from PATH
    const made = spawnSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "ec",
      "-pkeyopt",
      "ec_paramgen_curve:prime256v1",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1",
      "-keyout",
      key,
      "-out",
      cert,
    ]);
    if (made.error !== undefined || made.status !== 0) {
      throw new Error("openssl is required for the https-to-http redirect test", {
        cause: made.error,
      });
    }
    return { cert: readFileSync(cert, "utf8"), key: readFileSync(key, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

beforeAll(() => {
  tls = makeCertificate();
});

afterAll(async () => {
  await Promise.all(servers.map((server) => server.stop(true)));
});

const pass = (raw: unknown): Validation<unknown> => ({ ok: true, value: raw });

function readOptions(fetchFn: FetchJsonOptions<unknown>["fetch"]): FetchJsonOptions<unknown> {
  return {
    fetch: fetchFn,
    validate: pass,
    timeoutMs: 10_000,
    headers: { authorization: SECRET },
  };
}

const nativeFetch: FetchJsonOptions<unknown>["fetch"] = (input, init) => fetch(input, init);

async function assertRefused(
  origin: Server,
  fetchFn: FetchJsonOptions<unknown>["fetch"],
): Promise<void> {
  for (const status of REDIRECTS) {
    hits.length = 0;
    const result = await fetchJson(new URL(`/${status}`, origin.url), readOptions(fetchFn));
    assert.equal(result.ok, false, String(status));
    assert.equal(!result.ok && result.error.kind, "http");
    assert.equal(!result.ok && result.error.kind === "http" && result.error.status, status);
    assert.equal(hits.length, 0, `destination requests for ${status}`);
    assert.ok(hits.every((hit) => hit.authorization === null));
  }
}

test("same-origin read redirect is refused", async () => {
  const origin = redirector((path) => `/dest${path}`);
  await assertRefused(origin, nativeFetch);
});

test("cross-origin read redirect is refused", async () => {
  const target = destination();
  const origin = redirector((path) => new URL(`/dest${path}`, target.url).href);
  await assertRefused(origin, nativeFetch);
});

test("https-to-http read redirect is refused", async () => {
  assert.ok(tls !== undefined);
  const target = destination();
  const origin = redirector((path) => new URL(`/dest${path}`, target.url).href, { tls });
  const ca = tls.cert;
  // Certificate verification stays on: the test trusts only its own certificate.
  const trusting: FetchJsonOptions<unknown>["fetch"] = (input, init) =>
    fetch(input, { ...init, tls: { ca } });
  assert.equal(origin.url.protocol, "https:");
  await assertRefused(origin, trusting);
});

/** A peer that answers every request with `make()` and records the asked coding. */
function peer(make: (request: Request) => Response): URL {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) => {
      seenCodings.push(request.headers.get("accept-encoding"));
      return make(request);
    },
  });
  servers.push(server);
  return server.url;
}

const SMALL = JSON.stringify({ a: 1 });

function encoded(coding: string, status = 200, wire: string | null = "1"): Response {
  const headers = new Headers({ "content-encoding": coding });
  if (wire !== null) {
    headers.set("x-pulse-contract", wire);
  }
  return new Response(Bun.gzipSync(new TextEncoder().encode(SMALL)), { status, headers });
}

test("encoded answer is refused with a fixed cause", async () => {
  const marker = "x-upstream-marker";
  for (const coding of ["gzip", "br", "deflate", marker, "identity, gzip", "gzip, identity"]) {
    let validated = 0;
    const url = peer(() => encoded(coding));
    const options = {
      ...readOptions(nativeFetch),
      validate: (raw: unknown): Validation<unknown> => {
        validated += 1;
        return pass(raw);
      },
    };
    const read = await fetchJson(url, options);
    const write = await requestJson(url, { ...options, method: "POST", body: "{}" });
    for (const result of [read, write]) {
      assert.equal(result.ok, false, coding);
      const error = result.ok ? undefined : result.error;
      assert.equal(error?.kind, "network", coding);
      const cause = error?.kind === "network" ? error.cause : undefined;
      assert.ok(cause instanceof Error);
      assert.equal(cause.message, CAUSE);
      assert.ok(!`${JSON.stringify(result)} ${cause.message}`.includes("upstream"));
    }
    assert.equal(write.ok === false && write.response?.status, 200);
    assert.equal(validated, 0, coding);
  }
});

test("identity coding reads normally", async () => {
  for (const coding of [null, "identity", " Identity ", "IDENTITY", ""]) {
    seenCodings.length = 0;
    const url = peer(() => {
      const headers = new Headers({ "x-pulse-contract": "1" });
      if (coding !== null) {
        headers.set("content-encoding", coding);
      }
      return new Response(SMALL, { headers });
    });
    const result = await fetchJson(url, readOptions(nativeFetch));
    assert.deepEqual(result, { ok: true, value: { a: 1 }, wire: "ok" }, String(coding));
    assert.deepEqual(seenCodings, ["identity"]);
  }
});

test("wire mismatch and http status come before the encoding check", async () => {
  const mismatch = await fetchJson(
    peer(() => encoded("gzip", 200, "2")),
    readOptions(nativeFetch),
  );
  assert.equal(!mismatch.ok && mismatch.error.kind, "wire-mismatch");
  const unavailable = await fetchJson(
    peer(() => encoded("gzip", 503)),
    readOptions(nativeFetch),
  );
  assert.equal(!unavailable.ok && unavailable.error.kind, "http");
  assert.equal(
    !unavailable.ok && unavailable.error.kind === "http" && unavailable.error.status,
    503,
  );
});

test("non-2xx encoded write is an http error without message and keeps the response", async () => {
  const url = peer(() => {
    const response = encoded("gzip", 409);
    response.headers.set("etag", '"v1"');
    return response;
  });
  const result = await requestJson(url, { ...readOptions(nativeFetch), method: "PUT", body: "{}" });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "http", status: 409, wire: { status: "ok" } },
    response: { status: 409, etag: '"v1"', wire: { status: "ok" } },
  });
});

test("onWireAbsent runs once for a refused answer without a wire header", async () => {
  let absent = 0;
  const result = await fetchJson(
    peer(() => encoded("gzip", 200, null)),
    {
      ...readOptions(nativeFetch),
      onWireAbsent: () => {
        absent += 1;
      },
    },
  );
  assert.equal(!result.ok && result.error.kind, "network");
  assert.equal(absent, 1);
});

test("identity body above the default cap is too-large with and without a declared length", async () => {
  const big = new Uint8Array(DEFAULT_MAX_BODY_BYTES + 1).fill(0x20);
  const declared = peer(() => new Response(big, { headers: { "x-pulse-contract": "1" } }));
  const streamed = peer(
    () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(big);
            controller.close();
          },
        }),
        { headers: { "x-pulse-contract": "1" } },
      ),
  );
  for (const url of [declared, streamed]) {
    const result = await fetchJson(url, readOptions(nativeFetch));
    expect(result).toEqual({
      ok: false,
      error: { kind: "too-large", maxBytes: DEFAULT_MAX_BODY_BYTES },
    });
  }
});
