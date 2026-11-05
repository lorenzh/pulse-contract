import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  getManualIncident,
  getManualIncidents,
  type InternalManualIncident,
  incidentImpactState,
  isPublicManualIncident,
  MANUAL_INCIDENT_MAX_DRAFTS,
  MANUAL_INCIDENT_MAX_NOTES,
  MANUAL_INCIDENT_MAX_UPDATES,
  MANUAL_INCIDENT_MESSAGE_MAX,
  MANUAL_INCIDENT_TITLE_MAX,
  MANUAL_INCIDENT_VISIBILITIES,
  type ManualIncident,
  publicManualIncident,
  validateInternalManualIncident,
  validateInternalManualIncidentsResponse,
  validateManualIncident,
  validateManualIncidentDraftInput,
  validateManualIncidentInput,
  validateManualIncidentNoteInput,
  validateManualIncidentsResponse,
  validateManualIncidentUpdateInput,
  WIRE_VERSION,
  WIRE_VERSION_HEADER,
} from "../src/index.ts";
import { fixture } from "./types.fixture.ts";

type FetchFn = Parameters<typeof getManualIncidents>[1]["fetch"];

const base = fixture.manualIncident;
const open = (): ManualIncident => ({
  ...base,
  status: "monitoring",
  resolvedAt: null,
  updates: [
    { at: 1000, status: "investigating", message: "a" },
    { at: 2000, status: "monitoring", message: "b" },
  ],
});
const errorOf = (r: { ok: boolean; error?: string }): string | undefined =>
  r.ok ? undefined : r.error;

test("valid open and resolved incidents pass and return the same object", () => {
  for (const incident of [base, open()]) {
    const r = validateManualIncident(incident);
    assert.equal(r.ok && r.value, incident);
  }
  assert.equal(validateManualIncidentsResponse([base, open()]).ok, true);
  assert.match(errorOf(validateManualIncidentsResponse([base, 1])) ?? "", /^manualIncidents\[1\]/);
});

test("invariants: status and resolvedAt agree", () => {
  assert.match(
    errorOf(validateManualIncident({ ...base, resolvedAt: null })) ?? "",
    /resolvedAt: must be set exactly when/,
  );
  assert.match(errorOf(validateManualIncident({ ...open(), resolvedAt: 5 })) ?? "", /resolvedAt/);
});

test("invariants: updates", () => {
  assert.match(errorOf(validateManualIncident({ ...base, updates: [] })) ?? "", /updates/);
  const wrongLast = { ...open(), status: "identified" };
  assert.match(errorOf(validateManualIncident(wrongLast)) ?? "", /updates\[1\]\.status/);
  const unordered = open();
  unordered.updates = [
    { at: 2000, status: "investigating", message: "a" },
    { at: 1000, status: "monitoring", message: "b" },
  ];
  assert.match(errorOf(validateManualIncident(unordered)) ?? "", /updates\[1\]\.at/);
  const late = { ...base, resolvedAt: 4000 };
  assert.match(
    errorOf(validateManualIncident(late)) ?? "",
    /updates\[1\]\.at: must equal resolvedAt/,
  );
  const many = open();
  many.updates = Array.from({ length: MANUAL_INCIDENT_MAX_UPDATES + 1 }, () => ({
    at: 1,
    status: "monitoring" as const,
    message: "m",
  }));
  assert.match(errorOf(validateManualIncident(many)) ?? "", /at most 100/);
});

test("text rules and limits", () => {
  const input = { title: "t", impact: "none", componentIds: [], message: "m" };
  assert.equal(validateManualIncidentInput(input).ok, true);
  assert.equal(validateManualIncidentInput({ ...input, message: "a\nb <script>" }).ok, true);
  const bad = (patch: Record<string, unknown>): string | undefined =>
    errorOf(validateManualIncidentInput({ ...input, ...patch }));
  assert.match(bad({ title: "" }) ?? "", /title/);
  assert.match(bad({ title: "x".repeat(MANUAL_INCIDENT_TITLE_MAX + 1) }) ?? "", /title/);
  assert.match(bad({ title: "a\nb" }) ?? "", /control characters/);
  assert.match(bad({ message: "x".repeat(MANUAL_INCIDENT_MESSAGE_MAX + 1) }) ?? "", /message/);
  assert.match(bad({ message: "a\u0007" }) ?? "", /control characters except newline/);
  assert.match(bad({ message: "a\r\nb" }) ?? "", /control characters except newline/);
  assert.match(bad({ impact: "huge" }) ?? "", /impact/);
  assert.match(bad({ status: "resolved" }) ?? "", /status/);
  assert.equal(bad({ status: "identified" }), undefined);
  assert.match(bad({ componentIds: ["a", "a"] }) ?? "", /duplicates/);
  assert.match(bad({ componentIds: ["Bad Id"] }) ?? "", /componentIds\[0\]/);
  const fifty1 = Array.from({ length: 51 }, (_, i) => `c${i}`);
  assert.match(bad({ componentIds: fifty1 }) ?? "", /at most 50/);
  assert.match(errorOf(validateManualIncidentInput({ title: "t" })) ?? "", /is required/);
});

