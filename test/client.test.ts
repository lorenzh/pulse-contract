import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkWireVersion,
  DEFAULT_MAX_BODY_BYTES,
  type FetchJsonOptions,
  fetchJson,
  type Validation,
  WIRE_VERSION,
  WIRE_VERSION_HEADER,
} from "../src/index.ts";

const pass = (raw: unknown): Validation<unknown> => ({ ok: true, value: raw });
const wireHeaders = { [WIRE_VERSION_HEADER]: String(WIRE_VERSION) };

type Timers = {
  schedule: NonNullable<FetchJsonOptions<unknown>["schedule"]>;
  fire: () => void;
  cancelled: () => boolean;
};

function fakeTimers(): Timers {
  let pending: (() => void) | undefined;
  let isCancelled = false;
  return {
    schedule: (fn) => {
      pending = fn;
      return () => {
        isCancelled = true;
      };
    },
    fire: () => pending?.(),
    cancelled: () => isCancelled,
  };
}

const respond =
  (make: () => Response): typeof fetch =>
  () =>
    Promise.resolve(make());

const base = (fetchFn: typeof fetch): FetchJsonOptions<unknown> => ({
  fetch: fetchFn,
  validate: pass,
  timeoutMs: 1000,
});

const json = (body: unknown, headers: Record<string, string> = wireHeaders): Response =>
  new Response(JSON.stringify(body), { headers });

const stalledBody = (): Response =>
  new Response(new ReadableStream<Uint8Array>({ start() {} }), { headers: wireHeaders });

test("returns the validated value with wire ok", async () => {
  const result = await fetchJson("https://x/", base(respond(() => json({ a: 1 }))));
  assert.deepEqual(result, { ok: true, value: { a: 1 }, wire: "ok" });
});

test("passes headers and signal to fetch", async () => {
  let seen: RequestInit | undefined;
  const fetchFn: typeof fetch = (_url, init) => {
    seen = init;
    return Promise.resolve(json([]));
  };
  await fetchJson("https://x/", { ...base(fetchFn), headers: { authorization: "k" } });
  assert.deepEqual(seen?.headers, { authorization: "k" });
  assert.ok(seen?.signal);
});

test("absent wire header is tolerated and reported per response", async () => {
  let calls = 0;
  const options = { ...base(respond(() => json(1, {}))), onWireAbsent: () => calls++ };
  const first = await fetchJson("https://x/", options);
  await fetchJson("https://x/", options);
  assert.deepEqual(first, { ok: true, value: 1, wire: "absent" });
  assert.equal(calls, 2);
});

test("wire mismatch is a typed error with the checkWireVersion text", async () => {
  const result = await fetchJson(
    "https://x/",
    base(respond(() => json(1, { [WIRE_VERSION_HEADER]: "99" }))),
  );
  const expected = checkWireVersion("99");
  assert.equal(expected.status, "mismatch");
  assert.deepEqual(result, {
    ok: false,
    error: {
      kind: "wire-mismatch",
      message: expected.status === "mismatch" ? expected.error : "",
    },
  });
});

test("http status is checked before the wire header and carries the wire check", async () => {
  const result = await fetchJson(
    "https://x/",
    base(
      respond(() => new Response("no", { status: 503, headers: { [WIRE_VERSION_HEADER]: "99" } })),
    ),
  );
  assert.equal(result.ok, false);
  if (!result.ok && result.error.kind === "http") {
    assert.equal(result.error.status, 503);
    assert.equal(result.error.wire.status, "mismatch");
  } else {
    assert.fail("expected an http error");
  }
});

test("invalid json", async () => {
  const result = await fetchJson(
    "https://x/",
    base(respond(() => new Response("{nope", { headers: wireHeaders }))),
  );
  assert.equal(!result.ok && result.error.kind, "invalid-json");
});

test("validation error keeps the validator message", async () => {
  const result = await fetchJson("https://x/", {
    ...base(respond(() => json({}))),
    validate: () => ({ ok: false, error: "checks[0].id: must be a string" }),
  });
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "validation", message: "checks[0].id: must be a string" },
  });
});

test("content-length above the cap is too large without reading", async () => {
  let isRead = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        isRead = true;
      },
    },
    { highWaterMark: 0 },
  );
  const result = await fetchJson("https://x/", {
    ...base(
      respond(() => new Response(body, { headers: { ...wireHeaders, "content-length": "100" } })),
    ),
    maxBytes: 10,
  });
  assert.deepEqual(result, { ok: false, error: { kind: "too-large", maxBytes: 10 } });
  assert.equal(isRead, false);
});

