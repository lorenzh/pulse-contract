import { MAX_REASON_LENGTH, type ManualIncident, type ManualIncidentsResponse } from "./schema.ts";
import { validateManualIncident, validateManualIncidentsResponse } from "./validate.ts";
import type { Validation } from "./validate-core.ts";
import { checkWireVersion, WIRE_VERSION_HEADER, type WireVersionCheck } from "./version.ts";

/** Default cap for a response body: 5 MiB. */
export const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;

/** Why `fetchJson` failed. `kind` tells the variants apart. */
export type FetchJsonError =
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "aborted"; reason: unknown }
  | { kind: "network"; cause: unknown }
  /** `message` is set only by `requestJson`: the `error` text of an `ErrorResponse` body. */
  | { kind: "http"; status: number; wire: WireVersionCheck; message?: string }
  | { kind: "too-large"; maxBytes: number }
  | { kind: "invalid-json"; message: string }
  | { kind: "wire-mismatch"; message: string }
  | { kind: "validation"; message: string; path?: string };

/** Outcome of `fetchJson`. It does not throw for expected failures. */
export type FetchJsonResult<T> =
  | { ok: true; value: T; wire: "ok" | "absent" }
  | { ok: false; error: FetchJsonError };

export type FetchJsonOptions<T> = {
  /** The fetch implementation to call. */
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  /** Checks the parsed body, for example `(raw) => validateChecksResponse(raw)`. */
  validate: (raw: unknown) => Validation<T>;
  /** Limit for headers and body together. */
  timeoutMs: number;
  /** Caller abort, combined with the timeout. */
  signal?: AbortSignal;
  /** Body limit in bytes. Defaults to `DEFAULT_MAX_BODY_BYTES`. */
  maxBytes?: number;
  headers?: NonNullable<RequestInit["headers"]>;
  /** Called for each response that has no wire-version header. */
  onWireAbsent?: () => void;
  /** Timer injection. Returns a function that cancels the timer. Defaults to `setTimeout`. */
  schedule?: (fn: () => void, ms: number) => () => void;
};

type Outcome<T> = FetchJsonResult<T>;

const fail = (error: FetchJsonError): { ok: false; error: FetchJsonError } => ({
  ok: false,
  error,
});

/**
 * Cancels a body without waiting: a cancel on a `clone()` branch stays pending while the other
 * branch is open. The caller aborts the request right after.
 */
function dropBody(cancel: (() => Promise<void>) | undefined): void {
  cancel?.().catch(() => undefined); // body is dropped anyway
}

const defaultSchedule = (fn: () => void, ms: number): (() => void) => {
  const handle = setTimeout(fn, ms);
  return () => clearTimeout(handle);
};

/** Concatenates chunks and decodes them as UTF-8. */
function decode(chunks: Uint8Array[], total: number): string {
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(all);
}

/** Reads the body as text. Returns `undefined` when it is larger than `maxBytes`. */
async function readText(response: Response, maxBytes: number): Promise<string | undefined> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    dropBody(response.body?.cancel.bind(response.body));
    return undefined;
  }
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).length > maxBytes ? undefined : text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.length;
    if (total > maxBytes) {
      dropBody(reader.cancel.bind(reader));
      return undefined;
    }
    chunks.push(value);
  }
  return decode(chunks, total);
}

function parseBody<T>(
  text: string,
  validate: (raw: unknown) => Validation<T>,
  wire: "ok" | "absent",
): Outcome<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return fail({
      kind: "invalid-json",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const checked = validate(raw);
  if (!checked.ok) {
    return fail({ kind: "validation", message: checked.error });
  }
  return { ok: true, value: checked.value, wire };
}

async function exchange<T>(
  url: string | URL,
  options: FetchJsonOptions<T>,
  signal: AbortSignal,
): Promise<Outcome<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const init: RequestInit = { signal };
  if (options.headers !== undefined) {
    init.headers = options.headers;
  }
  const response = await options.fetch(url, init);
  const wire = checkWireVersion(response.headers.get(WIRE_VERSION_HEADER));
  if (wire.status === "absent") {
    options.onWireAbsent?.();
  }
  // Order: status, wire header, size, JSON, validation.
  if (!response.ok) {
    dropBody(response.body?.cancel.bind(response.body));
    return fail({ kind: "http", status: response.status, wire });
  }
  if (wire.status === "mismatch") {
    dropBody(response.body?.cancel.bind(response.body));
    return fail({ kind: "wire-mismatch", message: wire.error });
  }
  const text = await readText(response, maxBytes);
  if (text === undefined) {
    return fail({ kind: "too-large", maxBytes });
  }
  return parseBody(text, options.validate, wire.status);
}