test("update input allows resolved", () => {
  assert.equal(validateManualIncidentUpdateInput({ status: "resolved", message: "ok" }).ok, true);
  assert.match(
    errorOf(validateManualIncidentUpdateInput({ status: "open", message: "ok" })) ?? "",
    /status/,
  );
});

test("incidentImpactState maps impact to a component state", () => {
  assert.equal(incidentImpactState("none"), undefined);
  assert.equal(incidentImpactState("minor"), "degraded");
  assert.equal(incidentImpactState("major"), "down");
  assert.equal(incidentImpactState("critical"), "down");
});

const json =
  (status: number, body: unknown): FetchFn =>
  () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { [WIRE_VERSION_HEADER]: String(WIRE_VERSION) },
      }),
    );

test("getManualIncidents reads, filters and tolerates 404 on request", async () => {
  let seen = "";
  const spy: FetchFn = (url) => {
    seen = String(url);
    return json(200, [base])(url);
  };
  const ok = await getManualIncidents("http://api.test/", { fetch: spy, timeoutMs: 1000 }, "open");
  assert.equal(seen, "http://api.test/manual-incidents?status=open");
  assert.equal(ok.ok && ok.value.length, 1);

  const strict = await getManualIncidents("http://api.test", {
    fetch: json(404, {}),
    timeoutMs: 1000,
  });
  assert.equal(!strict.ok && strict.error.kind, "http");
  const tolerant = await getManualIncidents("http://api.test", {
    fetch: json(404, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.deepEqual(tolerant.ok && tolerant.value, []);
  const failing = await getManualIncidents("http://api.test", {
    fetch: json(500, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.equal(failing.ok, false);
  const invalid = await getManualIncidents("http://api.test", {
    fetch: json(200, [{ id: 1 }]),
    timeoutMs: 1000,
  });
  assert.equal(!invalid.ok && invalid.error.kind, "validation");
});

test("getManualIncident reads one incident", async () => {
  let seen = "";
  const spy: FetchFn = (url) => {
    seen = String(url);
    return json(200, base)(url);
  };
  const r = await getManualIncident("http://api.test", 7, { fetch: spy, timeoutMs: 1000 });
  assert.equal(seen, "http://api.test/manual-incidents/7");
  assert.equal(r.ok, true);
  const missing = await getManualIncident("http://api.test", 7, {
    fetch: json(404, {}),
    timeoutMs: 1000,
    isAbsentTolerated: true,
  });
  assert.equal(!missing.ok && missing.error.kind, "http");
});

// Incident drafts, internal notes and internal-only incidents.

const note = { id: 1, at: 1500, author: "console", message: "Private." };
const draftIncident = (): InternalManualIncident => ({
  id: 9,
  title: "Slow checkout",
  componentIds: ["web"],
  impact: "minor",
  visibility: "internal",
  status: "identified",
  createdAt: 500,
  publishedAt: null,
  resolvedAt: null,
  updates: [],
  draft: { status: "identified", message: "Draft.", savedAt: 600 },
  notes: [note],
});
const publishedOpen = (): InternalManualIncident => ({
  ...draftIncident(),
  visibility: "public",
  status: "monitoring",
  publishedAt: 1000,
  updates: [
    { at: 1000, status: "investigating", message: "a" },
    { at: 2000, status: "monitoring", message: "b" },
  ],
  draft: { status: "resolved", message: "U", savedAt: 2500 },
});
const publishedResolved = (): InternalManualIncident => ({
  ...publishedOpen(),
  status: "resolved",
  resolvedAt: 3000,
  updates: [
    { at: 1000, status: "investigating", message: "a" },
    { at: 3000, status: "resolved", message: "done" },
  ],
  draft: null,
});

test("incident privacy constants have the spec values", () => {
  assert.deepEqual([...MANUAL_INCIDENT_VISIBILITIES], ["public", "internal"]);
  assert.equal(MANUAL_INCIDENT_MAX_NOTES, 100);
  assert.equal(MANUAL_INCIDENT_MAX_DRAFTS, 100);
});

test("every R1 state passes and returns the same object", () => {
  const states = [
    draftIncident(),
    publishedOpen(),
    { ...publishedOpen(), draft: null },
    publishedResolved(),
  ];
  for (const incident of states) {
    const r = validateInternalManualIncident(incident);
    assert.equal(r.ok && r.value, incident, errorOf(r) ?? "ok");
  }
  assert.equal(validateInternalManualIncidentsResponse(states).ok, true);
  assert.match(
    errorOf(validateInternalManualIncidentsResponse([states[0], 1])) ?? "",
    /^manualIncidents\[1\]: must be an object/,
  );
});

test("each internal invariant rejects its counterexample", () => {
  const cases: [unknown, string][] = [
    // 1: publishedAt is null iff updates is empty.
    [
      { ...draftIncident(), updates: publishedOpen().updates },
      "manualIncident.updates: must be empty",
    ],
    [{ ...publishedOpen(), updates: [] }, "manualIncident.updates: must be empty"],
    // 2: a draft incident has an open draft with its status and no resolvedAt.
    [{ ...draftIncident(), draft: null }, "manualIncident.draft: must be set while unpublished"],
    [
      {
        ...draftIncident(),
        status: "resolved",
        resolvedAt: 700,
        draft: { status: "resolved", message: "x", savedAt: 600 },
      },
      "manualIncident.draft.status: must not be resolved",
    ],
    [{ ...draftIncident(), status: "monitoring" }, "manualIncident.status: must equal the draft"],
    [{ ...draftIncident(), resolvedAt: 700 }, "manualIncident.resolvedAt: must be set exactly"],
    // 3: published updates start at publishedAt and keep the ManualIncident invariants.
    [
      { ...publishedOpen(), publishedAt: 900 },
      "manualIncident.updates[0].at: must equal publishedAt",
    ],
    [{ ...publishedOpen(), status: "identified" }, "manualIncident.updates[1].status"],
    [
      { ...publishedResolved(), resolvedAt: 4000 },
      "manualIncident.updates[1].at: must equal resolvedAt",
    ],
    [
      {
        ...publishedOpen(),
        updates: [
          { at: 1000, status: "investigating", message: "a" },
          { at: 900, status: "monitoring", message: "b" },
        ],
      },
      "manualIncident.updates[1].at: must not precede",
    ],
    // 4: a resolved incident has no draft.
    [
      { ...publishedResolved(), draft: { status: "monitoring", message: "x", savedAt: 3500 } },
      "manualIncident.draft: must be null when resolved",
    ],
    // 5: notes ordered by at then id, unique ids, at most 100.
    [
      { ...draftIncident(), notes: [note, { ...note }] },
      "manualIncident.notes[1].id: must be unique",
    ],
    [
      {
        ...draftIncident(),
        notes: [
          { ...note, at: 2000 },
          { ...note, id: 2, at: 1000 },
        ],
      },
      "manualIncident.notes[1]: must be ordered",
    ],
    [
      {
        ...draftIncident(),
        notes: [
          { ...note, id: 3 },
          { ...note, id: 2 },
        ],
      },
      "manualIncident.notes[1]: must be ordered",
    ],
    [
      {
        ...draftIncident(),
        notes: Array.from({ length: MANUAL_INCIDENT_MAX_NOTES + 1 }, (_, i) => ({
          ...note,
          id: i + 1,
        })),
      },
      "manualIncident.notes: must have at most 100 notes",
    ],
    [{ ...draftIncident(), visibility: "private" }, "manualIncident.visibility"],
    [{ ...draftIncident(), notes: [{ ...note, author: "" }] }, "manualIncident.notes[0].author"],
    [{ ...draftIncident(), notes: [{ ...note, id: 0 }] }, "manualIncident.notes[0].id"],
    [
      { ...draftIncident(), notes: [{ ...note, message: "a\u0007b" }] },
      "manualIncident.notes[0].message",
    ],
  ];
  for (const [value, expected] of cases) {
    const error = errorOf(validateInternalManualIncident(value)) ?? "";
    assert.ok(error.startsWith(expected), `${expected} vs ${error}`);
  }
});

test("draft and note inputs are strict", () => {
  const input = {
    title: "t",
    impact: "none",
    componentIds: [],
    message: "m",
    visibility: "internal",
  };
  assert.equal(validateManualIncidentDraftInput(input).ok, true);
  const r = validateManualIncidentDraftInput({ ...input, status: "monitoring" });
  assert.equal(r.ok, true);
  const bad = (value: unknown): string => errorOf(validateManualIncidentDraftInput(value)) ?? "";
  assert.equal(bad({ ...input, draft: true }), "manualIncident: has an unknown field: draft");
  assert.match(bad({ ...input, visibility: undefined }), /^manualIncident\.visibility/);
  assert.match(bad({ ...input, visibility: "private" }), /^manualIncident\.visibility/);
  assert.match(bad({ ...input, status: "resolved" }), /^manualIncident\.status/);
  assert.match(bad({ ...input, title: "x".repeat(201) }), /^manualIncident\.title/);

  assert.equal(validateManualIncidentNoteInput({ message: "a\nb" }).ok, true);
  const noteError = (value: unknown): string =>
    errorOf(validateManualIncidentNoteInput(value)) ?? "";
  assert.equal(noteError({ message: "m", author: "x" }), "note: has an unknown field: author");
  assert.match(noteError({ message: "a\u0007b" }), /^note\.message: must not contain control/);
  assert.match(noteError({ message: "x".repeat(2001) }), /^note\.message: must be 1\.\.2000/);
  assert.equal(noteError(null), "note: must be an object");
});

test("the public guard accepts legacy and explicit public items", () => {
  assert.equal(isPublicManualIncident({ ...base }), true);
  assert.equal(isPublicManualIncident({ ...base, visibility: "public", publishedAt: 5 }), true);
  const inherited: unknown = Object.assign(Object.create({ visibility: "internal" }), {
    publishedAt: 5,
  });
  assert.equal(isPublicManualIncident(inherited), true);
});

test("the public guard fails closed", () => {
  const revocable = Proxy.revocable({}, {});
  revocable.revoke();
  const cases: unknown[] = [
    { ...base, visibility: "internal" },
    { ...base, visibility: "Internal" },
    { ...base, visibility: "Public" },
    { ...base, visibility: null },
    { ...base, visibility: 1 },
    { ...base, visibility: "public", publishedAt: null },
    { ...base, publishedAt: "5" },
    { ...base, publishedAt: Number.NaN },
    { ...base, publishedAt: Number.POSITIVE_INFINITY },
    null,
    "x",
    5,
    [],
    new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("x");
        },
      },
    ),
    revocable.proxy,
  ];
  for (const [i, value] of cases.entries()) {
    assert.equal(isPublicManualIncident(value), false, `case ${i}`);
  }
});

test("the public guard never runs an accessor on a privacy key", () => {
  let calls = 0;
  const getters: [string, () => unknown][] = [
    ["visibility", () => "public"],
    ["publishedAt", () => 5],
    [
      "visibility",
      () => {
        throw new Error("boom");
      },
    ],
    [
      "publishedAt",
      () => {
        throw new Error("boom");
      },
    ],
  ];
  for (const [key, get] of getters) {
    const item = { ...base };
    Object.defineProperty(item, key, {
      enumerable: true,
      get() {
        calls += 1;
        return get();
      },
    });
    assert.equal(isPublicManualIncident(item), false, key);
  }
  const setterOnly = { ...base };
  Object.defineProperty(setterOnly, "visibility", { set() {} });
  assert.equal(isPublicManualIncident(setterOnly), false);
  assert.equal(calls, 0);
});

test("the public projection keeps exactly the public fields", () => {
  const upstream = {
    ...publishedOpen(),
    extra: "x",
    updates: publishedOpen().updates.map((u) => ({ ...u, secret: "s" })),
  };
  const projected = publicManualIncident(upstream);
  assert.notEqual(projected, upstream);
  assert.deepEqual(
    Object.keys(projected).sort((a, b) => a.localeCompare(b)),
    ["componentIds", "createdAt", "id", "impact", "resolvedAt", "status", "title", "updates"],
  );
  assert.deepEqual(projected.updates, [
    { at: 1000, status: "investigating", message: "a" },
    { at: 2000, status: "monitoring", message: "b" },
  ]);
  for (const update of projected.updates) {
    assert.deepEqual(Object.keys(update), ["at", "status", "message"]);
  }
  assert.equal(JSON.stringify(projected).includes("Private."), false);
  assert.equal(JSON.stringify(projected).includes('"U"'), false);
});
