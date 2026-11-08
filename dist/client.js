import { MAX_REASON_LENGTH } from "./schema.js";
import { validateManualIncident, validateManualIncidentsResponse } from "./validate.js";
import { checkWireVersion, WIRE_VERSION_HEADER } from "./version.js";
/** Default cap for a response body: 5 MiB. */
export const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
const fail = (error) => ({
    ok: false,
    error,
});
/**
 * Cancels a body without waiting: a cancel on a `clone()` branch stays pending while the other
 * branch is open. The caller aborts the request right after.
 */
function dropBody(cancel) {
    cancel?.().catch(() => undefined); // body is dropped anyway
}
const defaultSchedule = (fn, ms) => {
    const handle = setTimeout(fn, ms);
    return () => clearTimeout(handle);
};
/** Concatenates chunks and decodes them as UTF-8. */
function decode(chunks, total) {
    const all = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
    }
    return new TextDecoder().decode(all);
}
/** Reads the body as text. Returns `undefined` when it is larger than `maxBytes`. */
async function readText(response, maxBytes) {
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
    const chunks = [];
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
/**
 * The init both functions send: no redirect, identity coding only, and no runtime decompression.
 * `accept-encoding` is set after the caller's headers, so it replaces a caller value.
 */
function clientInit(headers, signal) {
    const sent = new Headers(headers);
    sent.set("accept-encoding", "identity");
    return { signal, redirect: "manual", decompress: false, headers: sent };
}
/**
 * Bun with `decompress: false` hands over the encoded bytes, so an encoded body is refused before
 * any read. Node and browsers decode inside the stream that `readText` counts, so the cap holds.
 */
function isEncodingRefused(response) {
    if (!("Bun" in globalThis)) {
        return false;
    }
    const coding = response.headers.get("content-encoding")?.trim().toLowerCase() ?? "";
    return coding !== "" && coding !== "identity";
}
/** The `network` cause of a refused content coding. It never holds the received header. */
const encodingRefused = () => ({
    kind: "network",
    cause: new Error("response content-encoding is not supported"),
});
function parseBody(text, validate, wire) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        // The parser text is ignored on purpose: it can quote untrusted body text.
        return fail({ kind: "invalid-json", message: "response body is not valid JSON" });
    }
    const checked = validate(raw);
    if (!checked.ok) {
        return fail({ kind: "validation", message: checked.error });
    }
    return { ok: true, value: checked.value, wire };
}
async function exchange(url, options, signal) {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
    const response = await options.fetch(url, clientInit(options.headers, signal));
    const wire = checkWireVersion(response.headers.get(WIRE_VERSION_HEADER));
    if (wire.status === "absent") {
        options.onWireAbsent?.();
    }
    // Order: status, wire header, content encoding, size, JSON, validation.
    if (!response.ok) {
        dropBody(response.body?.cancel.bind(response.body));
        return fail({ kind: "http", status: response.status, wire });
    }
    if (wire.status === "mismatch") {
        dropBody(response.body?.cancel.bind(response.body));
        return fail({ kind: "wire-mismatch", message: wire.error });
    }
    if (isEncodingRefused(response)) {
        dropBody(response.body?.cancel.bind(response.body));
        return fail(encodingRefused());
    }
    const text = await readText(response, maxBytes);
    if (text === undefined) {
        return fail({ kind: "too-large", maxBytes });
    }
    return parseBody(text, options.validate, wire.status);
}
/**
 * Runs `run` under the timeout and the caller's signal. The timeout covers headers and body.
 * `onFail` maps an interruption or a thrown error to the result.
 */
