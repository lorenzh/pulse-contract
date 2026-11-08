import type { z } from "zod";

/** Outcome of a validator. Validators never throw. */
export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

type Fields = Record<string, unknown>;

export const isObject = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads an own data property. Inherited names such as `constructor` and accessors count as
 * absent; a getter never runs.
 */
export function ownValue(parent: unknown, key: PropertyKey): unknown {
  if (typeof parent !== "object" || parent === null) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(parent, key);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

/** `checks[2].intervalMs` style: indexes in brackets, keys after a dot. */
function formatPath(base: string, keys: readonly PropertyKey[]): string {
  let path = base;
  for (const key of keys) {
    path += typeof key === "number" ? `[${key}]` : `.${String(key)}`;
  }
  return path;
}

/** The first problem of a failed parse as `<path>: <problem>`. */
function firstError(error: z.ZodError, value: unknown, base: string): string {
  const issue = error.issues[0];
  if (issue === undefined) {
    return `${base}: is invalid`;
  }
  const path = formatPath(base, issue.path);
  let at: unknown = value;
  for (const key of issue.path) {
    at = ownValue(at, key);
  }
  return `${path}: ${at === undefined && issue.path.length > 0 ? "is required" : issue.message}`;
}

type Def = {
  type?: string;
  shape?: Fields;
  element?: z.ZodType;
  innerType?: z.ZodType;
  valueType?: z.ZodType;
  options?: z.ZodType[];
};

function defOf(schema: z.ZodType): Def {
  // Zod keeps the schema description in `_zod.def`; only the fields read here are typed.
  return schema._zod.def as Def;
}

function define(target: Fields, key: string, value: unknown, isEnumerable = true): void {
  // defineProperty, because assigning `__proto__` would replace the prototype.
  Object.defineProperty(target, key, {
    value,
    enumerable: isEnumerable,
    writable: true,
    configurable: true,
  });
}

const WRAPPERS = new Set(["optional", "nullable", "default", "readonly"]);

function objectView(shape: Fields, value: Fields): Fields {
  const view: Fields = Object.create(null) as Fields;
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(shape, key)) {
      define(view, key, undefined);
    }
  }
  for (const [key, field] of Object.entries(shape)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && "value" in descriptor) {
      define(view, key, ownView(field as z.ZodType, descriptor.value));
    }
  }
  return view;
}

function arrayView(element: z.ZodType, value: unknown[]): unknown[] {
  // Index loop: an own `map` property on the input must never run.
  const items: unknown[] = [];
  // A hole, an inherited or an accessor element counts as absent, like such a field.
  for (let i = 0; i < value.length; i++) {
    items.push(ownView(element, ownValue(value, i)));
  }
  return items;
}

/** With exactly one object option, an object can only match that one. Other unions pass as is. */
function onlyObjectOption(options: readonly z.ZodType[]): z.ZodType | undefined {
  const objects = options.filter((o) => defOf(o).type === "object");
  return objects.length === 1 ? objects[0] : undefined;
}

/** The constructor named by a copied non-plain object. Its own prototype is trusted. */
class NonPlain {}
Object.freeze(NonPlain.prototype);

/**
 * The prototype of a copied non-plain object. It does not inherit from Object.prototype, so no
 * getter added there can run. Its trusted `constructor` keeps the copy non-plain for Zod.
 */
const NON_PLAIN_PROTO: object = Object.freeze(
  Object.create(null, { constructor: { value: NonPlain } }) as object,
);

/**
 * Replaces a function or a cycle in a data copy. No schema accepts a symbol, so the input is
 * rejected, and the parse never inspects the untrusted function or treats a cycle as absent.
 */
const REJECTED_STAND_IN: unique symbol = Symbol("rejected");

/**
 * A deep copy of own data properties for a union with several object options, where the option is
 * not known yet, and for a recursive JSON value. An accessor reads as undefined, so its getter
 * never runs.
 */
