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
/** The constructor named by a copied non-plain object. Its own prototype is trusted. */
class NonPlain {
}
Object.freeze(NonPlain.prototype);
/**
 * The prototype of a copied non-plain object. It does not inherit from Object.prototype, so no
 * getter added there can run. Its trusted `constructor` keeps the copy non-plain for Zod.
 */
const NON_PLAIN_PROTO = Object.freeze(Object.create(null, { constructor: { value: NonPlain } }));
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
    if (hasEnumerableSymbol(value)) {
        return REJECTED_STAND_IN; // an enumerable symbol key is not JSON, and the copy would drop it
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
function hasEnumerableSymbol(value) {
    return Object.getOwnPropertySymbols(value).some((key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable === true);
}
/** The data value of `key` on `value` or its prototype chain. An accessor gives `{ isAccessor }`. */
function lookupData(value, key) {
    const visited = new Set();
    let current = value;
    while (current !== null) {
        if (visited.has(current)) {
            // A Proxy can report a cyclic prototype chain; treat it as non-plain and stop.
            return { isAccessor: true, data: undefined };
        }
        visited.add(current);
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor !== undefined) {
            return "value" in descriptor
                ? { isAccessor: false, data: descriptor.value }
                : { isAccessor: true, data: undefined };
        }
        current = Object.getPrototypeOf(current);
    }
    return { isAccessor: false, data: undefined };
}
/**
 * Zod's plain-object test, read from property descriptors so no getter runs. An object from
 * another realm or with a plain prototype stays plain. An accessor on the way counts as non-plain.
 */
function isZodPlain(value) {
    const ctor = lookupData(value, "constructor");
    if (ctor.isAccessor) {
        return false;
    }
    if (typeof ctor.data !== "function") {
        return true;
    }
    const prot = lookupData(ctor.data, "prototype");
    if (prot.isAccessor) {
        return false;
    }
    const protValue = prot.data;
    return (typeof protValue === "object" &&
        protValue !== null &&
        !Array.isArray(protValue) &&
        Object.hasOwn(protValue, "isPrototypeOf"));
}
/** Copies the own data fields of a non-array object for dataView. */
function objectCopy(value, seen) {
    // A plain object is copied onto a null prototype, any other (a Date, a class instance) onto a
    // trusted non-plain one. A JSON value schema still rejects the second, and no inherited getter
    // runs, also not one added to Object.prototype.
    const base = isZodPlain(value) ? null : NON_PLAIN_PROTO;
    const fields = Object.create(base);
    // Non-enumerable fields stay non-enumerable: the parse still reads a declared one by name,
    // and a strict object still ignores an unknown one, as it does on the original.
    for (const key of Object.getOwnPropertyNames(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) {
            continue;
        }
        const isEnumerable = descriptor.enumerable === true;
        if (key === "constructor" && !isEnumerable && "value" in descriptor) {
            // Zod tests plainness through `constructor`, so the copy's prototype decides it: a
            // stand-in would make a Date with an own constructor read as plain, and `Object` as not.
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
/** Built-ins captured at load, so a later change to a global or a prototype never runs here. */
const getPrototype = Object.getPrototypeOf;
const hasOwn = Object.hasOwn;
const getDescriptor = Object.getOwnPropertyDescriptor;
const isArray = Array.isArray;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const pass = () => true;
const isNonArrayObject = (value) => typeof value === "object" && value !== null && !isArray(value);
// A bound `call` reads no `call` or `get` from a prototype at run time.
const walkCache = new WeakMap();
const cachedWalk = Function.prototype.call.bind(WeakMap.prototype.get);
const storeWalk = Function.prototype.call.bind(WeakMap.prototype.set);
function walkOf(schema) {
    const cached = cachedWalk(walkCache, schema);
    if (cached !== undefined) {
        return cached;
    }
    const walk = compileWalk(schema);
    storeWalk(walkCache, schema, walk);
    return walk;
}
/** Own data only: a descriptor with an own `value`, never an inherited `Object.prototype.value`. */
function dataDescriptor(value, key) {
    const descriptor = getDescriptor(value, key);
    return descriptor !== undefined && hasOwn(descriptor, "value")
        ? descriptor
        : undefined;
}
function compileObjectWalk(shape) {
    const keys = Object.keys(shape);
    const walks = keys.map((key) => walkOf(shape[key]));
    return (value) => {
        if (!isNonArrayObject(value)) {
            return true; // ownView passes it through unchanged
        }
        const prototype = getPrototype(value);
        if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
            return false;
        }
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (getDescriptor(value, key) === undefined) {
                if (key in value) {
                    return false; // an inherited value the parse would read
                }
                continue;
            }
            const field = dataDescriptor(value, key);
            if (field === undefined || !walks[i](field.value)) {
                return false;
            }
        }
        return true;
    };
}
function compileArrayWalk(element) {
    const walk = walkOf(element);
    return (value) => {
        if (!isArray(value)) {
            return true;
        }
        if (getPrototype(value) !== ARRAY_PROTOTYPE) {
            return false;
        }
        for (let i = 0; i < value.length; i++) {
            const item = dataDescriptor(value, i);
            if (item === undefined || !walk(item.value)) {
                return false;
            }
        }
        return true;
    };
}
function compileUnionWalk(options) {
    const option = onlyObjectOption(options);
    if (option === undefined) {
        return (value) => !isNonArrayObject(value); // dataView decides an object
    }
    const walk = walkOf(option);
    return (value) => !isNonArrayObject(value) || walk(value);
}
/**
 * Compiles the walk along the schema, as ownView copies it. A record value always fails: Zod's
 * plain-object test reads `constructor` and more from it, which only the null-prototype copy
 * avoids. A recursive JSON value is never entered, so the walk depth stays bounded by the schema.
 */
function compileWalk(schema) {
    const def = defOf(schema);
    if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
        return walkOf(def.innerType);
    }
    if (def.type === "array" && def.element !== undefined) {
        return compileArrayWalk(def.element);
    }
    if (def.type === "record" && def.valueType !== undefined) {
        return (value) => !isNonArrayObject(value);
    }
    if (def.type === "union" && def.options !== undefined) {
        return compileUnionWalk(def.options);
    }
    if (def.type === "object" && def.shape !== undefined) {
        return compileObjectWalk(def.shape);
    }
    if (def.type === "lazy") {
        return (value) => typeof value !== "function" && (typeof value !== "object" || value === null);
    }
    return pass;
}
/** Zod's strict-key check is a `for … in` loop, which also sees inherited enumerable keys. */
function hasInheritedEnumerableKey() {
    for (const key in OBJECT_PROTOTYPE) {
        return typeof key === "string";
    }
    return false;
}
/**
 * Returns the error text, or undefined when the value matches the schema. Plain own-data input,
 * as JSON.parse returns it, is parsed directly once the walk certifies that it parses like the
 * own-data copy; any other input parses the copy. Proxy inputs are out of scope: a Proxy whose
 * traps disagree can pass the walk.
 */
export function problem(schema, value, path) {
    const isPlain = !hasInheritedEnumerableKey() && walkOf(schema)(value);
    const parsed = schema.safeParse(isPlain ? value : ownView(schema, value));
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