type Interruptible = {
  timeoutMs: number;
  signal?: AbortSignal;
  schedule?: (fn: () => void, ms: number) => () => void;
};

/**
 * Runs `run` under the timeout and the caller's signal. The timeout covers headers and body.
 * `onFail` maps an interruption or a thrown error to the result.
 */
async function interruptible<R>(
  options: Interruptible,
  run: (signal: AbortSignal) => Promise<R>,
  onFail: (error: FetchJsonError) => R,
): Promise<R> {
  const own = new AbortController();
  const caller = options.signal;
  const signal = caller === undefined ? own.signal : AbortSignal.any([own.signal, caller]);
  // The first interruption wins: a timer that fires after a caller abort does not turn it into a timeout.
  let interruption: "timeout" | "aborted" | undefined;
  let stop: () => void = () => undefined;
  // Settles first when the timer fires or the caller aborts, even if fetch ignores the signal.
  const interrupted = new Promise<never>((_, reject) => {
    const interrupt = (kind: "timeout" | "aborted"): void => {
      interruption ??= kind;
      reject(new Error("interrupted"));
    };
    const onAbort = (): void => interrupt("aborted");
    const schedule = options.schedule ?? defaultSchedule;
    const cancel = schedule(() => interrupt("timeout"), options.timeoutMs);
    caller?.addEventListener("abort", onAbort, { once: true });
    stop = () => {
      cancel();
      caller?.removeEventListener("abort", onAbort);
    };
  });
  interrupted.catch(() => undefined); // the race below observes it
  try {
    if (caller?.aborted === true) {
      return onFail({ kind: "aborted", reason: caller.reason });
    }
    return await Promise.race([run(signal), interrupted]);
  } catch (error) {
    if (interruption === "timeout") {
      return onFail({ kind: "timeout", timeoutMs: options.timeoutMs });
    }
    if (interruption === "aborted" || caller?.aborted === true) {
      return onFail({ kind: "aborted", reason: caller?.reason });
    }
    return onFail({ kind: "network", cause: error });
  } finally {
    stop();
    own.abort(); // frees a pending fetch or body read after a timeout, abort or cap
  }
}

/**
 * GETs a JSON document and checks it. The timeout covers headers and body. It uses web APIs
 * only, and `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4, Node 20.3).
 * Order of checks: HTTP status, wire header, size, JSON, validation.
 */
export function fetchJson<T>(
  url: string | URL,
  options: FetchJsonOptions<T>,
): Promise<FetchJsonResult<T>> {
  return interruptible<FetchJsonResult<T>>(
    options,
    (signal) => exchange(url, options, signal),
    fail,
  );
}

/** Status, `ETag` and wire check of a response whose headers arrived. */
export type RequestJsonResponse = { status: number; etag: string | null; wire: WireVersionCheck };

export type RequestJsonOptions<T> = Omit<FetchJsonOptions<T>, "onWireAbsent"> & {
  method: "POST" | "PUT" | "DELETE";
  /** JSON text, sent with `content-type: application/json`. */
  body?: string;
};

/**
 * Outcome of `requestJson`. It does not throw for expected failures. `response` is set exactly
 * when the response headers arrived: a failure with a `2xx` `response.status` means the server
 * answered `2xx`, and only reading or checking its body failed.
 */
export type RequestJsonResult<T> =
  | { ok: true; status: number; value: T | undefined; etag: string | null; wire: "ok" | "absent" }
  | { ok: false; error: FetchJsonError; response: RequestJsonResponse | null };

/** The `error` text of an `ErrorResponse` body, from an own data property only. */
function errorText(text: string): string | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // A body that is not JSON just carries no reason.
    return undefined;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(raw, "error");
  const value: unknown = descriptor?.value;
  return typeof value === "string" ? value.slice(0, MAX_REASON_LENGTH) : undefined;
}

type Meta = { response: RequestJsonResponse | null };

