import { test } from "bun:test";
import assert from "node:assert/strict";
import type { z } from "zod";
import { adminCheckInputSchemas, adminCheckViewSchema } from "../src/admin.ts";
import { auditPageSchema } from "../src/audit.ts";
import * as candidate from "../src/index.ts";
import { componentSchema } from "../src/schema.ts";
import { tokenCreateInputSchema, tokensResponseSchema } from "../src/tokens.ts";
import { validateWith as candidateWith, type Validation } from "../src/validate-core.ts";
import * as reference from "./reference/validate.ts";
import { validateWith as referenceWith } from "./reference/validate-core.ts";
import { adminFixtures, auditFixtures, fixture, tokenFixtures } from "./types.fixture.ts";

// Differential suite: the candidate (src) against the frozen 7ce23aa copy path (test/reference).
// Every entry checks a literal on both sides. The corpus holds no Proxy (out of scope).

type Check = (value: unknown) => Validation<unknown>;
type Pair = { name: string; candidate: Check; reference: Check };
type Expected = { ok: true } | { ok: false; error: string };

const NAMES = [
  "validateCheck",
  "validateCheckLatency",
  "validateCheckUptime",
  "validateCheckWithState",
  "validateChecksResponse",
  "validateComponent",
  "validateComponentUptime",
  "validateComponentWithState",
  "validateComponentsResponse",
  "validateComponentsUptimeResponse",
  "validateIncident",
  "validateIncidentsResponse",
  "validateLatencyResponse",
  "validateLocation",
  "validateLocationsResponse",
  "validateMaintenanceResponse",
  "validateMaintenanceWindow",
  "validateManualIncident",
  "validateManualIncidentInput",
  "validateManualIncidentUpdateInput",
  "validateManualIncidentsResponse",
  "validatePostResultRequest",
  "validateResult",
  "validateResultsResponse",
  "validateSlo",
  "validateUptimeResponse",
] as const;
type Name = (typeof NAMES)[number];

const CANDIDATES: Record<Name, Check> = candidate;
const REFERENCES: Record<Name, Check> = reference;
const pair = (name: Name): Pair => ({
  name,
  candidate: (value) => CANDIDATES[name](value),
  reference: (value) => REFERENCES[name](value),
});

const schemaPair = (name: string, schema: z.ZodType, path: string): Pair => ({
  name,
  candidate: (value) => candidateWith(schema, value, path),
  reference: (value) => referenceWith(schema, value, path),
});

const SCHEMA_PAIRS = {
  adminHttp: schemaPair("adminCheckInputSchemas.http", adminCheckInputSchemas.http, "check"),
  adminView: schemaPair("adminCheckViewSchema", adminCheckViewSchema, "check"),
  tokenCreate: schemaPair("tokenCreateInputSchema", tokenCreateInputSchema, "token"),
  tokens: schemaPair("tokensResponseSchema", tokensResponseSchema, "tokens"),
  audit: schemaPair("auditPageSchema", auditPageSchema, "audit"),
  component: schemaPair("componentSchema", componentSchema, "component"),
};

const OK: Expected = { ok: true };
const fail = (error: string): Expected => ({ ok: false, error });
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function assertResult(side: string, result: Validation<unknown>, input: unknown, want: Expected) {
  if (want.ok) {
    assert.equal(result.ok, true, `${side}: ${result.ok ? "" : result.error}`);
    assert.equal(result.ok && result.value, input, `${side}: same object`);
  } else {
    assert.deepEqual(result, want, side);
  }
}

/** Passes the same input to both sides; both must equal the literal, so they agree. */
function same(p: Pair, input: unknown, want: Expected, label = ""): void {
  const name = `${p.name} ${label}`;
  assertResult(`${name} candidate`, p.candidate(input), input, want);
  assertResult(`${name} reference`, p.reference(input), input, want);
}

