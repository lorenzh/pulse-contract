import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const STATEMENT = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"[^"]*"\s*;/g;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function parseSpecifier(raw: string): string {
  const item = raw.trim().replace(/^type\s+/, "");
  if (!NAME.test(item) || item === "default") {
    throw new Error(`unsupported export specifier: ${raw.trim()}`);
  }
  return item;
}

function parseExports(source: string): string[] {
  const clean = stripComments(source);
  const names: string[] = [];
  for (const match of clean.matchAll(STATEMENT)) {
    const items = (match[1] ?? "").split(",").filter((raw) => raw.trim() !== "");
    for (const raw of items) {
      const name = parseSpecifier(raw);
      if (names.includes(name)) {
        throw new Error(`duplicate export: ${name}`);
      }
      names.push(name);
    }
  }
  const rest = clean.replace(STATEMENT, " ");
  const stray = /\bexport\b[^\n]*/.exec(rest);
  if (stray) {
    throw new Error(`unsupported export statement: ${stray[0].trim()}`);
  }
  return names;
}

function isNamed(docs: string, name: string): boolean {
  const escaped = name.replace(/\$/g, "\\$");
  return new RegExp(`(?<![A-Za-z0-9_$])${escaped}(?![A-Za-z0-9_$])`).test(docs);
}

function missingFromDocs(source: string, docs: string): string[] {
  return parseExports(source).filter((name) => !isNamed(docs, name));
}

function missingFromDiscovered(
  runtime: readonly string[],
  discovered: readonly string[],
): string[] {
  return runtime.filter((key) => !discovered.includes(key));
}

describe("parseExports fixtures", () => {
  test("reads type-only, mixed and multi-line clauses", () => {
    expect(parseExports('export type { A, B } from "./a.ts";')).toEqual(["A", "B"]);
    expect(
      parseExports(
        'export { DEFAULT_MAX_BODY_BYTES, type FetchJsonError, fetchJson } from "./client.ts";',
      ),
    ).toEqual(["DEFAULT_MAX_BODY_BYTES", "FetchJsonError", "fetchJson"]);
    expect(parseExports('export {\n  one,\n  type Two,\n  three,\n} from "./m.ts";\n')).toEqual([
      "one",
      "Two",
      "three",
    ]);
  });

  test("ignores commented exports", () => {
    const source =
      '/* export { Hidden } from "./h.ts"; */\n// export { Gone } from "./g.ts";\nexport { kept } from "./k.ts";';
    expect(parseExports(source)).toEqual(["kept"]);
  });

  test.each([
    ['export * from "./x.ts";', "export * from"],
    ["export default 1;", "export default 1;"],
    ["export const z = 1;", "export const z = 1;"],
    ["export function f() {}", "export function f() {}"],
    ["export type X = string;", "export type X = string;"],
    ["export = 1;", "export = 1;"],
    ['export { a as b } from "./x.ts";', "a as b"],
    ['export { default } from "./x.ts";', "default"],
    ['export { a } from "./x.ts";\nexport { a } from "./y.ts";', "duplicate export: a"],
  ])("rejects %p", (source, offending) => {
    expect(() => parseExports(source)).toThrow(offending);
  });
});

describe("matching fixtures", () => {
  test("a longer identifier is not evidence", () => {
    expect(
      missingFromDocs(
        'export type { AdminConfigSummary } from "./a.ts";',
        "validateAdminConfigSummary(raw)",
      ),
    ).toEqual(["AdminConfigSummary"]);
  });

  test("names inside longer spans count", () => {
    const source =
      'export type { Validation, StatusLockedField } from "./v.ts";\nexport { fetchJson, MAX_MAINTENANCE_TIME } from "./c.ts";';
    const docs =
      "`Validation<T>` and `fetchJson(url, options)`; the locked\n`StatusLockedField`s; `x = MAX_MAINTENANCE_TIME + 1`";
    expect(missingFromDocs(source, docs)).toEqual([]);
  });

  test("prefix, suffix and case near misses do not count", () => {
    const source = 'export { alpha, Beta, gamma } from "./x.ts";';
    expect(missingFromDocs(source, "alphaX, Xalpha, beta, $gamma_ gamma_1")).toEqual([
      "alpha",
      "Beta",
      "gamma",
    ]);
  });

  test("a new export is reported without changing an expected list", () => {
    const source = 'export { documented } from "./x.ts";';
    const docs = "`documented` is here.";
    expect(missingFromDocs(source, docs)).toEqual([]);
    expect(missingFromDocs(`${source}\nexport { undocumentedExtra } from "./x.ts";`, docs)).toEqual(
      ["undocumentedExtra"],
    );
  });

  test("removing the only mention makes a name missing", () => {
    const source = 'export { first, second } from "./x.ts";';
    expect(missingFromDocs(source, "`first` and `second`")).toEqual([]);
    expect(missingFromDocs(source, "`first` and")).toEqual(["second"]);
  });

  test("runtime helper reports keys the parser missed", () => {
    expect(missingFromDiscovered(["a", "b"], ["a"])).toEqual(["b"]);
  });
});

describe("docs inventory", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  const docs = readFileSync(new URL("../docs/index.md", import.meta.url), "utf8");

  test("discovers every runtime export of src/index.ts", async () => {
    const runtime = Object.keys(await import("../src/index.ts"));
    assert.deepEqual(missingFromDiscovered(runtime, parseExports(source)), []);
  });

  test("docs/index.md names every export of src/index.ts", () => {
    const missing = missingFromDocs(source, docs);
    assert.deepEqual(missing, [], `missing from docs/index.md:\n${missing.join("\n")}`);
  });
});
