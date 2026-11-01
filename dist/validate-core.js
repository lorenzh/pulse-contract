export const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/**
 * Reads an own data property. Inherited names such as `constructor` and accessors count as
 * absent; a getter never runs.
 */
export function ownValue(parent, key) {
    if (typeof parent !== "object" || parent === null) {
        return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(parent, key);
    return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}
/** `checks[2].intervalMs` style: indexes in brackets, keys after a dot. */
function formatPath(base, keys) {
    let path = base;
    for (const key of keys) {
        path += typeof key === "number" ? `[${key}]` : `.${String(key)}`;
    }
    return path;
}
/** The first problem of a failed parse as `<path>: <problem>`. */
function firstError(error, value, base) {
    const issue = error.issues[0];
    if (issue === undefined) {
        return `${base}: is invalid`;
    }
    const path = formatPath(base, issue.path);
    let at = value;
    for (const key of issue.path) {
        at = ownValue(at, key);
    }
    return `${path}: ${at === undefined && issue.path.length > 0 ? "is required" : issue.message}`;
}
function defOf(schema) {
    // Zod keeps the schema description in `_zod.def`; only the fields read here are typed.
    return schema._zod.def;
}
function define(target, key, value, isEnumerable = true) {
    // defineProperty, because assigning `__proto__` would replace the prototype.
    Object.defineProperty(target, key, {
        value,
        enumerable: isEnumerable,
        writable: true,
        configurable: true,
    });
}
const WRAPPERS = new Set(["optional", "nullable", "default", "readonly"]);
function objectView(shape, value) {
    const view = Object.create(null);
    for (const key of Object.keys(value)) {
        if (!Object.hasOwn(shape, key)) {
            define(view, key, undefined);
        }
    }
    for (const [key, field] of Object.entries(shape)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && "value" in descriptor) {
            define(view, key, ownView(field, descriptor.value));
        }
    }
    return view;
}
function arrayView(element, value) {
    // Index loop: an own `map` property on the input must never run.
    const items = [];
    // A hole, an inherited or an accessor element counts as absent, like such a field.
    for (let i = 0; i < value.length; i++) {
        items.push(ownView(element, ownValue(value, i)));
    }
    return items;
}
/** With exactly one object option, an object can only match that one. Other unions pass as is. */
function onlyObjectOption(options) {
    const objects = options.filter((o) => defOf(o).type === "object");
    return objects.length === 1 ? objects[0] : undefined;
}
/** The prototype of a copied non-plain object. It has no accessors. */
class NonPlain {
}
Object.freeze(NonPlain.prototype);
/**
 * Replaces a function or a cycle in a data copy. No schema accepts a symbol, so the input is
 * rejected, and the parse never inspects the untrusted function or treats a cycle as absent.
 */
const REJECTED_STAND_IN = Symbol("rejected");
/**
 * A deep copy of own data properties for a union with several object options, where the option is
 * not known yet, and for a recursive JSON value. An accessor reads as undefined, so its getter
 * never runs.
 */