const uptimeDay = (i: number) => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  uptime: 99.5,
  results: 288,
});
const latencyDay = (i: number) => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  p50Ms: 120,
  p95Ms: 340,
  count: 288,
});
type Item = { checkId: string; days: unknown[]; uptime?: number };
const makeItem = (): Item => ({
  checkId: "c",
  days: Array.from({ length: 90 }, (_, i) => uptimeDay(i)),
  uptime: 99.5,
});
const makeLitem = (): Item => ({
  checkId: "c",
  days: Array.from({ length: 90 }, (_, i) => latencyDay(i)),
});
const T = JSON.stringify(makeItem());
const HTTP_TEXT = '{"id":"a","name":"A","url":"https://example.com/","intervalMs":1000';
const HEADERS_CHECK = `${HTTP_TEXT},"headers":{"X-Key":"v","Auth":{"env":"PULSE_HEADER_A"}}}`;
const COMPONENT_TEXT = '{"id":"web","name":"Web","checkIds":["c"]';

const p = Object.fromEntries(NAMES.map((name) => [name, pair(name)])) as Record<Name, Pair>;

const f = fixture;
const VALID: Record<Name, () => unknown> = {
  validateCheck: () => json(f.variants.httpCheck),
  validateCheckLatency: () => json(makeLitem()),
  validateCheckUptime: () => json(makeItem()),
  validateCheckWithState: () => json(f.checks[0]),
  validateChecksResponse: () => json(f.checks),
  validateComponent: () => json(f.component),
  validateComponentUptime: () => json(f.componentsUptime[0]),
  validateComponentWithState: () => json(f.components[0]),
  validateComponentsResponse: () => json(f.components),
  validateComponentsUptimeResponse: () => json(f.componentsUptime),
  validateIncident: () => json(f.incidents[0]),
  validateIncidentsResponse: () => json(f.incidents),
  validateLatencyResponse: () => json([makeLitem()]),
  validateLocation: () => json(f.location),
  validateLocationsResponse: () => json(f.locations),
  validateMaintenanceResponse: () => json(f.maintenance),
  validateMaintenanceWindow: () => json(f.maintenance[0]),
  validateManualIncident: () => json(f.manualIncident),
  validateManualIncidentInput: () => json(f.manualInput),
  validateManualIncidentUpdateInput: () => json(f.manualUpdateInput),
  validateManualIncidentsResponse: () => json(f.manualIncidents),
  validatePostResultRequest: () => json(f.request),
  validateResult: () => json(f.results[0]),
  validateResultsResponse: () => json(f.results),
  validateSlo: () =>
    JSON.parse('{"target":99.9,"windowDays":30,"availability":99.95,"budgetRemaining":50}'),
  validateUptimeResponse: () => json([makeItem()]),
};

const SCHEMA_VALID: Record<keyof typeof SCHEMA_PAIRS, () => unknown> = {
  adminHttp: () => json({ ...adminFixtures[1], method: "POST" }),
  adminView: () => json(adminFixtures[3]),
  tokenCreate: () => json(tokenFixtures.create),
  tokens: () => json(tokenFixtures.list),
  audit: () => json(auditFixtures.page),
  component: () => json(f.component),
};

/** A wrong-typed field: the object at `key` of the valid input, or the first element. */
function wrongTyped(valid: unknown, key: string): unknown {
  if (Array.isArray(valid)) {
    return ["x", ...valid.slice(1)];
  }
  return { ...(valid as Record<string, unknown>), [key]: { bad: true } };
}

const WRONG: Record<Name, [string, string]> = {
  validateCheck: ["intervalMs", "check.intervalMs: must be an integer 1..2147483647"],
  validateCheckLatency: ["checkId", "latency.checkId: must be a non-empty string"],
  validateCheckUptime: ["checkId", "uptime.checkId: must be a non-empty string"],
  validateCheckWithState: ["name", "check.name: must be a string"],
  validateChecksResponse: ["", "checks[0]: must be an object"],
  validateComponent: ["name", "component.name: must be a string"],
  validateComponentUptime: ["componentId", "uptime.componentId: must be a non-empty string"],
  validateComponentWithState: ["name", "component.name: must be a string"],
  validateComponentsResponse: ["", "components[0]: must be an object"],
  validateComponentsUptimeResponse: ["", "uptime[0]: must be an object"],
  validateIncident: ["checkId", "incident.checkId: must be a non-empty string"],
  validateIncidentsResponse: ["", "incidents[0]: must be an object"],
  validateLatencyResponse: ["", "latency[0]: must be an object"],
  validateLocation: ["name", "location.name: must be a non-empty string"],
  validateLocationsResponse: ["", "locations[0]: must be an object"],
  validateMaintenanceResponse: ["", "maintenance[0]: must be an object"],
  validateMaintenanceWindow: ["checkId", "maintenance.checkId: must be a non-empty string"],
  validateManualIncident: ["title", "manualIncident.title: must be a string"],
  validateManualIncidentInput: ["title", "manualIncident.title: must be a string"],
  validateManualIncidentUpdateInput: ["message", "update.message: must be a string"],
  validateManualIncidentsResponse: ["", "manualIncidents[0]: must be an object"],
  validatePostResultRequest: ["checkId", "result.checkId: must be a non-empty string"],
  validateResult: ["checkId", "result.checkId: must be a non-empty string"],
  validateResultsResponse: ["", "results[0]: must be an object"],
  validateSlo: ["target", "slo.target: must be a number >= 90 and < 100"],
  validateUptimeResponse: ["", "uptime[0]: must be an object"],
};

