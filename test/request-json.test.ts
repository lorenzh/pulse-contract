import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MAX_BODY_BYTES,
  type RequestJsonOptions,
  type RequestJsonResult,
  requestJson,
  type Validation,
  WIRE_VERSION_HEADER,
} from "../src/index.ts";

type FetchFn = RequestJsonOptions<unknown>["fetch"];
type Call = { input: string | URL | Request; init: RequestInit | undefined };

const URL_ = "http://api.test/admin/checks/web";
const ETAG = '"sha256-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"';
const pass = (raw: unknown): Validation<unknown> => ({ ok: true, value: raw });

function fakeFetch(answer: (signal: AbortSignal) => Promise<Response> | Response): {
  fetch: FetchFn;
  calls: Call[];
} {
  const calls: Call[] = [];
  const fetch: FetchFn = async (input, init) => {
    calls.push({ input, init });
    const signal = init?.signal;
    if (!signal) {
      throw new Error("no signal");
    }
    return answer(signal);
  };
  return { fetch, calls };
}

function fakeTimer(): { schedule: (fn: () => void) => () => void; fire: () => void } {
  let pending: (() => void) | undefined;
  return {
    schedule: (fn) => {
      pending = fn;
      return () => {
        pending = undefined;
      };
    },
    fire: () => pending?.(),
  };
}

const json = (status: number, body: string, headers: Record<string, string> = {}): Response =>
  new Response(body, { status, headers: { [WIRE_VERSION_HEADER]: "1", ...headers } });

function options(
  fetch: FetchFn,
  extra: Partial<RequestJsonOptions<unknown>> = {},
): RequestJsonOptions<unknown> {
  return {
    fetch,
    method: "PUT",
    timeoutMs: 5000,
    validate: pass,
    schedule: () => () => undefined,
    ...extra,
  };
}

async function once(
  response: Response,
  extra: Partial<RequestJsonOptions<unknown>> = {},
): Promise<RequestJsonResult<unknown>> {
  const fake = fakeFetch(() => response);
  const result = await requestJson(URL_, options(fake.fetch, extra));
  assert.equal(fake.calls.length, 1);
  return result;
}

test("passes method, body, content type and redirect manual", async () => {
  const fake = fakeFetch(() => json(201, '{"id":"web"}', { etag: ETAG }));
  const result = await requestJson(URL_, options(fake.fetch, { method: "POST", body: '{"a":1}' }));
  assert.equal(fake.calls.length, 1);
  const init = fake.calls[0]?.init;
  assert.equal(init?.method, "POST");
  assert.equal(init?.body, '{"a":1}');
  assert.equal(init?.redirect, "manual");
  assert.equal(new Headers(init?.headers).get("content-type"), "application/json");
  assert.deepEqual(result, { ok: true, status: 201, value: { id: "web" }, etag: ETAG, wire: "ok" });
});

test("a 204 without a body gives value undefined and skips validation", async () => {
  const fail = (): Validation<unknown> => ({ ok: false, error: "never" });
  const result = await once(
    new Response(null, { status: 204, headers: { [WIRE_VERSION_HEADER]: "1" } }),
    {
      method: "DELETE",
      validate: fail,
    },
  );
  assert.deepEqual(result, { ok: true, status: 204, value: undefined, etag: null, wire: "ok" });
});

test("a 412 ErrorResponse gives its message", async () => {
  const result = await once(
    json(412, '{"error":"the configuration changed: reload it and retry"}'),
  );
  assert.deepEqual(result, {
    ok: false,
    error: {
      kind: "http",
      status: 412,
      wire: { status: "ok" },
      message: "the configuration changed: reload it and retry",
    },
    response: { status: 412, etag: null, wire: { status: "ok" } },
  });
});

test("a 500 with a non-JSON body has no message", async () => {
  const result = await once(json(500, "<html>oops</html>"));
  assert.deepEqual(result.ok === false && result.error, {
    kind: "http",
    status: 500,
    wire: { status: "ok" },
  });
});

test("a 302 is an http error and is not followed", async () => {
  const result = await once(json(302, "", { location: "/admin/checks/web" }));
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.error.kind, "http");
  assert.equal(result.ok === false && result.error.kind === "http" && result.error.status, 302);
  assert.equal(result.ok === false && result.response?.status, 302);
});

test("error text is bounded to 1000 characters", async () => {
  const result = await once(json(422, JSON.stringify({ error: "x".repeat(1500) })));
  const message =
    result.ok === false && result.error.kind === "http" ? result.error.message : undefined;
  assert.equal(message, "x".repeat(1000));
});

test("error text comes only from an own string property", async () => {
  for (const body of ['{"__proto__":{"error":"inherited"}}', '{"error":5}', '["error"]', "null"]) {
    const result = await once(json(400, body));
    assert.equal(
      result.ok === false && result.error.kind === "http" && "message" in result.error,
      false,
    );
  }
});

