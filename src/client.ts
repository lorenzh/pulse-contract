import type { Validation } from "./validate.ts";
import { checkWireVersion, WIRE_VERSION_HEADER, type WireVersionCheck } from "./version.ts";

/** Default cap for a response body: 5 MiB. */
export const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;

/** Why `fetchJson` failed. `kind` tells the variants apart. */
export type FetchJsonError =
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "aborted"; reason: unknown }
  | { kind: "network"; cause: unknown }
  | { kind: "http"; status: number; wire: WireVersionCheck }
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
  fetch: typeof fetch;
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
    await response.body?.cancel().catch(() => undefined); // body is dropped anyway
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
      await reader.cancel().catch(() => undefined); // body is dropped anyway
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
  // Order: status, wire header, size, JSON, validation.
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined); // body is not needed
    return fail({ kind: "http", status: response.status, wire });
  }
  if (wire.status === "mismatch") {
    await response.body?.cancel().catch(() => undefined); // body is not needed
    return fail({ kind: "wire-mismatch", message: wire.error });
  }
  if (wire.status === "absent") {
    options.onWireAbsent?.();
  }
  const text = await readText(response, maxBytes);
  if (text === undefined) {
    return fail({ kind: "too-large", maxBytes });
  }
  return parseBody(text, options.validate, wire.status);
}

/**
 * GETs a JSON document and checks it. The timeout covers headers and body. It uses web APIs
 * only, and `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4, Node 20.3).
 * Order of checks: HTTP status, wire header, size, JSON, validation.
 */
export async function fetchJson<T>(
  url: string | URL,
  options: FetchJsonOptions<T>,
): Promise<FetchJsonResult<T>> {
  const own = new AbortController();
  const caller = options.signal;
  const signal = caller === undefined ? own.signal : AbortSignal.any([own.signal, caller]);
  let timedOut = false;
  let stop: () => void = () => undefined;
  // Settles first when the timer fires or the caller aborts, even if fetch ignores the signal.
  const interrupted = new Promise<never>((_, reject) => {
    const interrupt = (): void => reject(new Error("interrupted"));
    const schedule = options.schedule ?? defaultSchedule;
    const cancel = schedule(() => {
      timedOut = true;
      interrupt();
    }, options.timeoutMs);
    caller?.addEventListener("abort", interrupt, { once: true });
    stop = () => {
      cancel();
      caller?.removeEventListener("abort", interrupt);
    };
  });
  interrupted.catch(() => undefined); // the race below observes it
  try {
    if (caller?.aborted === true) {
      return fail({ kind: "aborted", reason: caller.reason });
    }
    return await Promise.race([exchange(url, options, signal), interrupted]);
  } catch (error) {
    if (timedOut) {
      return fail({ kind: "timeout", timeoutMs: options.timeoutMs });
    }
    if (caller?.aborted === true) {
      return fail({ kind: "aborted", reason: caller.reason });
    }
    return fail({ kind: "network", cause: error });
  } finally {
    stop();
    own.abort(); // frees a pending fetch or body read after a timeout, abort or cap
  }
}