const SCHEMA_WRONG: Record<keyof typeof SCHEMA_PAIRS, [string, string]> = {
  adminHttp: ["name", "check.name: must be a string"],
  adminView: ["name", "check: must be a check view"],
  tokenCreate: ["name", "token.name: must be a string"],
  tokens: ["tokens", "tokens.tokens: must be an array"],
  audit: ["entries", "audit.entries: must be an array"],
  component: ["name", "component.name: must be a string"],
};

// Compile each schema once on clean input, so no compilation runs under a polluted global.
for (const name of NAMES) {
  p[name].candidate(VALID[name]());
  p[name].reference(VALID[name]());
}
for (const key of Object.keys(SCHEMA_PAIRS) as (keyof typeof SCHEMA_PAIRS)[]) {
  SCHEMA_PAIRS[key].candidate(SCHEMA_VALID[key]());
  SCHEMA_PAIRS[key].reference(SCHEMA_VALID[key]());
}

test("each validator and schema pair agrees on valid JSON and on a wrong-typed field", () => {
  assert.equal(NAMES.length, 26);
  for (const name of NAMES) {
    same(p[name], VALID[name](), OK, "valid");
    const [key, error] = WRONG[name];
    same(p[name], wrongTyped(VALID[name](), key), fail(error), "wrong");
  }
  for (const key of Object.keys(SCHEMA_PAIRS) as (keyof typeof SCHEMA_PAIRS)[]) {
    same(SCHEMA_PAIRS[key], SCHEMA_VALID[key](), OK, "valid");
    const [field, error] = SCHEMA_WRONG[key];
    same(SCHEMA_PAIRS[key], wrongTyped(SCHEMA_VALID[key](), field), fail(error), "wrong");
  }
});

// --- Exceptions: exactly counterexamples 1 and 2 (exception 1 of the guarantee). ---

function mixedTop(item: () => Item): unknown[] {
  const a: unknown[] = [item()];
  a.length = 2;
  Object.setPrototypeOf(a, [item(), item()]);
  return a;
}
function allInheritedTop(item: () => Item): unknown[] {
  const a: unknown[] = new Array(2);
  Object.setPrototypeOf(a, [item(), item()]);
  return a;
}

const EXCEPTIONS = [
  {
    name: "1 uptime",
    pair: p.validateUptimeResponse,
    input: () => mixedTop(makeItem),
    error: "uptime[1]: must be an object",
  },
  {
    name: "1 latency",
    pair: p.validateLatencyResponse,
    input: () => mixedTop(makeLitem),
    error: "latency[1]: must be an object",
  },
  {
    name: "2 uptime",
    pair: p.validateUptimeResponse,
    input: () => allInheritedTop(makeItem),
    error: "uptime[0]: must be an object",
  },
];

test("15f: the exception list holds exactly counterexamples 1 and 2", () => {
  assert.deepEqual(
    EXCEPTIONS.map((e) => e.name),
    ["1 uptime", "1 latency", "2 uptime"],
  );
});