test("a 2xx over maxBytes is too-large with the response", async () => {
  const result = await once(json(200, "a".repeat(DEFAULT_MAX_BODY_BYTES + 1), { etag: ETAG }));
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "too-large", maxBytes: DEFAULT_MAX_BODY_BYTES },
    response: {
      status: 200,
      etag: '"sha256-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
      wire: { status: "ok" },
    },
  });
});

test("an oversized 422 ErrorResponse is http without message", async () => {
  const body = JSON.stringify({ error: "y".repeat(100) });
  const result = await once(json(422, body), { maxBytes: body.length - 1 });
  assert.deepEqual(result.ok === false && result.error, {
    kind: "http",
    status: 422,
    wire: { status: "ok" },
  });
});

test("wire 2 on a 2xx is wire-mismatch with the response", async () => {
  const result = await once(
    new Response("{}", { status: 200, headers: { [WIRE_VERSION_HEADER]: "2" } }),
  );
  assert.equal(result.ok === false && result.error.kind, "wire-mismatch");
  assert.equal(result.ok === false && result.response?.status, 200);
});

test("a missing wire header on a 201 succeeds with wire absent", async () => {
  const result = await once(new Response("{}", { status: 201 }));
  assert.deepEqual(result, { ok: true, status: 201, value: {}, etag: null, wire: "absent" });
});

test("invalid JSON and failed validation keep the response", async () => {
  const bad = await once(json(201, "not json"));
  assert.equal(bad.ok === false && bad.error.kind, "invalid-json");
  assert.equal(bad.ok === false && bad.response?.status, 201);
  const invalid = await once(json(200, "{}"), { validate: () => ({ ok: false, error: "bad" }) });
  assert.equal(invalid.ok === false && invalid.error.kind, "validation");
  assert.equal(invalid.ok === false && invalid.response?.status, 200);
});

test("a network error gives response null", async () => {
  const fake = fakeFetch(() => {
    throw new TypeError("connection refused");
  });
  const result = await requestJson(URL_, options(fake.fetch));
  assert.equal(result.ok === false && result.error.kind, "network");
  assert.equal(result.ok === false && result.response, null);
  assert.equal(fake.calls.length, 1);
});

const never = (signal: AbortSignal): Promise<Response> =>
  new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));

test("a timeout before the headers gives response null", async () => {
  const timer = fakeTimer();
  const fake = fakeFetch(never);
  const pending = requestJson(URL_, options(fake.fetch, { schedule: timer.schedule }));
  await Promise.resolve();
  timer.fire();
  const result = await pending;
  assert.equal(result.ok === false && result.error.kind, "timeout");
  assert.equal(result.ok === false && result.response, null);
  assert.equal(fake.calls.length, 1);
});

test("a caller abort before the headers gives response null", async () => {
  const controller = new AbortController();
  const fake = fakeFetch(never);
  const pending = requestJson(URL_, options(fake.fetch, { signal: controller.signal }));
  await Promise.resolve();
  controller.abort();
  const result = await pending;
  assert.equal(result.ok === false && result.error.kind, "aborted");
  assert.equal(result.ok === false && result.response, null);
  assert.equal(fake.calls.length, 1);
});

function stalledBody(): { response: Response; reading: Promise<void> } {
  let started: () => void = () => undefined;
  const reading = new Promise<void>((resolve) => {
    started = resolve;
  });
  const body = new ReadableStream<Uint8Array>({
    pull: () => {
      started();
      return new Promise(() => undefined); // the body never ends
    },
  });
  const response = new Response(body, { status: 201, headers: { [WIRE_VERSION_HEADER]: "1" } });
  return { response, reading };
}

test("a timeout during a 201 body keeps response.status 201", async () => {
  const timer = fakeTimer();
  const stalled = stalledBody();
  const fake = fakeFetch(() => stalled.response);
  const pending = requestJson(URL_, options(fake.fetch, { schedule: timer.schedule }));
  await stalled.reading;
  timer.fire();
  const result = await pending;
  assert.equal(result.ok === false && result.error.kind, "timeout");
  assert.deepEqual(result.ok === false && result.response, {
    status: 201,
    etag: null,
    wire: { status: "ok" },
  });
  assert.equal(fake.calls.length, 1);
});

test("an abort during a 201 body keeps response.status 201", async () => {
  const controller = new AbortController();
  const stalled = stalledBody();
  const fake = fakeFetch(() => stalled.response);
  const pending = requestJson(URL_, options(fake.fetch, { signal: controller.signal }));
  await stalled.reading;
  controller.abort();
  const result = await pending;
  assert.equal(result.ok === false && result.error.kind, "aborted");
  assert.equal(result.ok === false && result.response?.status, 201);
  assert.equal(fake.calls.length, 1);
});
