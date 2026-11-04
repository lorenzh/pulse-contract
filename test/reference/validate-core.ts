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

/**
 * Returns the error text, or undefined when the value matches the schema. The parse always reads
 * the own-data copy, never the input: a Proxy can report one own data value through its
 * descriptor and return another through `get`, so no check of the input can make it safe to parse.
 */
export function problem(schema: z.ZodType, value: unknown, path: string): string | undefined {
  const parsed = schema.safeParse(ownView(schema, value));
  return parsed.success ? undefined : firstError(parsed.error, value, path);
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