for (const entry of EXCEPTIONS) {
  test(`exception ${entry.name}: the reference accepts inherited top-level elements, the candidate rejects`, () => {
    const input = entry.input();
    const ref = entry.pair.reference(input);
    assert.equal(ref.ok && ref.value, input, `${entry.name} reference`);
    assert.deepEqual(entry.pair.candidate(input), fail(entry.error), `${entry.name} candidate`);
  });
}

// --- Counterexamples 3-5: nested inherited elements and holes. ---

function inheritedLastDay(item: Item): Item {
  const days = item.days.slice(0, 89);
  days.length = 90;
  Object.setPrototypeOf(days, item.days);
  return { ...item, days };
}

test("3 and 4: nested inherited days are required", () => {
  same(
    p.validateUptimeResponse,
    [inheritedLastDay(makeItem())],
    fail("uptime[0].days[89]: is required"),
  );
  same(
    p.validateLatencyResponse,
    [inheritedLastDay(makeLitem())],
    fail("latency[0].days[89]: is required"),
  );
  same(p.validateCheckUptime, inheritedLastDay(makeItem()), fail("uptime.days[89]: is required"));
  same(
    p.validateUptimeResponse,
    [makeItem(), inheritedLastDay(makeItem())],
    fail("uptime[1].days[89]: is required"),
  );
});

test("5: holes keep their texts", () => {
  // biome-ignore lint/suspicious/noSparseArray: a top-level hole is the case under test
  same(p.validateUptimeResponse, [makeItem(), , makeItem()], fail("uptime[1]: must be an object"));
  const item = makeItem();
  Reflect.deleteProperty(item.days, 45);
  same(p.validateUptimeResponse, [item], fail("uptime[0].days[45]: is required"));
});

// --- Polluted globals and accessors: counted separately per side, restored in finally. ---

type Pollution = {
  target: object;
  key: PropertyKey;
  descriptor?: (bump: () => void) => PropertyDescriptor;
};

function withPollution<T>(pollutions: readonly Pollution[], bump: () => void, run: () => T): T {
  const saved = pollutions.map((x) => Object.getOwnPropertyDescriptor(x.target, x.key));
  try {
    for (const x of pollutions) {
      if (x.descriptor === undefined) {
        Reflect.deleteProperty(x.target, x.key);
      } else {
        Object.defineProperty(x.target, x.key, x.descriptor(bump));
      }
    }
    return run();
  } finally {
    for (let i = pollutions.length - 1; i >= 0; i--) {
      const x = pollutions[i] as Pollution;
      const old = saved[i];
      if (old === undefined) {
        Reflect.deleteProperty(x.target, x.key);
      } else {
        Object.defineProperty(x.target, x.key, old);
      }
    }
  }
}

function polluted(
  label: string,
  p0: Pair,
  input: unknown,
  pollutions: readonly Pollution[],
  want: Expected,
  wantCount: number,
): void {
  let candidateCount = 0;
  const c = withPollution(
    pollutions,
    () => candidateCount++,
    () => p0.candidate(input),
  );
  let referenceCount = 0;
  const r = withPollution(
    pollutions,
    () => referenceCount++,
    () => p0.reference(input),
  );
  assertResult(`${label} candidate`, c, input, want);
  assertResult(`${label} reference`, r, input, want);
  assert.equal(candidateCount, wantCount, `${label} candidate count`);
  assert.equal(referenceCount, wantCount, `${label} reference count`);
  assert.ok(candidateCount <= referenceCount, label);
}

function counted(make: (bump: () => void) => unknown, p0: Pair, want: Expected, label: string) {
  let candidateCount = 0;
  const ci = make(() => candidateCount++);
  assertResult(`${label} candidate`, p0.candidate(ci), ci, want);
  let referenceCount = 0;
  const ri = make(() => referenceCount++);
  assertResult(`${label} reference`, p0.reference(ri), ri, want);
  assert.equal(candidateCount, 0, `${label} candidate count`);
  assert.equal(referenceCount, 0, `${label} reference count`);
}

const getter = (value: unknown) => (bump: () => void) => ({
  get() {
    bump();
    return value;
  },
  configurable: true,
  enumerable: true,
});