test("streamed bytes above the cap are too large without content-length", async () => {
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(8));
    },
  });
  const result = await fetchJson("https://x/", {
    ...base(respond(() => new Response(body, { headers: wireHeaders }))),
    maxBytes: 20,
  });
  assert.deepEqual(result, { ok: false, error: { kind: "too-large", maxBytes: 20 } });
});

test("the cap counts bytes, not characters", async () => {
  const text = JSON.stringify("ééééé"); // 12 bytes, 7 characters
  const result = await fetchJson("https://x/", {
    ...base(respond(() => new Response(text, { headers: wireHeaders }))),
    maxBytes: 8,
  });
  assert.equal(!result.ok && result.error.kind, "too-large");
});

test("a response without a body stream is read as text and capped", async () => {
  const fake = {
    ok: true,
    status: 200,
    headers: new Headers(wireHeaders),
    body: null,
    text: () => Promise.resolve('"abcdefghij"'),
  };
  const fetchFn = (() => Promise.resolve(fake)) as unknown as typeof fetch; // minimal Response fake
  const small = await fetchJson("https://x/", base(fetchFn));
  assert.equal(small.ok, true);
  const big = await fetchJson("https://x/", { ...base(fetchFn), maxBytes: 5 });
  assert.equal(!big.ok && big.error.kind, "too-large");
});

test("the default cap is 5 MiB", () => {
  assert.equal(DEFAULT_MAX_BODY_BYTES, 5 * 1024 * 1024);
});

test("stalled headers time out and abort the request", async () => {
  const timers = fakeTimers();
  let signal: AbortSignal | null | undefined;
  const fetchFn: typeof fetch = (_url, init) => {
    signal = init?.signal;
    return new Promise(() => undefined);
  };
  const pending = fetchJson("https://x/", { ...base(fetchFn), schedule: timers.schedule });
  timers.fire();
  assert.deepEqual(await pending, { ok: false, error: { kind: "timeout", timeoutMs: 1000 } });
  assert.equal(signal?.aborted, true);
  assert.equal(timers.cancelled(), true);
});

test("a stalled body times out", async () => {
  const timers = fakeTimers();
  const pending = fetchJson("https://x/", {
    ...base(respond(stalledBody)),
    schedule: timers.schedule,
  });
  await new Promise((resolve) => setImmediate(resolve));
  timers.fire();
  assert.equal(!(await pending).ok, true);
});

test("a fetch that ignores the signal still times out", async () => {
  const timers = fakeTimers();
  const pending = fetchJson("https://x/", {
    ...base(() => new Promise<Response>(() => undefined)),
    schedule: timers.schedule,
  });
  timers.fire();
  const result = await pending;
  assert.equal(!result.ok && result.error.kind, "timeout");
});

test("the real timer times out a stalled fetch", async () => {
  const result = await fetchJson("https://x/", {
    ...base(() => new Promise<Response>(() => undefined)),
    timeoutMs: 5,
  });
  assert.equal(!result.ok && result.error.kind, "timeout");
});

test("caller abort is aborted, not timeout", async () => {
  const timers = fakeTimers();
  const controller = new AbortController();
  const pending = fetchJson("https://x/", {
    ...base(() => new Promise<Response>(() => undefined)),
    schedule: timers.schedule,
    signal: controller.signal,
  });
  controller.abort("stop");
  assert.deepEqual(await pending, { ok: false, error: { kind: "aborted", reason: "stop" } });
  assert.equal(timers.cancelled(), true);
});

test("an already aborted signal does not call fetch", async () => {
  let calls = 0;
  const result = await fetchJson("https://x/", {
    ...base(() => {
      calls++;
      return Promise.resolve(json(1));
    }),
    signal: AbortSignal.abort("early"),
  });
  assert.equal(!result.ok && result.error.kind, "aborted");
  assert.equal(calls, 0);
});

test("fetch rejection keeps its cause", async () => {
  const cause = Object.assign(new Error("refused"), { code: "ECONNREFUSED" });
  const result = await fetchJson(
    "https://x/",
    base(() => Promise.reject(cause)),
  );
  assert.deepEqual(result, { ok: false, error: { kind: "network", cause } });
});
