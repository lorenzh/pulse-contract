import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  STATUS_COLOR_KEYS,
  STATUS_COMPONENT_ORDER_MAX,
  STATUS_FONT_KEYS,
  STATUS_NAME_MAX,
  STATUS_RADIUS_KEYS,
  STATUS_RADIUS_MAX,
  STATUS_SETTINGS_MAX_BYTES,
} from "../src/runtime-settings.ts";
import {
  validateAdminStatusSettingsView,
  validateServiceStatusSettings,
  validateStatusServiceReport,
  validateStatusSettings,
} from "../src/validate-runtime.ts";

const revision = `sha256-${"0".repeat(64)}`;
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

test("constants equal the spec literals and status theme-config.ts at 8b6d431", () => {
  // Copied from status src/theme-config.ts:6-29 at 8b6d431.
  assert.deepEqual(STATUS_COLOR_KEYS, [
    "bg",
    "surface",
    "rule",
    "line-strong",
    "field-line",
    "text",
    "lead",
    "muted",
    "accent",
    "accent-text",
    "tint",
    "tint-line",
    "success",
    "success-tint",
    "warning",
    "warning-tint",
    "error",
    "error-tint",
    "info",
    "info-tint",
  ]);
  assert.deepEqual(STATUS_FONT_KEYS, ["font-sans", "font-mono"]);
  assert.deepEqual(STATUS_RADIUS_KEYS, ["radius-sm", "radius-md", "radius-pill"]);
  assert.equal(STATUS_NAME_MAX, 60);
  assert.equal(STATUS_COMPONENT_ORDER_MAX, 500);
  assert.equal(STATUS_RADIUS_MAX, 32);
  assert.equal(STATUS_SETTINGS_MAX_BYTES, 65536);
});

test("settings refuse the counterexamples with literal messages", () => {
  const cases: [unknown, string][] = [
    [{ componentOrder: ["a", "a"] }, "settings.componentOrder[1]: must not repeat an id"],
    [{ name: "n".repeat(61) }, "settings.name: must be 1..60 characters"],
    [
      { theme: { light: { bg: "#12" } } },
      "settings.theme.light.bg: must be a colour #rgb, #rrggbb or #rrggbbaa",
    ],
    [
      { theme: { "radius-sm": "4pt" } },
      "settings.theme.radius-sm: must be a length in px, rem or em",
    ],
    [
      { theme: { "radius-sm": `${"1".repeat(31)}px` } },
      "settings.theme.radius-sm: must be at most 32 characters",
    ],
    [{ name: null }, "settings.name: must be a string"],
    [{ showChecks: null }, "settings.showChecks: must be true or false"],
    [
      { componentOrder: ["a".repeat(65)] },
      "settings.componentOrder[0]: must be at most 64 characters",
    ],
    [{ componentOrder: ["Web"] }, "settings.componentOrder[0]: must match ^[a-z0-9][a-z0-9._-]*$"],
    [{ theme: { light: { nope: "#fff" } } }, "settings.theme.light: has an unknown field: nope"],
    [{ extra: 1 }, "settings: has an unknown field: extra"],
  ];
  const logo =
    "settings.logoUrl: must be an https url of printable ASCII characters without userinfo";
  for (const url of [
    "https://x.test/a b.png",
    "https://x.test/ä.png",
    "https://user:pw@x.test/a.png",
    "http://x.test/a.png",
  ]) {
    cases.push([{ logoUrl: url }, logo]);
  }
  for (const [input, error] of cases) {
    assert.deepEqual(validateStatusSettings(input), { ok: false, error }, JSON.stringify(input));
  }
});

test("the largest valid settings stay below 40000 bytes and are accepted as the same object", () => {
  const palette = Object.fromEntries(STATUS_COLOR_KEYS.map((k) => [k, "#aabbccdd"]));
  const font = `'${"F".repeat(198)}'`;
  const radius = `${"1".repeat(30)}px`;
  const settings = {
    name: "n".repeat(60),
    logoUrl: `https://${"a".repeat(2040)}`,
    theme: {
      light: palette,
      dark: palette,
      "font-sans": font,
      "font-mono": font,
      "radius-sm": radius,
      "radius-md": radius,
      "radius-pill": radius,
    },
    componentOrder: Array.from({ length: 500 }, (_, i) => String(i).padStart(64, "0")),
    showChecks: true,
    showLatency: false,
    showSlos: false,
    hideDetails: true,
  };
  assert.ok(bytes(settings) < 40000, String(bytes(settings)));
  const result = validateStatusSettings(settings);
  assert.ok(result.ok && Object.is(result.value, settings));
  assert.equal(validateStatusSettings({}).ok, true);
});

test("a radius of exactly 32 characters is accepted", () => {
  assert.equal(validateStatusSettings({ theme: { "radius-md": `${"1".repeat(30)}px` } }).ok, true);
});

test("service answer, report and admin view", () => {
  const settings = { name: "Acme" };
  const answer = { revision, settings };
  const ok = validateServiceStatusSettings(answer);
  assert.ok(ok.ok && Object.is(ok.value, answer));
  assert.deepEqual(validateServiceStatusSettings({ settings }), {
    ok: false,
    error: "settings answer.revision: is required",
  });
  const report = {
    at: 2,
    startedAt: 1,
    appliedRevision: null,
    rejected: { source: "file", reason: "settings file: cannot read: ENOENT" },
    locked: [{ field: "showChecks", source: "env", via: "PULSE_STATUS_SHOW_CHECKS", value: false }],
  };
  assert.equal(validateStatusServiceReport(report).ok, true);
  assert.deepEqual(
    validateStatusServiceReport({
      ...report,
      rejected: { source: "file", reason: "r".repeat(301) },
    }),
    { ok: false, error: "report.rejected.reason: must be 1..300 characters" },
  );
  assert.deepEqual(
    validateStatusServiceReport({ ...report, locked: Array(61).fill(report.locked[0]) }),
    {
      ok: false,
      error: "report.locked: must hold at most 60 entries",
    },
  );
  const view = { revision, settings, service: { state: "fresh", receivedAt: 3, report } };
  assert.equal(validateAdminStatusSettingsView(view).ok, true);
  const never = { revision, settings, service: { state: "never", receivedAt: null, report: null } };
  assert.equal(validateAdminStatusSettingsView(never).ok, true);
  assert.deepEqual(
    validateAdminStatusSettingsView({ ...never, service: { ...never.service, report } }),
    { ok: false, error: "view.service.report: must be null exactly when state is never" },
  );
  assert.deepEqual(
    validateAdminStatusSettingsView({
      ...view,
      service: { state: "stale", receivedAt: null, report },
    }),
    { ok: false, error: "view.service.receivedAt: must be null exactly when state is never" },
  );
});

test("validators never throw on any input type", () => {
  const hostile = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error("trap");
      },
    },
  );
  for (const value of [undefined, null, 1, "x", [], () => 1, Symbol("s"), 1n, hostile]) {
    for (const validate of [
      validateStatusSettings,
      validateServiceStatusSettings,
      validateStatusServiceReport,
      validateAdminStatusSettingsView,
    ]) {
      assert.equal(validate(value).ok, false);
    }
  }
});

test("a getter on the settings never runs", () => {
  let ran = false;
  const settings = {};
  Object.defineProperty(settings, "name", {
    enumerable: true,
    get: () => {
      ran = true;
      return "x";
    },
  });
  validateStatusSettings(settings);
  assert.equal(ran, false);
});