test("6: accessor elements and fields are required and never run", () => {
  counted(
    (bump) => {
      const a: unknown[] = [makeItem()];
      Object.defineProperty(a, 0, getter(makeItem())(bump));
      return a;
    },
    p.validateUptimeResponse,
    fail("uptime[0]: is required"),
    "6 top",
  );
  counted(
    (bump) => {
      const item = makeItem();
      Object.defineProperty(item.days, 0, getter(uptimeDay(0))(bump));
      return item;
    },
    p.validateCheckUptime,
    fail("uptime.days[0]: is required"),
    "6 day",
  );
  counted(
    (bump) => {
      const item = makeItem();
      Object.defineProperty(item, "checkId", getter("c")(bump));
      return item;
    },
    p.validateCheckUptime,
    fail("uptime.checkId: is required"),
    "6 field",
  );
});

test("7: a declared key on Object.prototype stays required", () => {
  const { days, uptime } = makeItem();
  const rest = { days, uptime };
  polluted(
    "7",
    p.validateUptimeResponse,
    [rest],
    [
      {
        target: Object.prototype,
        key: "checkId",
        descriptor: () => ({ value: "c", configurable: true }),
      },
    ],
    fail("uptime[0].checkId: is required"),
    0,
  );
});

function revalidate(
  check: Check,
  mutate: (items: Item[], bump: () => void) => void,
): {
  first: Validation<unknown>;
  second: Validation<unknown>;
  count: number;
} {
  const items = Array.from({ length: 5 }, makeItem);
  const first = check(items);
  let count = 0;
  mutate(items, () => count++);
  return { first, second: check(items), count };
}

test("8: a mutated input is validated again", () => {
  const accessor = (items: Item[], bump: () => void) => {
    Object.defineProperty(items[3]?.days, 10, getter(uptimeDay(10))(bump));
  };
  const hole = (items: Item[]) => {
    Reflect.deleteProperty(items[3]?.days ?? [], 10);
  };
  for (const side of ["candidate", "reference"] as const) {
    const check = p.validateUptimeResponse[side];
    const a = revalidate(check, accessor);
    assert.equal(a.first.ok, true, side);
    assert.deepEqual(a.second, fail("uptime[3].days[10]: is required"), side);
    assert.equal(a.count, 0, side);
    const h = revalidate(check, hole);
    assert.equal(h.first.ok, true, side);
    assert.deepEqual(h.second, fail("uptime[3].days[10]: is required"), side);
  }
});

test("9: an inherited enumerable key keeps copy-path parity", () => {
  polluted(
    "9",
    p.validateComponent,
    { id: "web", name: "Web", checkIds: ["c"] },
    [
      {
        target: Object.prototype,
        key: "extra",
        descriptor: () => ({ value: 1, enumerable: true, configurable: true }),
      },
    ],
    OK,
    0,
  );
});

test("10: a setter-only field is required", () => {
  counted(
    (bump) => {
      const item = makeItem();
      Object.defineProperty(item, "checkId", { set: bump, configurable: true, enumerable: true });
      return item;
    },
    p.validateCheckUptime,
    fail("uptime.checkId: is required"),
    "10",
  );
});

test("12: dense own-data controls pass with the same object", () => {
  same(p.validateUptimeResponse, json(Array.from({ length: 5 }, makeItem)), OK, "dense");
  const bare = Object.assign(Object.create(null) as Record<string, unknown>, makeItem());
  same(p.validateCheckUptime, bare, OK, "null prototype");
  const hidden = { name: "Web", checkIds: ["c"] };
  Object.defineProperty(hidden, "id", { value: "web", enumerable: false });
  same(p.validateComponent, hidden, OK, "non-enumerable id");
});

const OP = Object.prototype;
const ORIGINAL_HAS_OWN = OP.hasOwnProperty;

