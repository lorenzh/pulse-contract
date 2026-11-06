import { z } from "zod";
import { isAdminRevision } from "./revision.ts";
import { plainText } from "./schema.ts";

/** The 20 colour keys of a status theme palette, in the order of status `theme-config.ts`. */
export const STATUS_COLOR_KEYS = [
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
] as const;

/** The font keys of a status theme. */
export const STATUS_FONT_KEYS = ["font-sans", "font-mono"] as const;

/** The radius keys of a status theme. */
export const STATUS_RADIUS_KEYS = ["radius-sm", "radius-md", "radius-pill"] as const;

/** Longest status page name, in characters. */
export const STATUS_NAME_MAX = 60;

/** Most ids in `componentOrder`. */
export const STATUS_COMPONENT_ORDER_MAX = 500;

/** Longest radius value, in characters. */
export const STATUS_RADIUS_MAX = 32;

/** Largest `StatusSettings` document: UTF-8 bytes of `JSON.stringify(settings)`. */
export const STATUS_SETTINGS_MAX_BYTES = 65_536;

const LOGO_URL_MAX = 2048;
const FONT_MAX = 200;
const LOCKED_MAX = 60;
const FIELD_MAX = 200;
const VIA_MAX = 200;
const REASON_MAX = 300;
const MAX_COMPONENT_ID = 64;
const COMPONENT_ID = /^[a-z0-9][a-z0-9._-]*$/;
const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RADIUS_RE = /^\d+(?:\.\d+)?(?:px|rem|em)$/;
const FONT_RE = /^[A-Za-z0-9 ,'"_-]+$/;
const QUOTED_PAIR_RE = /'[^']*'|"[^"]*"/g;
// Printable ASCII without space, `"`, `\`, `<` and `>`.
const LOGO_CHARACTERS = /^[\x21\x23-\x3b\x3d\x3f-\x5b\x5d-\x7e]+$/;

const encoder = new TextEncoder();