async function interruptible(options, run, onFail) {
    const own = new AbortController();
    const caller = options.signal;
    const signal = caller === undefined ? own.signal : AbortSignal.any([own.signal, caller]);
    // The first interruption wins: a timer that fires after a caller abort does not turn it into a timeout.
    let interruption;
    let stop = () => undefined;
    // Settles first when the timer fires or the caller aborts, even if fetch ignores the signal.
    const interrupted = new Promise((_, reject) => {
        const interrupt = (kind) => {
            interruption ??= kind;
            reject(new Error("interrupted"));
        };
        const onAbort = () => interrupt("aborted");
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
    }
    catch (error) {
        if (interruption === "timeout") {
            return onFail({ kind: "timeout", timeoutMs: options.timeoutMs });
        }
        if (interruption === "aborted" || caller?.aborted === true) {
            return onFail({ kind: "aborted", reason: caller?.reason });
        }
        return onFail({ kind: "network", cause: error });
    }
    finally {
        stop();
        own.abort(); // frees a pending fetch or body read after a timeout, abort or cap
    }
}
/**
 * GETs a JSON document and checks it. The timeout covers headers and body. It uses web APIs
 * only, and `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4, Node 20.3).
 * Order of checks: HTTP status, wire header, content encoding, size, JSON, validation.
 * It follows no redirect: a 3xx is an `http` error (status 0 for a browser's opaque redirect).
 * It asks for identity coding; under Bun an encoded body is refused as `network`.
 */
export function fetchJson(url, options) {
    return interruptible(options, (signal) => exchange(url, options, signal), fail);
}
/** The `error` text of an `ErrorResponse` body, from an own data property only. */
function errorText(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        // A body that is not JSON just carries no reason.
        return undefined;
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(raw, "error");
    const value = descriptor?.value;
    return typeof value === "string" ? value.slice(0, MAX_REASON_LENGTH) : undefined;
}
async function requestBody(response, meta, options) {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
    const failed = (error) => ({
        ok: false,
        error,
        response: meta,
    });
    const { wire } = meta;
    // Order: status, wire header, content encoding, size, empty body, JSON, validation.
    // For a non-2xx answer the encoding check decides whether the body may be read for `message`.
    if (response.status < 200 || response.status > 299) {
        if (isEncodingRefused(response)) {
            dropBody(response.body?.cancel.bind(response.body));
            return failed({ kind: "http", status: response.status, wire });
        }
        const text = await readText(response, maxBytes);
        const message = text === undefined ? undefined : errorText(text);
        return failed(message === undefined
            ? { kind: "http", status: response.status, wire }
            : { kind: "http", status: response.status, wire, message });
    }
    if (wire.status === "mismatch") {
        dropBody(response.body?.cancel.bind(response.body));
        return failed({ kind: "wire-mismatch", message: wire.error });
    }
    if (isEncodingRefused(response)) {
        dropBody(response.body?.cancel.bind(response.body));
        return failed(encodingRefused());
    }
    const text = await readText(response, maxBytes);
    if (text === undefined) {
        return failed({ kind: "too-large", maxBytes });
    }
    const done = { ok: true, status: response.status, etag: meta.etag, wire: wire.status };
    if (text === "") {
        return { ...done, value: undefined };
    }
    const parsed = parseBody(text, options.validate, wire.status);
    return parsed.ok ? { ...done, value: parsed.value } : failed(parsed.error);
}
async function requestExchange(url, options, signal, state) {
    const init = clientInit(options.headers, signal);
    init.method = options.method;
    if (options.body !== undefined) {
        init.headers.set("content-type", "application/json");
        init.body = options.body;
    }
    const response = await options.fetch(url, init);
    const meta = {
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
 * Order of checks: HTTP status, wire header, content encoding, size, empty body, JSON, validation.
 * Under Bun an encoded `2xx` body is `network`, and an encoded non-`2xx` answer is `http` without
 * `message`, because its body is not read.
 */
export function requestJson(url, options) {
    const state = { response: null };
    return interruptible(options, (signal) => requestExchange(url, options, signal, state), (error) => ({ ok: false, error, response: state.response }));
}
function withValidator(options, validate) {
    return { ...options, validate };
}
/**
 * GETs `<baseUrl>/manual-incidents`, optionally filtered by `status`. With `isAbsentTolerated`,
 * a 404 gives an empty list (`wire` is `absent`); every other failure is returned as is.
 */
export async function getManualIncidents(baseUrl, options, status) {
    const url = new URL("manual-incidents", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (status !== undefined) {
        url.searchParams.set("status", status);
    }
    const result = await fetchJson(url, withValidator(options, validateManualIncidentsResponse));
    if (!result.ok &&
        options.isAbsentTolerated === true &&
        result.error.kind === "http" &&
        result.error.status === 404) {
        return { ok: true, value: [], wire: "absent" };
    }
    return result;
}
/** GETs `<baseUrl>/manual-incidents/<id>`. A 404 is returned as an `http` error. */
export function getManualIncident(baseUrl, id, options) {
    const url = new URL(`manual-incidents/${encodeURIComponent(String(id))}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    return fetchJson(url, withValidator(options, validateManualIncident));
}