const RECORD_POLLUTIONS: [string, Pollution[]][] = [
  [
    "a",
    [
      {
        target: OP,
        key: "constructor",
        descriptor: (bump) => ({
          get() {
            bump();
            return Object;
          },
          configurable: true,
          enumerable: false,
        }),
      },
    ],
  ],
  [
    "b",
    [
      {
        target: OP,
        key: "constructor",
        descriptor: () => ({
          value: () => 0,
          writable: true,
          configurable: true,
          enumerable: false,
        }),
      },
      {
        target: OP,
        key: "prototype",
        descriptor: (bump) => ({
          get() {
            bump();
            return OP;
          },
          configurable: true,
        }),
      },
    ],
  ],
  [
    "c",
    [
      {
        target: OP,
        key: "hasOwnProperty",
        descriptor: (bump) => ({
          get() {
            bump();
            return ORIGINAL_HAS_OWN;
          },
          configurable: true,
          enumerable: false,
        }),
      },
    ],
  ],
  ["d", [{ target: OP, key: "isPrototypeOf" }]],
];
for (const [name, pollutions] of RECORD_POLLUTIONS) {
  test(`13${name}: a record keeps copy-path behavior under a polluted Object.prototype`, () => {
    polluted(`13${name}`, p.validateCheck, JSON.parse(HEADERS_CHECK), pollutions, OK, 0);
  });
}

const ORIGINAL_CALL = Function.prototype.call;
const callGetter: Pollution = {
  target: Function.prototype,
  key: "call",
  descriptor: (bump) => ({
    get() {
      bump();
      return ORIGINAL_CALL;
    },
    configurable: true,
    enumerable: false,
  }),
};

test("14a: a getter on Function.prototype.call never runs for a check uptime", () => {
  polluted("14a", p.validateCheckUptime, json(makeItem()), [callGetter], OK, 0);
});

test("14b: a getter on Function.prototype.call never runs for a check without headers", () => {
  polluted("14b", p.validateCheck, JSON.parse(`${HTTP_TEXT}}`), [callGetter], OK, 0);
});

test("14c: an own call getter on __lookupGetter__ never runs", () => {
  const lookup = Reflect.get(OP, "__lookupGetter__") as object;
  polluted(
    "14c",
    p.validateCheckUptime,
    json(makeItem()),
    [{ ...callGetter, target: lookup }],
    OK,
    0,
  );
});

// --- 15: differential input classes. ---

test("15a: duplicate keys in raw JSON, last wins", () => {
  const check = p.validateCheckUptime;
  same(check, JSON.parse(T.replace('"checkId":"c",', '"checkId":"","checkId":"c",')), OK);
  same(
    check,
    JSON.parse(T.replace('"checkId":"c",', '"checkId":"c","checkId":"",')),
    fail("uptime.checkId: must be a non-empty string"),
  );
});

test("15b: an own __proto__ key", () => {
  same(
    p.validateComponent,
    JSON.parse(`${COMPONENT_TEXT},"__proto__":{"x":1}}`),
    fail("component: has an unknown field: __proto__"),
  );
  same(
    p.validateCheckUptime,
    JSON.parse(T.replace('"checkId":"c",', '"__proto__":{"checkId":"x"},')),
    fail("uptime.checkId: is required"),
  );
  same(p.validateCheckUptime, JSON.parse(`{"__proto__":{"checkId":"x"},${T.slice(1)}`), OK);
  same(
    p.validateCheckUptime,
    JSON.parse(
      '{"checkId":"c","uptime":1,"days":[{"__proto__":{"date":"2026-01-01"},"uptime":1,"results":1}]}',
    ),
    fail("uptime.days[0].date: is required"),
  );
  // Intentional difference (#865): the candidate rejects an own reserved header name.
  const reserved = JSON.parse(`${HTTP_TEXT},"headers":{"__proto__":"v"}}`);
  assertResult(
    "validateCheck candidate",
    p.validateCheck.candidate(reserved),
    reserved,
    fail("check.headers.__proto__: is not an allowed header name"),
  );
  assertResult("validateCheck reference", p.validateCheck.reference(reserved), reserved, OK);
});

test("15c: huge and non-finite-looking numbers", () => {
  const atUptime = "uptime.uptime: must be null or a number 0..100";
  const atResults = "uptime.days[0].results: must be an integer >= 0";
  const cases: [string, Expected, Expected][] = [
    ["1e400", fail(atUptime), fail(atResults)],
    ["-1e400", fail(atUptime), fail(atResults)],
    ["9007199254740993", fail(atUptime), fail(atResults)],
    ["1e-400", OK, OK],
    ["-0", OK, OK],
    ["1E2", OK, OK],
    ["100.0000000000000001", OK, OK],
    ["0.0000001", OK, fail(atResults)],
  ];
  for (const [text, uptime, results] of cases) {
    same(
      p.validateCheckUptime,
      JSON.parse(T.replace('"uptime":99.5}', `"uptime":${text}}`)),
      uptime,
      text,
    );
    same(
      p.validateCheckUptime,
      JSON.parse(T.replace('"results":288', `"results":${text}`)),
      results,
      text,
    );
  }
  same(
    p.validateCheck,
    JSON.parse(`${HTTP_TEXT.replace('"intervalMs":1000', '"intervalMs":1e400')}}`),
    fail("check.intervalMs: must be an integer 1..2147483647"),
  );
});