async function requestBody<T>(
  response: Response,
  meta: RequestJsonResponse,
  options: RequestJsonOptions<T>,
): Promise<RequestJsonResult<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const failed = (error: FetchJsonError): RequestJsonResult<T> => ({
    ok: false,
    error,
    response: meta,
  });
  const { wire } = meta;
  // Order: status, wire header, size, JSON, validation.
  if (response.status < 200 || response.status > 299) {
    const text = await readText(response, maxBytes);
    const message = text === undefined ? undefined : errorText(text);
    return failed(
      message === undefined
        ? { kind: "http", status: response.status, wire }
        : { kind: "http", status: response.status, wire, message },
    );
  }
  if (wire.status === "mismatch") {
    dropBody(response.body?.cancel.bind(response.body));
    return failed({ kind: "wire-mismatch", message: wire.error });
  }
  const text = await readText(response, maxBytes);
  if (text === undefined) {
    return failed({ kind: "too-large", maxBytes });
  }
  const done = { ok: true, status: response.status, etag: meta.etag, wire: wire.status } as const;
  if (text === "") {
    return { ...done, value: undefined };
  }
  const parsed = parseBody(text, options.validate, wire.status);
  return parsed.ok ? { ...done, value: parsed.value } : failed(parsed.error);
}

async function requestExchange<T>(
  url: string | URL,
  options: RequestJsonOptions<T>,
  signal: AbortSignal,
  state: Meta,
): Promise<RequestJsonResult<T>> {
  const headers = new Headers(options.headers);
  const init: RequestInit = { method: options.method, redirect: "manual", signal, headers };
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = options.body;
  }
  const response = await options.fetch(url, init);
  const meta: RequestJsonResponse = {
    status: response.status,
    etag: response.headers.get("etag"),
    wire: checkWireVersion(response.headers.get(WIRE_VERSION_HEADER)),
  };
  state.response = meta;
  return requestBody(response, meta, options);
}

/**
 * Sends a POST, PUT or DELETE with an optional JSON body. It never follows a redirect and never
 * retries; timeout, abort, size cap and wire check work as in `fetchJson`. A non-`2xx` answer is
 * an `http` error whose `message` is the `ErrorResponse.error` text (at most 1000 characters) when
 * the body is one and fits `maxBytes`. A `204` or empty body gives `value` `undefined`.
 */
export function requestJson<T>(
  url: string | URL,
  options: RequestJsonOptions<T>,
): Promise<RequestJsonResult<T>> {
  const state: Meta = { response: null };
  return interruptible<RequestJsonResult<T>>(
    options,
    (signal) => requestExchange(url, options, signal, state),
    (error) => ({ ok: false, error, response: state.response }),
  );
}

export type ManualIncidentReadOptions = Omit<FetchJsonOptions<unknown>, "validate"> & {
  /** Treat a 404 (an older api without the route) as "no manual incidents". */
  isAbsentTolerated?: boolean;
};

function withValidator<T>(
  options: ManualIncidentReadOptions,
  validate: (raw: unknown) => Validation<T>,
): FetchJsonOptions<T> {
  return { ...options, validate };
}

/**
 * GETs `<baseUrl>/manual-incidents`, optionally filtered by `status`. With `isAbsentTolerated`,
 * a 404 gives an empty list (`wire` is `absent`); every other failure is returned as is.
 */
export async function getManualIncidents(
  baseUrl: string,
  options: ManualIncidentReadOptions,
  status?: "open" | "resolved" | "all",
): Promise<FetchJsonResult<ManualIncidentsResponse>> {
  const url = new URL("manual-incidents", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (status !== undefined) {
    url.searchParams.set("status", status);
  }
  const result = await fetchJson(url, withValidator(options, validateManualIncidentsResponse));
  if (
    !result.ok &&
    options.isAbsentTolerated === true &&
    result.error.kind === "http" &&
    result.error.status === 404
  ) {
    return { ok: true, value: [], wire: "absent" };
  }
  return result;
}

/** GETs `<baseUrl>/manual-incidents/<id>`. A 404 is returned as an `http` error. */
export function getManualIncident(
  baseUrl: string,
  id: number,
  options: ManualIncidentReadOptions,
): Promise<FetchJsonResult<ManualIncident>> {
  const url = new URL(
    `manual-incidents/${encodeURIComponent(String(id))}`,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  return fetchJson(url, withValidator(options, validateManualIncident));
}
