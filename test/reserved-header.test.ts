import { test } from "bun:test";
import assert from "node:assert/strict";
import * as built from "../dist/index.js";
import * as source from "../src/index.ts";

// #865: an own header named `__proto__` is rejected by its name on every public check path.
const pkg: typeof source = await import("@lorenzh/pulse-contract");

const SENTINEL = "RESERVED-HEADER-SENTINEL-865";
const RESERVED = "__proto__";
const reject = (path: string) => ({
  ok: false,
  error: `${path}.headers.__proto__: is not an allowed header name`,
});

const httpCheck = (): Record<string, unknown> => ({
  id: "a",
  name: "A",
  url: "https://local.invalid/",
  intervalMs: 1000,
});
const stateFields = {
  state: "up",
  consecutiveDown: 0,
  lastResultAt: null,
  lastReason: null,
  locations: [],
};
const withState = (check: Record<string, unknown>): Record<string, unknown> =>
  Object.assign(check, stateFields);

/** Value classes named by the spec; built at runtime. */
const valueClasses = (): [string, unknown][] => [
  ["null", null],
  ["number", 1],
  ["boolean", true],
  ["array", []],
  ["empty object", {}],
  ["object with an invalid env name", { env: "bad" }],
  ["object with a non-string env", { env: 1 }],
  ["keep-like object", { keep: true }],
  ["keep-like object with an extra key", { keep: true, extra: 1 }],
  ["literal string", SENTINEL],
  ["valid env reference", { env: "PULSE_HEADER_TOKEN" }],
];

function headersWith(descriptor: PropertyDescriptor, isNullPrototype: boolean): object {
  const headers: object = isNullPrototype ? Object.create(null) : {};
  Object.defineProperty(headers, RESERVED, { configurable: true, ...descriptor });
  return headers;
}

function checkWith(headers: unknown, type: "implicit" | "http"): Record<string, unknown> {
  const check = httpCheck();
  if (type === "http") {
    check.type = "http";
  }
  check.headers = headers;
  return check;
}

for (const [entry, api] of Object.entries({ source, built, package: pkg })) {
  const runAll = (bad: () => Record<string, unknown>, label: string): void => {
    const results: [unknown, string][] = [
      [api.validateCheck(bad(), "checks[3]"), "checks[3]"],
      [api.validateCheckWithState(withState(bad())), "check"],
      [api.validateChecksResponse([withState(httpCheck()), withState(bad())]), "checks[1]"],
      [
        api.validateAdminConfigExport({
          checks: [httpCheck(), bad()],
          components: [],
          maintenance: [],
        }),
        "config.checks[1]",
      ],
    ];
    for (const [result, path] of results) {
      assert.deepEqual(result, reject(path), `${label} at ${path}`);
      assert.equal(JSON.stringify(result).includes(SENTINEL), false, label);
    }
  };

  test(`${entry}: public check validators reject a reserved header name for every value class`, () => {
    for (const [name, value] of valueClasses()) {
      for (const type of ["implicit", "http"] as const) {
        for (const isNullPrototype of [false, true]) {
          const bad = () =>
            checkWith(
              headersWith({ value: structuredClone(value), enumerable: true }, isNullPrototype),
              type,
            );
          runAll(bad, `${name} ${type} nullPrototype=${isNullPrototype}`);
        }
      }
    }
  });

  test(`${entry}: a reserved header name is rejected by descriptor without reading it`, () => {
    let reads = 0;
    const accessor = () =>
      checkWith(
        headersWith(
          {
            enumerable: true,
            get: () => {
              reads += 1;
              return SENTINEL;
            },
          },
          false,
        ),
        "implicit",
      );
    const hidden = () =>
      checkWith(headersWith({ value: SENTINEL, enumerable: false }, false), "implicit");
    for (const bad of [accessor, hidden]) {
      assert.deepEqual(api.validateCheck(bad()), reject("check"));
      assert.deepEqual(
        api.validateChecksResponse([withState(httpCheck()), withState(bad())]),
        reject("checks[1]"),
      );
    }
    assert.equal(reads, 0);

    const throwing = new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          throw new Error(SENTINEL);
        },
        ownKeys: () => {
          throw new Error(SENTINEL);
        },
        has: () => {
          throw new Error(SENTINEL);
        },
        get: () => {
          throw new Error(SENTINEL);
        },
      },
    );
    const result = api.validateCheck(checkWith(throwing, "implicit"));
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes(SENTINEL), false);
  });

  test(`${entry}: valid headers keep identity through the public check validators`, () => {
    const headerSets = [{ "X-A": "literal" }, { "X-A": "" }, { "X-A": { env: "PULSE_HEADER_A" } }];
    for (const headers of headerSets) {
      const item = checkWith(headers, "implicit");
      const before = structuredClone(item);
      const single = api.validateCheck(item);
      assert.equal(single.ok && single.value, item);

      const stateItem = withState(checkWith(structuredClone(headers), "implicit"));
      const list = [stateItem];
      const stateBefore = structuredClone(list);
      const response = api.validateChecksResponse(list);
      assert.equal(response.ok && response.value, list);
      assert.equal(response.ok && response.value[0], stateItem);

      const exported = { checks: [item], components: [], maintenance: [] };
      const result = api.validateAdminConfigExport(exported);
      assert.equal(result.ok && result.value, exported);
      assert.equal(result.ok && result.value.checks[0], item);

      assert.deepEqual(item, before);
      assert.deepEqual(list, stateBefore);
    }
  });

  test(`${entry}: other header rules and an inherited name are unchanged`, () => {
    assert.deepEqual(api.validateCheck(checkWith({ Host: "x" }, "implicit")), {
      ok: false,
      error: "check.headers.Host: is a header the probe controls",
    });
    assert.deepEqual(api.validateCheck(checkWith({ "X-A": { env: "bad" } }, "implicit")), {
      ok: false,
      error: "check.headers.X-A.env: must match ^PULSE_HEADER_[A-Za-z0-9_]{1,115}$",
    });
    const tcp = { id: "t", name: "T", type: "tcp", host: "local.invalid", port: 80 };
    assert.deepEqual(api.validateCheck({ ...tcp, intervalMs: 1000, headers: { "X-A": "v" } }), {
      ok: false,
      error: "check.headers: Invalid input: expected never, received object",
    });
    const parent = {};
    Object.defineProperty(parent, RESERVED, { value: SENTINEL, enumerable: true });
    const inherited: object = Object.create(parent);
    const item = checkWith(inherited, "implicit");
    const result = api.validateCheck(item);
    assert.equal(result.ok && result.value, item);
  });
}
