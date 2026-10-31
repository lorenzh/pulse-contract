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
function define(target, key, value) {
    // defineProperty, because assigning `__proto__` would replace the prototype.
    Object.defineProperty(target, key, {
        value,
        enumerable: true,
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
        return option === undefined ? value : ownView(option, value);
    }
    if (def.type === "object" && def.shape !== undefined && isObject(value)) {
        // Read the prototype on purpose: a hostile Proxy trap throws here, and verdict rejects it.
        Object.getPrototypeOf(value);
        return objectView(def.shape, value);
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