function dataView(value: unknown, seen: Set<object>): unknown {
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
  let view: unknown;
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      items.push(dataView(ownValue(value, i), seen));
    }
    view = items;
  } else {
    view = objectCopy(value, seen);
  }
  seen.delete(value);
  return view;
}

function hasEnumerableSymbol(value: object): boolean {
  return Object.getOwnPropertySymbols(value).some(
    (key) => Object.getOwnPropertyDescriptor(value, key)?.enumerable === true,
  );
}

/** The data value of `key` on `value` or its prototype chain. An accessor gives `{ isAccessor }`. */
function lookupData(value: object, key: string): { isAccessor: boolean; data: unknown } {
  const visited = new Set<object>();
  let current: object | null = value;
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
    current = Object.getPrototypeOf(current) as object | null;
  }
  return { isAccessor: false, data: undefined };
}

/**
 * Zod's plain-object test, read from property descriptors so no getter runs. An object from
 * another realm or with a plain prototype stays plain. An accessor on the way counts as non-plain.
 */
function isZodPlain(value: object): boolean {
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
  const protValue: unknown = prot.data;
  return (
    typeof protValue === "object" &&
    protValue !== null &&
    !Array.isArray(protValue) &&
    Object.hasOwn(protValue, "isPrototypeOf")
  );
}