test("15d: unicode stays as written", () => {
  same(p.validateCheckUptime, JSON.parse(T.replace('"checkId":"c"', '"checkId":"\\ud800"')), OK);
  same(p.validateComponent, JSON.parse('{"id":"web","name":"a\ud800b","checkIds":["c"]}'), OK);
  same(p.validateComponent, JSON.parse('{"id":"web","name":"a\\udc00b","checkIds":["c"]}'), OK);
  same(
    p.validateComponent,
    JSON.parse(`{"id":"web","name":"${"\u{1F600}".repeat(50)}","checkIds":["c"]}`),
    OK,
  );
  same(
    p.validateComponent,
    JSON.parse(`${COMPONENT_TEXT},"caf\u00e9":1,"cafe\u0301":2}`),
    fail("component: has an unknown field: caf\u00e9, cafe\u0301"),
  );
});

test("15e: competing errors keep their order", () => {
  const checkId = fail("uptime.checkId: must be a non-empty string");
  same(
    p.validateCheckUptime,
    JSON.parse(
      '{"checkId":"","days":[{"date":"x","uptime":200,"results":-1}],"uptime":"y","zzz":1}',
    ),
    checkId,
  );
  same(
    p.validateCheckUptime,
    JSON.parse(
      '{"zzz":1,"uptime":"y","days":[{"results":-1,"uptime":200,"date":"x"}],"checkId":""}',
    ),
    checkId,
  );
  same(
    p.validateCheckUptime,
    JSON.parse(
      '{"checkId":"c","uptime":1,"days":[{"date":"2026-01-01","uptime":1,"results":1},{"date":"x","uptime":200,"results":-1},{"date":"y"}]}',
    ),
    fail("uptime.days[1].date: must be a YYYY-MM-DD date"),
  );
  const id = fail("component.id: must match ^[a-z0-9][a-z0-9._-]*$");
  same(
    p.validateComponent,
    JSON.parse('{"zz":1,"id":"","name":5,"aa":2,"checkIds":"x","1":3}'),
    id,
  );
  same(
    p.validateComponent,
    JSON.parse('{"1":3,"checkIds":"x","aa":2,"name":5,"id":"","zz":1}'),
    id,
  );
  same(
    p.validateComponent,
    JSON.parse(`${COMPONENT_TEXT},"zz":1,"1":2,"aa":3}`),
    fail("component: has an unknown field: 1, zz, aa"),
  );
});

function nestedCheck(kind: "arrays" | "objects", depth: number): unknown {
  const value =
    kind === "arrays"
      ? `${"[".repeat(depth)}1${"]".repeat(depth)}`
      : `${'{"a":'.repeat(depth)}1${"}".repeat(depth)}`;
  return JSON.parse(`${HTTP_TEXT},"jsonAssert":[{"pointer":"","equals":${value}}]}`);
}

test("15g: nesting depth at fixed depths, 3 alternating calls per side", () => {
  const depths: [number, Expected][] = [
    [1_000, OK],
    [5_000, OK],
    [10_000, fail("check: is not a valid value")],
    [100_000, fail("check: is not a valid value")],
  ];
  for (const kind of ["arrays", "objects"] as const) {
    for (const [depth, want] of depths) {
      for (let round = 0; round < 3; round++) {
        const label = `${kind} ${depth} round ${round}`;
        const ci = nestedCheck(kind, depth);
        assertResult(`${label} candidate`, p.validateCheck.candidate(ci), ci, want);
        const ri = nestedCheck(kind, depth);
        assertResult(`${label} reference`, p.validateCheck.reference(ri), ri, want);
      }
    }
  }
});
