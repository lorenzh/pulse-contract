import { validateManualIncident, validateManualIncidentsResponse, } from "./validate.js";
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
function parseBody(text, validate, wire) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (error) {
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
async function exchange(url, options, signal) {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
    const init = { signal };
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
/**
 * GETs a JSON document and checks it. The timeout covers headers and body. It uses web APIs
 * only, and `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4, Node 20.3).
 * Order of checks: HTTP status, wire header, size, JSON, validation.
 */
export async function fetchJson(url, options) {
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
            return fail({ kind: "aborted", reason: caller.reason });
        }
        return await Promise.race([exchange(url, options, signal), interrupted]);
    }
    catch (error) {
        if (interruption === "timeout") {
            return fail({ kind: "timeout", timeoutMs: options.timeoutMs });
        }
        if (interruption === "aborted" || caller?.aborted === true) {
            return fail({ kind: "aborted", reason: caller?.reason });
        }
        return fail({ kind: "network", cause: error });
    }
    finally {
        stop();
        own.abort(); // frees a pending fetch or body read after a timeout, abort or cap
    }
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