/** Copies the own data fields of a non-array object for dataView. */
function objectCopy(value: object, seen: Set<object>): Fields {
  // A plain object is copied onto a null prototype, any other (a Date, a class instance) onto a
  // trusted non-plain one. A JSON value schema still rejects the second, and no inherited getter
  // runs, also not one added to Object.prototype.
  const base = isZodPlain(value) ? null : NON_PLAIN_PROTO;
  const fields: Fields = Object.create(base) as Fields;
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

function recordView(valueType: z.ZodType, value: Fields): Fields {
  const view: Fields = Object.create(null) as Fields;
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
function ownView(schema: z.ZodType, value: unknown): unknown {
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
export const lookupGetter = (Object.prototype as any).__lookupGetter__ as (
  key: PropertyKey,
) => unknown;

/** Built-ins captured at load, so a later change to a global or a prototype never runs here. */
const getPrototype = Object.getPrototypeOf;
const hasOwn = Object.hasOwn;
const getDescriptor = Object.getOwnPropertyDescriptor;
const isArray = Array.isArray;
const objectKeys = Object.keys;
const OBJECT_PROTOTYPE: object = Object.prototype;
const ARRAY_PROTOTYPE: object = Array.prototype;
const FUNCTION_PROTOTYPE: object = Function.prototype;
const FUNCTION_CALL = Function.prototype.call;
// biome-ignore lint/suspicious/noExplicitAny: Annex B method, absent from the lib types.
const lookupSetter = (Object.prototype as any).__lookupSetter__ as (key: PropertyKey) => unknown;

const NOT_DATA: unique symbol = Symbol("not data");

/** True when certified input parses like its own-data copy. */
type Walk = (value: unknown) => boolean;

const pass: Walk = () => true;
const isNonArrayObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !isArray(value);

// A bound `call` reads no `call` or `get` from a prototype at run time.
const walkCache = new WeakMap<z.ZodType, Walk>();
const cachedWalk = Function.prototype.call.bind(WeakMap.prototype.get) as (
  map: WeakMap<z.ZodType, Walk>,
  key: z.ZodType,
) => Walk | undefined;
const storeWalk = Function.prototype.call.bind(WeakMap.prototype.set) as (
  map: WeakMap<z.ZodType, Walk>,
  key: z.ZodType,
  walk: Walk,
) => unknown;

const keysCache = new WeakMap<z.ZodType, readonly string[]>();
const cachedKeys = Function.prototype.call.bind(WeakMap.prototype.get) as (
  map: WeakMap<z.ZodType, readonly string[]>,
  key: z.ZodType,
) => readonly string[] | undefined;
const storeKeys = Function.prototype.call.bind(WeakMap.prototype.set) as (
  map: WeakMap<z.ZodType, readonly string[]>,
  key: z.ZodType,
  keys: readonly string[],
) => unknown;

/** Every key an object walk under `schema` reads, collected once per schema. */
function declaredKeysOf(schema: z.ZodType): readonly string[] {
  const cached = cachedKeys(keysCache, schema);
  if (cached !== undefined) {
    return cached;
  }
  const keys = [...new Set(collectKeys(schema))];
  storeKeys(keysCache, schema, keys);
  return keys;
}

/** Follows the schema as compileWalk does; records and lazy values are never walked. */
function collectKeys(schema: z.ZodType): string[] {
  const def = defOf(schema);
  if (def.type !== undefined && WRAPPERS.has(def.type) && def.innerType !== undefined) {
    return [...declaredKeysOf(def.innerType)];
  }
  if (def.type === "array" && def.element !== undefined) {
    return [...declaredKeysOf(def.element)];
  }
  if (def.type === "union" && def.options !== undefined) {
    const option = onlyObjectOption(def.options);
    return option === undefined ? [] : [...declaredKeysOf(option)];
  }
  if (def.type === "object" && def.shape !== undefined) {
    const shape = def.shape;
    const keys = Object.keys(shape);
    return keys.concat(...keys.map((key) => declaredKeysOf(shape[key] as z.ZodType)));
  }
  return [];
}

/**
 * True when Object.prototype holds a declared key, as data or accessor. Without one, a read of a
 * declared key on an object whose prototype is Object.prototype or null and that has no own
 * getter for it finds only the object's own value, or undefined when the key is absent.
 */
function hasInheritedDeclaredKey(keys: readonly string[]): boolean {
  for (let i = 0; i < keys.length; i++) {
    if (hasOwn(OBJECT_PROTOTYPE, keys[i] as string)) {
      return true;
    }
  }
  return false;
}

function walkOf(schema: z.ZodType): Walk {
  const cached = cachedWalk(walkCache, schema);
  if (cached !== undefined) {
    return cached;
  }
  const walk = compileWalk(schema);
  storeWalk(walkCache, schema, walk);
  return walk;
}

/**
 * True when `call` and the captured lookups are the built-ins, so `lookupGetter.call` below runs
 * the real lookup. It reads descriptors and prototypes only.
 */
function hasCallIntegrity(): boolean {
  const call = getDescriptor(FUNCTION_PROTOTYPE, "call");
  return (
    call !== undefined &&
    hasOwn(call, "value") &&
    call.value === FUNCTION_CALL &&
    getPrototype(lookupGetter) === FUNCTION_PROTOTYPE &&
    getPrototype(lookupSetter) === FUNCTION_PROTOTYPE &&
    !hasOwn(lookupGetter, "call") &&
    !hasOwn(lookupSetter, "call")
  );
}

/**
 * Reads an own property with neither a getter nor a setter, or returns NOT_DATA. Without a getter
 * the read runs no code; a setter-only accessor reads as undefined, so only then is the setter
 * looked up. Only valid after hasCallIntegrity.
 */
function ownDataOf(value: object, key: PropertyKey): unknown {
  if (!hasOwn(value, key) || lookupGetter.call(value, key) !== undefined) {
    return NOT_DATA;
  }
  const field: unknown = (value as Record<PropertyKey, unknown>)[key];
  return field === undefined && lookupSetter.call(value, key) !== undefined ? NOT_DATA : field;
}

/**
 * Reads a declared field of an object whose prototype is Object.prototype or null, or returns
 * NOT_DATA for an accessor. Valid only after hasCallIntegrity and hasInheritedDeclaredKey: then no
 * prototype holds the key, so no own getter means the read runs no code and sees own data only.
 */
function declaredFieldOf(value: object, key: string): unknown {
  if (lookupGetter.call(value, key) !== undefined) {
    return NOT_DATA;
  }
  const field: unknown = (value as Record<string, unknown>)[key];
  // undefined is an absent key, an own undefined, or a setter-only accessor.
  return field === undefined && lookupSetter.call(value, key) !== undefined ? NOT_DATA : field;
}

function compileObjectWalk(shape: Fields): Walk {
  const keys = Object.keys(shape);
  // A scalar field needs no walk of its value; null marks it.
  const walks = keys.map((key) => {
    const walk = walkOf(shape[key] as z.ZodType);
    return walk === pass ? null : walk;
  });
  return (value) => {
    if (typeof value !== "object" || value === null) {
      return true; // ownView passes it through unchanged
    }
    // An array fails here too: ownView passes it through, so the copy path parses the same value.
    const prototype: unknown = getPrototype(value);
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      return false;
    }
    for (let i = 0; i < keys.length; i++) {
      const field = declaredFieldOf(value, keys[i] as string);
      const walk = walks[i];
      if (field === NOT_DATA || (walk != null && !walk(field))) {
        return false;
      }
    }
    return true;
  };
}

function compileArrayWalk(element: z.ZodType): Walk {
  const walk = walkOf(element);
  return (value) => {
    if (!isArray(value)) {
      return true;
    }
    if (getPrototype(value) !== ARRAY_PROTOTYPE) {
      return false;
    }
    for (let i = 0; i < value.length; i++) {
      const item = ownDataOf(value, i);
      if (item === NOT_DATA || !walk(item)) {
        return false;
      }
    }
    return true;
  };
}

function compileUnionWalk(options: readonly z.ZodType[]): Walk {
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
function compileWalk(schema: z.ZodType): Walk {
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

/**
 * Zod's strict-key check is a `for … in` loop, which also sees inherited enumerable keys. Plain
 * input inherits only from Object.prototype, whose prototype is null, so its own enumerable string
 * keys are all such a loop can inherit. Object.keys is cheaper here than a `for … in` loop.
 */
function hasInheritedEnumerableKey(): boolean {
  return objectKeys(OBJECT_PROTOTYPE).length !== 0;
}

/**
 * Returns the error text, or undefined when the value matches the schema. Plain own-data input,
 * as JSON.parse returns it, is parsed directly once the walk certifies that it parses like the
 * own-data copy; any other input parses the copy. Proxy inputs are out of scope: a Proxy whose
 * traps disagree can pass the walk.
 */
export function problem(schema: z.ZodType, value: unknown, path: string): string | undefined {
  const isPlain =
    !hasInheritedEnumerableKey() &&
    hasCallIntegrity() &&
    !hasInheritedDeclaredKey(declaredKeysOf(schema)) &&
    walkOf(schema)(value);
  const parsed = schema.safeParse(isPlain ? value : ownView(schema, value));
  return parsed.success ? undefined : firstError(parsed.error, value, path);
}

/**
 * Zod's record parse skips an own `__proto__` key, while a validator returns the original object.
 * So such a header would pass unchecked: a literal value in a view or a malformed keep marker.
 */
export function reservedHeaderProblem(check: unknown, path: string): string | undefined {
  const headers = ownValue(check, "headers");
  return isObject(headers) && Object.hasOwn(headers, "__proto__")
    ? `${path}.headers.__proto__: is not an allowed header name`
    : undefined;
}

/**
 * Runs `check` at the validation boundary. Hostile input, such as a Proxy whose traps throw, can
 * make inspection throw; that counts as invalid, because validators never throw.
 */
export function verdict<T>(
  value: unknown,
  path: string,
  check: () => string | undefined,
): Validation<T> {
  let error: string | undefined;
  try {
    error = check();
  } catch {
    error = `${path}: is not a valid value`;
  }
  // The caller has checked `value` against the schema of T; the same object is returned.
  return error === undefined ? { ok: true, value: value as T } : { ok: false, error };
}

export function validateWith<T>(schema: z.ZodType, value: unknown, path: string): Validation<T> {
  return verdict(value, path, () => problem(schema, value, path));
}
