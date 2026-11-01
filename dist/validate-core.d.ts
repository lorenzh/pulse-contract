import type { z } from "zod";
/** Outcome of a validator. Validators never throw. */
export type Validation<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
type Fields = Record<string, unknown>;
export declare const isObject: (value: unknown) => value is Fields;
/**
 * Reads an own data property. Inherited names such as `constructor` and accessors count as
 * absent; a getter never runs.
 */
export declare function ownValue(parent: unknown, key: PropertyKey): unknown;
export declare const lookupGetter: (key: PropertyKey) => unknown;
/**
 * Returns the error text, or undefined when the value matches the schema. The parse always reads
 * the own-data copy, never the input: a Proxy can report one own data value through its
 * descriptor and return another through `get`, so no check of the input can make it safe to parse.
 */
export declare function problem(schema: z.ZodType, value: unknown, path: string): string | undefined;
/**
 * Runs `check` at the validation boundary. Hostile input, such as a Proxy whose traps throw, can
 * make inspection throw; that counts as invalid, because validators never throw.
 */
export declare function verdict<T>(value: unknown, path: string, check: () => string | undefined): Validation<T>;
export declare function validateWith<T>(schema: z.ZodType, value: unknown, path: string): Validation<T>;
export {};