function dataView(value, seen) {
    if (typeof value === "function") {
        return REJECTED_STAND_IN; // Zod reads a function's prototype; no schema here accepts one
    }
    if (typeof value !== "object" || value === null) {
        return value;
    }
    if (seen.has(value)) {
        return REJECTED_STAND_IN; // JSON has no cycles, and a cycle must not read as absent
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
        return REJECTED_STAND_IN; // a symbol key is not JSON, and the copy below would drop it
    }
    seen.add(value);
    let view;
    if (Array.isArray(value)) {
        const items = [];
        for (let i = 0; i < value.length; i++) {
            items.push(dataView(ownValue(value, i), seen));
        }
        view = items;
    }
    else {
        view = objectCopy(value, seen);
    }
    seen.delete(value);
    return view;
}
/** Copies the own data fields of a non-array object for dataView. */
function objectCopy(value, seen) {
    // A plain object keeps its plain prototype. Any other prototype (a Date, a class instance) is
    // swapped for a trusted non-plain one: a JSON value schema still rejects it, and no inherited
    // getter of the untrusted prototype can run.
    const proto = Object.getPrototypeOf(value);
    const base = proto === Object.prototype || proto === null ? proto : NonPlain.prototype;
    const fields = Object.create(base);
    // Non-enumerable fields stay non-enumerable: the parse still reads a declared one by name,
    // and a strict object still ignores an unknown one, as it does on the original.
    for (const key of Object.getOwnPropertyNames(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) {
            continue;
        }
        const isEnumerable = descriptor.enumerable === true;
        if (key === "constructor" && base === NonPlain.prototype && !isEnumerable) {
            // Zod tests plainness through `constructor`. The trusted NonPlain one keeps the copy
            // non-plain; a stand-in would make a Date with an own constructor read as plain.
            continue;
        }
        if (!("value" in descriptor)) {
            // The getter never runs. An enumerable accessor keeps its key with a value no schema
            // accepts: an unknown key stays rejected by a strict object, and a declared one cannot
            // pass as present but empty.
            if (isEnumerable) {
                define(fields, key, REJECTED_STAND_IN, true);
            }
            continue;
        }
        define(fields, key, dataView(ownValue(value, key), seen), isEnumerable);
    }
    return fields;
}
function recordView(valueType, value) {
    const view = Object.create(null);
    for (const key of Object.keys(value)) {
        define(view, key, ownView(valueType, ownValue(value, key))); // an accessor reads as undefined
    }
    return view;
}
/**
 * Copies the own data fields the schema declares (enumerable or not), level by level, so the
 * parse never sees an inherited value. An accessor counts as absent and its getter never runs.
 * Unknown own enumerable keys are kept as keys with an undefined value, so strict objects still
 * reject them.
 */
function ownView(schema, value) {
    const def = defOf(schema);
    if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
        return ownView(def.innerType, value);
    }
    const element = def.element;
    if (def.type === "array" && element !== undefined && Array.isArray(value)) {
        return arrayView(element, value);
    }
    if (def.type === "record" && def.valueType !== undefined && isObject(value)) {
        return recordView(def.valueType, value);
    }
    if (def.type === "union" && def.options !== undefined && isObject(value)) {
        const option = onlyObjectOption(def.options);
        return option === undefined ? dataView(value, new Set()) : ownView(option, value);
    }
    if (def.type === "object" && def.shape !== undefined && isObject(value)) {
        // Read the prototype on purpose: a hostile Proxy trap throws here, and verdict rejects it.
        Object.getPrototypeOf(value);
        return objectView(def.shape, value);
    }
    if (def.type === "lazy") {
        return dataView(value, new Set()); // a recursive JSON value: copy its own data deeply
    }
    return value;
}
// Returns the getter without calling it, and allocates nothing for a data property.
// biome-ignore lint/suspicious/noExplicitAny: Annex B method, absent from the lib types.
export const lookupGetter = Object.prototype.__lookupGetter__;
/**
 * Returns the error text, or undefined when the value matches the schema. The parse always reads
 * the own-data copy, never the input: a Proxy can report one own data value through its
 * descriptor and return another through `get`, so no check of the input can make it safe to parse.
 */
export function problem(schema, value, path) {
    const parsed = schema.safeParse(ownView(schema, value));
    return parsed.success ? undefined : firstError(parsed.error, value, path);
}
/**
 * Runs `check` at the validation boundary. Hostile input, such as a Proxy whose traps throw, can
 * make inspection throw; that counts as invalid, because validators never throw.
 */
export function verdict(value, path, check) {
    let error;
    try {
        error = check();
    }
    catch {
        error = `${path}: is not a valid value`;
    }
    // The caller has checked `value` against the schema of T; the same object is returned.
    return error === undefined ? { ok: true, value: value } : { ok: false, error };
}
export function validateWith(schema, value, path) {
    return verdict(value, path, () => problem(schema, value, path));
}