/** UTF-8 bytes of `JSON.stringify(value)`: the measure of every byte limit of this contract. */
export function jsonByteLength(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

export const objectError = {
  error: (issue: { code: string; keys?: string[] }): string =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
      : "must be an object",
};

export const oneOf = (values: readonly string[]): string =>
  `must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`;

/** Epoch milliseconds: a non-negative safe integer. */
export const epochMs = z
  .int({ error: "must be a non-negative integer" })
  .min(0, "must be a non-negative integer")
  .max(Number.MAX_SAFE_INTEGER, "must be a non-negative integer");

export const revisionSchema = z
  .string({ error: "must be a string" })
  .refine(isAdminRevision, { error: "must be a revision sha256-<hex>" });

/** Whether every quote of a font value closes, as status `theme-config.ts` requires. */
function isFontValue(value: string): boolean {
  return FONT_RE.test(value) && !/['"]/.test(value.replace(QUOTED_PAIR_RE, ""));
}

function isLogoUrl(value: string): boolean {
  if (!LOGO_CHARACTERS.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    // An unparseable URL is not an https URL.
    return false;
  }
}

const colorValue = z
  .string({ error: "must be a string" })
  .regex(COLOR_RE, { error: "must be a colour #rgb, #rrggbb or #rrggbbaa" });

const paletteSchema = z.strictObject(
  Object.fromEntries(STATUS_COLOR_KEYS.map((key) => [key, colorValue.optional()])) as Record<
    (typeof STATUS_COLOR_KEYS)[number],
    z.ZodOptional<typeof colorValue>
  >,
  objectError,
);

const fontValue = z
  .string({ error: "must be a string" })
  .max(FONT_MAX, `must be at most ${FONT_MAX} characters`)
  .refine(isFontValue, { error: "must be a font list of letters, digits, spaces and quotes" });

const radiusValue = z
  .string({ error: "must be a string" })
  .max(STATUS_RADIUS_MAX, `must be at most ${STATUS_RADIUS_MAX} characters`)
  .regex(RADIUS_RE, { error: "must be a length in px, rem or em" });

export const statusThemeSchema = z.strictObject(
  {
    light: paletteSchema.optional(),
    dark: paletteSchema.optional(),
    "font-sans": fontValue.optional(),
    "font-mono": fontValue.optional(),
    "radius-sm": radiusValue.optional(),
    "radius-md": radiusValue.optional(),
    "radius-pill": radiusValue.optional(),
  },
  objectError,
);
/** Theme tokens of the status page. Every key is optional. */
export type StatusTheme = z.infer<typeof statusThemeSchema>;

const componentId = z
  .string({ error: "must be a string" })
  .max(MAX_COMPONENT_ID, `must be at most ${MAX_COMPONENT_ID} characters`)
  .regex(COMPONENT_ID, { error: "must match ^[a-z0-9][a-z0-9._-]*$" });

const flag = z.boolean({ error: "must be true or false" }).optional();

export const statusSettingsSchema = z
  .strictObject(
    {
      name: plainText(1, STATUS_NAME_MAX).optional(),
      logoUrl: z
        .string({ error: "must be a string" })
        .max(LOGO_URL_MAX, `must be at most ${LOGO_URL_MAX} characters`)
        .refine(isLogoUrl, {
          error: "must be an https url of printable ASCII characters without userinfo",
        })
        .optional(),
      theme: statusThemeSchema.optional(),
      componentOrder: z
        .array(componentId, { error: "must be an array" })
        .max(STATUS_COMPONENT_ORDER_MAX, `must hold at most ${STATUS_COMPONENT_ORDER_MAX} ids`)
        .superRefine((ids, ctx) => {
          const seen = new Set<string>();
          ids.forEach((id, i) => {
            if (seen.has(id)) {
              ctx.addIssue({ code: "custom", path: [i], message: "must not repeat an id" });
            }
            seen.add(id);
          });
        })
        .optional(),
      showChecks: flag,
      showLatency: flag,
      showSlos: flag,
      hideDetails: flag,
    },
    objectError,
  )
  .refine((settings) => jsonByteLength(settings) <= STATUS_SETTINGS_MAX_BYTES, {
    error: `must be at most ${STATUS_SETTINGS_MAX_BYTES} bytes as JSON`,
  });
/** Status page settings as the console edits them. An absent field takes the default. */
export type StatusSettings = z.infer<typeof statusSettingsSchema>;

export const serviceStatusSettingsSchema = z.strictObject(
  { revision: revisionSchema, settings: statusSettingsSchema },
  objectError,
);
/** Answer of `GET /service/status/settings`. */
export type ServiceStatusSettings = z.infer<typeof serviceStatusSettingsSchema>;

const boundedText = (max: number): z.ZodString =>
  z
    .string({ error: "must be a string" })
    .min(1, `must be 1..${max} characters`)
    .max(max, `must be 1..${max} characters`);

export const statusLockedFieldSchema = z.strictObject(
  {
    field: boundedText(FIELD_MAX),
    source: z.enum(["env", "file"], { error: oneOf(["env", "file"]) }),
    via: boundedText(VIA_MAX),
    value: z.json().optional(),
  },
  objectError,
);
/** A setting that a local value holds, so the database value has no effect. */
export type StatusLockedField = z.infer<typeof statusLockedFieldSchema>;

export const statusServiceReportSchema = z.strictObject(
  {
    at: epochMs,
    startedAt: epochMs,
    appliedRevision: revisionSchema.nullable(),
    rejected: z
      .strictObject(
        {
          source: z.enum(["database", "file"], { error: oneOf(["database", "file"]) }),
          reason: boundedText(REASON_MAX),
        },
        objectError,
      )
      .nullable(),
    locked: z
      .array(statusLockedFieldSchema, { error: "must be an array" })
      .max(LOCKED_MAX, `must hold at most ${LOCKED_MAX} entries`),
  },
  objectError,
);
/** Body of `PUT /service/status/report`: what status applied. */
export type StatusServiceReport = z.infer<typeof statusServiceReportSchema>;

const SERVICE_STATES = ["fresh", "stale", "never"] as const;

export const serviceStateNameSchema = z.enum(SERVICE_STATES, { error: oneOf(SERVICE_STATES) });

/** `never` has no time and no report; `fresh` and `stale` have both. */
export function addServiceStateIssues(
  service: { state: string; receivedAt: number | null; report: unknown },
  ctx: z.RefinementCtx,
): void {
  const isNever = service.state === "never";
  for (const key of ["receivedAt", "report"] as const) {
    if (isNever !== (service[key] === null)) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "must be null exactly when state is never",
      });
    }
  }
}

export const statusServiceStateSchema = z
  .strictObject(
    {
      state: serviceStateNameSchema,
      receivedAt: epochMs.nullable(),
      report: statusServiceReportSchema.nullable(),
    },
    objectError,
  )
  .superRefine(addServiceStateIssues);
/** The last status report as the api holds it. */
export type StatusServiceState = z.infer<typeof statusServiceStateSchema>;

export const adminStatusSettingsViewSchema = z.strictObject(
  { revision: revisionSchema, settings: statusSettingsSchema, service: statusServiceStateSchema },
  objectError,
);
/** `GET /admin/status/settings`. */
export type AdminStatusSettingsView = z.infer<typeof adminStatusSettingsViewSchema>;
