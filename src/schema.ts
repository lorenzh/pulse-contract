import { z } from "zod";

/**
 * The largest delay `setTimeout` honors: 2^31-1 ms. Node clamps a larger delay to 1 ms,
 * so no layer may pass a delay above it to a timer.
 */
export const MAX_TIMER_MS = 2_147_483_647;

const text = z.string({ error: "must be a string" });
const nonEmpty = z
  .string({ error: "must be a non-empty string" })
  .min(1, "must be a non-empty string");
// zod numbers already reject NaN and Infinity.
const finite = z.number({ error: "must be a finite number" });
const integer = z.int({ error: "must be an integer" });
const bool = z.boolean({ error: "must be a boolean" });

const intBetween = (min: number, max: number): z.ZodNumber => {
  const message = `must be an integer ${min}..${max}`;
  return z.int({ error: message }).min(min, message).max(max, message);
};

const atLeast = (min: number): z.ZodNumber => {
  const message = `must be an integer >= ${min}`;
  return z.int({ error: message }).min(min, message);
};

const oneOf = <T extends string>(allowed: readonly [T, ...T[]]): z.ZodEnum<{ [K in T]: K }> =>
  z.enum(allowed, {
    error: `must be one of ${allowed.map((a) => JSON.stringify(a)).join(", ")}`,
  });

const isCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Date.UTC maps years 0..99 to 19xx, so set the year on an existing date.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const objectError = { error: "must be an object" } as const;

// Delays and durations in ms: integers that a timer can hold.
const timerMs = intBetween(1, MAX_TIMER_MS);

export const checkStatusSchema = oneOf(["up", "degraded", "down"]);
export const checkStateSchema = oneOf(["up", "degraded", "down", "unknown", "maintenance"]);

const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
export const httpMethodSchema = oneOf(HTTP_METHODS);

const utf8Bytes = (value: string): number => new TextEncoder().encode(value).length;

/** Header names the probe owns; compared in lower case. */
const FORBIDDEN_HEADERS: readonly string[] = [
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "user-agent",
];
const MAX_HEADERS = 20;
const MAX_HEADER_NAME_BYTES = 256;
const MAX_HEADER_VALUE_BYTES = 4096;
const MAX_HEADERS_TOTAL_BYTES = 16 * 1024;
/** RFC 9110 token. */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/** Space, visible ASCII and obs-text; no control characters (tab, CR, LF). */
const HEADER_VALUE = /^[\x20-\x7e\x80-\xff]*$/;
const ENV_NAME = /^[A-Za-z_]\w{0,127}$/;

export const headerValueSchema = z.union(
  [
    z.string().refine((v) => v.length <= MAX_HEADER_VALUE_BYTES && HEADER_VALUE.test(v), {
      error: `must be at most ${MAX_HEADER_VALUE_BYTES} visible ASCII/obs-text characters or spaces`,
    }),
    z.object(
      {
        env: z.string({ error: "must be an environment variable name" }).regex(ENV_NAME, {
          error: "must match ^[A-Za-z_][A-Za-z0-9_]{0,127}$",
        }),
      },
      { error: "must be a string or an object {env: NAME}" },
    ),
  ],
  { error: "must be a string or an object {env: NAME}" },
);

const headersSchema = z
  .record(z.string(), headerValueSchema, { error: "must be an object" })
  .superRefine((headers, ctx) => {
    const names = Object.keys(headers);
    if (names.length > MAX_HEADERS) {
      ctx.addIssue({ code: "custom", message: `must have at most ${MAX_HEADERS} entries` });
    }
    const seen = new Set<string>();
    let total = 0;
    for (const name of names) {
      const lower = name.toLowerCase();
      if (name.length === 0 || name.length > MAX_HEADER_NAME_BYTES || !HEADER_NAME.test(name)) {
        ctx.addIssue({
          code: "custom",
          path: [name],
          message: `is not a valid header name (token, 1..${MAX_HEADER_NAME_BYTES} bytes)`,
        });
      } else if (FORBIDDEN_HEADERS.includes(lower)) {
        ctx.addIssue({ code: "custom", path: [name], message: "is a header the probe controls" });
      } else if (seen.has(lower)) {
        ctx.addIssue({ code: "custom", path: [name], message: "is a duplicate header name" });
      }
      seen.add(lower);
      const value = headers[name];
      total += name.length + (typeof value === "string" ? value.length : 0);
    }
    if (total > MAX_HEADERS_TOTAL_BYTES) {
      ctx.addIssue({
        code: "custom",
        message: `names and literal values must total at most ${MAX_HEADERS_TOTAL_BYTES} bytes`,
      });
    }
  });

const MAX_BODY_BYTES = 65_536;
const bodySchema = z
  .string({ error: "must be a string" })
  .refine((v) => utf8Bytes(v) <= MAX_BODY_BYTES, {
    error: `must be at most ${MAX_BODY_BYTES} bytes`,
  });

const statusCodeSchema = intBetween(100, 599);
const STATUS_RANGE = /^(\d{3})-(\d{3})$/;
const rangeBounds = (value: string): [number, number] | undefined => {
  const match = STATUS_RANGE.exec(value);
  if (match === null) {
    return undefined;
  }
  const [lo, hi] = [Number(match[1]), Number(match[2])];
  return lo >= 100 && lo <= hi && hi <= 599 ? [lo, hi] : undefined;
};
const expectedStatusItemMessage =
  'must be an integer 100..599 or a range "lo-hi" with 100 <= lo <= hi <= 599';
export const expectedStatusSchema = z
  .array(
    z.union(
      [
        statusCodeSchema,
        z
          .string()
          .refine((v) => rangeBounds(v) !== undefined, { error: expectedStatusItemMessage }),
      ],
      { error: expectedStatusItemMessage },
    ),
    { error: "must be an array" },
  )
  .min(1, "must not be empty")
  .max(20, "must have at most 20 entries");

const MAX_POINTER_BYTES = 256;
const isJsonPointer = (value: string): boolean =>
  (value === "" || value.startsWith("/")) &&
  !/~(?![01])/.test(value) &&
  utf8Bytes(value) <= MAX_POINTER_BYTES;

export const jsonAssertSchema = z
  .object(
    {
      /** RFC 6901 JSON pointer, at most 256 bytes; "" is the whole document. */
      pointer: z.string({ error: "must be a JSON pointer" }).refine(isJsonPointer, {
        error: `must be an RFC 6901 JSON pointer of at most ${MAX_POINTER_BYTES} bytes`,
      }),
      /** Deep, strict equality with any JSON value. */
      equals: z.json({ error: "must be a JSON value" }).optional(),
      /** Only `true`: the pointer must resolve. */
      exists: z.literal(true, { error: "must be true" }).optional(),
    },
    objectError,
  )
  .superRefine((assertion, ctx) => {
    const hasEquals = Object.hasOwn(assertion, "equals");
    const hasExists = Object.hasOwn(assertion, "exists");
    if (hasEquals === hasExists) {
      ctx.addIssue({
        code: "custom",
        message: 'set exactly one of "equals" and "exists"',
      });
    }
  });

const jsonAssertListSchema = z
  .array(jsonAssertSchema, { error: "must be an array" })
  .min(1, "must not be empty")
  .max(10, "must have at most 10 entries");

export const httpCheckSchema = z
  .object(
    {
      id: nonEmpty,
      name: text,
      /** Absent means "http". */
      type: oneOf(["http"]).optional(),
      /** Non-empty. */
      url: nonEmpty,
      /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
      intervalMs: timerMs,
      /** Integer 1..2147483647. */
      timeoutMs: timerMs.optional(),
      /**
       * Latency objective in ms, integer 1..2147483647: a successful (2xx) result slower than
       * this is degraded. Absent means no objective.
       */
      latencyObjectiveMs: timerMs.optional(),
      /**
       * Extra attempts after a failed one (non-2xx, timeout or network error), integer 0..10.
       * Absent means 0. The api always serves the resolved value.
       */
      retries: intBetween(0, 10).optional(),
      /**
       * Wait in ms between attempts, integer 0..60000. Absent means 1000 when `retries` > 0.
       * The api always serves the resolved value.
       */
      retryDelayMs: intBetween(0, 60_000).optional(),
      /**
       * Plain case-sensitive substring that a 2xx answer body must contain. The check is `down`
       * when it does not (searched within the probe's body size limit); the probe writes `reason`
       * `keyword "<text>" not found` with the 2xx `statusCode`. Absent means the body is not read.
       * Not available on `TlsCheck`.
       */
      keyword: text.optional(),
      /** Upper-case, case-sensitive. Absent means "GET". Not available on `TlsCheck`. */
      method: httpMethodSchema.optional(),
      /**
       * Request headers, at most 20. A value is a literal string or `{ env: NAME }`, which the
       * probe resolves from its own environment. Not served by the public `GET /checks`.
       */
      headers: headersSchema.optional(),
      /** Request body, at most 65536 bytes. Not allowed with GET (the default) or HEAD. */
      body: bodySchema.optional(),
      /** Accepted final statuses. Absent means `["200-299"]`. */
      expectedStatus: expectedStatusSchema.optional(),
      /** Assertions on the JSON response body, at most 10. Not allowed with HEAD. */
      jsonAssert: jsonAssertListSchema.optional(),
    },
    objectError,
  )
  .superRefine((check, ctx) => {
    const method = check.method ?? "GET";
    if (check.body !== undefined && (method === "GET" || method === "HEAD")) {
      ctx.addIssue({ code: "custom", path: ["body"], message: `is not allowed with ${method}` });
    }
    if (method === "HEAD") {
      for (const key of ["jsonAssert", "keyword"] as const) {
        if (check[key] !== undefined) {
          ctx.addIssue({ code: "custom", path: [key], message: "is not allowed with HEAD" });
        }
      }
    }
  });

export const tlsCheckSchema = z.object(
  {
    id: nonEmpty,
    name: text,
    type: oneOf(["tls"]),
    /** Non-empty. */
    host: nonEmpty,
    /** Integer 1..65535. */
    port: intBetween(1, 65_535),
    /** Integer >= 0. The check is down when the certificate has this many days or fewer left. */
    warnDays: atLeast(0),
    /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
    intervalMs: timerMs,
    /** Integer 1..2147483647. */
    timeoutMs: timerMs.optional(),
    /** Not available on this check type. */
    method: z.never().optional(),
    headers: z.never().optional(),
    body: z.never().optional(),
    expectedStatus: z.never().optional(),
    jsonAssert: z.never().optional(),
    keyword: z.never().optional(),
  },
  objectError,
);

/** Smallest `intervalMs` of a domain check: 1 hour. */
export const MIN_DOMAIN_INTERVAL_MS = 3_600_000;

const HOSTNAME_LABEL = /^\w(?:[\w-]{0,61}\w)?$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const isLabelList = (value: string, label: RegExp, minLabels: number): boolean => {
  if (value.length > 253) {
    return false;
  }
  const labels = value.split(".");
  return labels.length >= minLabels && labels.every((l) => label.test(l));
};

// Browser-safe IPv6 check: the URL parser accepts exactly the bracketed IPv6 literals.
const isIpv6 = (value: string): boolean => {
  if (!value.includes(":") || !/^[0-9A-Fa-f:.]+$/.test(value)) {
    return false;
  }
  try {
    return new URL(`http://[${value}]/`).hostname !== "";
  } catch {
    // An unparsable literal is simply not an IPv6 address.
    return false;
  }
};

const hostnameSchema = nonEmpty.refine((v) => isLabelList(v, HOSTNAME_LABEL, 1), {
  error: "must be a hostname without scheme, port or path",
});

const domainNameSchema = nonEmpty.refine((v) => isLabelList(v, DOMAIN_LABEL, 2), {
  error: "must be a lowercase domain name with at least two labels, without scheme, port or path",
});

const resolverSchema = nonEmpty.refine((v) => IPV4.test(v) || isIpv6(v), {
  error: "must be an IPv4 or IPv6 address without port",
});

const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;
export const dnsRecordTypeSchema = oneOf(DNS_RECORD_TYPES);

const dnsExpectedSchema = z
  .array(nonEmpty, { error: "must be an array" })
  .min(1, "must not be empty")
  .max(20, "must have at most 20 entries");

/** Fields shared by the retrying non-HTTP checks, and the HTTP-only fields they reject. */
const probedFields = {
  id: nonEmpty,
  name: text,
  /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
  timeoutMs: timerMs.optional(),
  /** Extra attempts after a failed one, integer 0..10. Absent means 0; the api serves it resolved. */
  retries: intBetween(0, 10).optional(),
  /** Wait in ms between attempts, integer 0..60000. Absent means 1000; the api serves it resolved. */
  retryDelayMs: intBetween(0, 60_000).optional(),
  /** Not available on this check type. */
  url: z.never().optional(),
  method: z.never().optional(),
  headers: z.never().optional(),
  body: z.never().optional(),
  expectedStatus: z.never().optional(),
  jsonAssert: z.never().optional(),
  keyword: z.never().optional(),
  latencyObjectiveMs: z.never().optional(),
};

export const tcpCheckSchema = z.object(
  {
    ...probedFields,
    type: oneOf(["tcp"]),
    /** Non-empty. */
    host: nonEmpty,
    /** Integer 1..65535. */
    port: intBetween(1, 65_535),
    /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
    intervalMs: timerMs,
  },
  objectError,
);

export const dnsCheckSchema = z.object(
  {
    ...probedFields,
    type: oneOf(["dns"]),
    /** Hostname to resolve. `name` is the display name of every check, so the DNS name is `dnsName`. */
    dnsName: hostnameSchema,
    recordType: dnsRecordTypeSchema,
    /** Values the answer must contain, 1..20 entries. Absent means any answer is up. */
    expected: dnsExpectedSchema.optional(),
    /** IPv4 or IPv6 address of the resolver, without port. Absent means the system resolver. */
    resolver: resolverSchema.optional(),
    /** Integer 1..2147483647 (`MAX_TIMER_MS`). */
    intervalMs: timerMs,
  },
  objectError,
);

export const domainCheckSchema = z
  .object(
    {
      ...probedFields,
      type: oneOf(["domain"]),
      /** Lowercase domain name with at least two labels. */
      domain: domainNameSchema,
      /** Integer >= 0. The check is degraded when the domain has this many days or fewer left. */
      warnDays: atLeast(0),
      /** Integer `MIN_DOMAIN_INTERVAL_MS`..2147483647. */
      intervalMs: timerMs,
    },
    objectError,
  )
  .superRefine((check, ctx) => {
    if (check.intervalMs < MIN_DOMAIN_INTERVAL_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["intervalMs"],
        message: `must be at least ${MIN_DOMAIN_INTERVAL_MS} (1 hour) for a domain check`,
      });
    }
  });

export const heartbeatCheckSchema = z.object(
  {
    id: nonEmpty,
    name: text,
    type: oneOf(["heartbeat"]),
    /** Expected time between pings in ms, integer 1000..86400000. */
    period: intBetween(1000, 86_400_000),
    /** Extra wait in ms before the check is down, integer 0..86400000. Always set in served data. */
    grace: intBetween(0, 86_400_000),
    /** Not available on this check type. */
    method: z.never().optional(),
    headers: z.never().optional(),
    body: z.never().optional(),
    expectedStatus: z.never().optional(),
    jsonAssert: z.never().optional(),
    keyword: z.never().optional(),
  },
  objectError,
);

const optionalCertDaysLeft = integer.nullable().optional();

export const resultSchema = z.object(
  {
    checkId: nonEmpty,
    /** Epoch ms, set by the probe. */
    timestamp: integer,
    status: checkStatusSchema,
    /** Integer 100..599; null when no response arrived. */
    statusCode: intBetween(100, 599).nullable(),
    latencyMs: finite,
    /** null when up or when no reason applies. */
    reason: text.nullable(),
    /** Name of the probe location that produced the result; `default` for legacy results. */
    location: text,
    /** Attempts made for this result, integer >= 1 (at most `retries` + 1). */
    attempts: atLeast(1),
    /** TLS and domain checks: floored whole days until expiry, negative when expired, null when unread. */
    certDaysLeft: optionalCertDaysLeft,
  },
  objectError,
);

export const postResultRequestSchema = z.object(
  {
    checkId: nonEmpty,
    timestamp: integer,
    status: checkStatusSchema,
    statusCode: intBetween(100, 599).nullable(),
    latencyMs: z
      .number({ error: "must be a finite number >= 0" })
      .min(0, "must be a finite number >= 0"),
    reason: text.nullable(),
    location: text.optional(),
    attempts: atLeast(1).optional(),
    certDaysLeft: optionalCertDaysLeft,
  },
  objectError,
);

export const incidentSchema = z.object(
  {
    id: integer,
    checkId: nonEmpty,
    openedAt: finite,
    resolvedAt: finite.nullable(),
    /** The reason of the result that opened the incident. */
    reason: text.nullable(),
  },
  objectError,
);

export const maintenanceWindowSchema = z
  .object(
    {
      checkId: nonEmpty,
      /** Epoch ms, inclusive. */
      start: finite,
      /** Epoch ms, exclusive; greater than `start`. */
      end: finite,
      note: text,
    },
    objectError,
  )
  .refine((window) => window.end > window.start, {
    path: ["end"],
    error: "must be greater than start",
  });

export const locationResultSchema = z.object(
  {
    location: text,
    result: resultSchema,
    /** True when the latest result is outside the window ending at the check's newest result. */
    stale: bool,
  },
  objectError,
);

export const checkStateFieldsSchema = z.object(
  {
    state: checkStateSchema,
    consecutiveDown: integer,
    lastResultAt: finite.nullable(),
    lastReason: text.nullable(),
    /** Latest result per location ever seen, sorted by location name; empty without results. */
    locations: z.array(locationResultSchema, { error: "must be an array" }),
    /** The active window; set only when state is "maintenance". */
    maintenance: maintenanceWindowSchema.optional(),
    /** certDaysLeft of the latest result; absent or null for other check types and without a certificate. */
    certDaysLeft: optionalCertDaysLeft,
  },
  objectError,
);

const percent = z
  .number({ error: "must be null or a number 0..100" })
  .min(0, "must be null or a number 0..100")
  .max(100, "must be null or a number 0..100")
  .nullable();

export const uptimeDaySchema = z.object(
  {
    /** UTC calendar day, YYYY-MM-DD, a real date. */
    date: z
      .string({ error: "must be a YYYY-MM-DD date" })
      .refine(isCalendarDate, "must be a YYYY-MM-DD date"),
    /**
     * (up + degraded results) / all results * 100, unrounded, 0..100. null when the day has
     * no results (a day without results is not down).
     */
    uptime: percent,
    /** Number of results of the day; 0 when `uptime` is null. */
    results: atLeast(0),
  },
  objectError,
);

export const checkUptimeSchema = z.object(
  {
    checkId: nonEmpty,
    /** Exactly 90 UTC days, oldest first; the last is the date of the service's `now()`. */
    days: z.array(uptimeDaySchema, { error: "must be an array" }),
    /** Result-weighted over the window: sum(up + degraded) / sum(all) * 100; 0..100 or null. */
    uptime: percent,
  },
  objectError,
);

const MAX_COMPONENT_ID = 64;
const COMPONENT_ID = /^[a-z0-9][a-z0-9._-]*$/;
// Control characters (C0, DEL, C1) are not allowed in customer-facing text.
const CONTROL_CHARACTER = /\p{Cc}/u;

/** Plain text of 1..max (or 0..max) characters: trimmed, without control characters. */
const plainText = (min: number, max: number): z.ZodString => {
  const range = min === 0 ? `at most ${max}` : `${min}..${max}`;
  return z
    .string({ error: "must be a string" })
    .min(min, `must be ${range} characters`)
    .max(max, `must be ${range} characters`)
    .refine((v) => v === v.trim(), { error: "must not start or end with whitespace" })
    .refine((v) => !CONTROL_CHARACTER.test(v), { error: "must not contain control characters" });
};

const componentFields = {
  /** `^[a-z0-9][a-z0-9._-]*$`, at most 64 characters. Own namespace, apart from check ids. */
  id: z
    .string({ error: "must be a string" })
    .max(MAX_COMPONENT_ID, `must be at most ${MAX_COMPONENT_ID} characters`)
    .regex(COMPONENT_ID, { error: "must match ^[a-z0-9][a-z0-9._-]*$" }),
  /** Plain text, 1..100 characters. */
  name: plainText(1, 100),
  /** Plain text, at most 500 characters. */
  description: plainText(0, 500).optional(),
  /** Ids of the member checks: non-empty, without duplicates. Unknown ids are the api's concern. */
  checkIds: z
    .array(nonEmpty, { error: "must be an array" })
    .min(1, "must not be empty")
    .refine((ids) => new Set(ids).size === ids.length, { error: "must not contain duplicates" }),
  /** Section heading, plain text, 1..100 characters. */
  group: plainText(1, 100).optional(),
};

/** A customer-facing group of checks, as configured. Unknown keys are rejected. */
export const componentSchema = z.strictObject(componentFields, {
  error: (issue) =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${issue.keys.join(", ")}`
      : "must be an object",
});

export const componentWithStateSchema = z.object(
  {
    ...componentFields,
    /** Combined state of the member checks; see `combineStates`. */
    state: checkStateSchema,
    /** Window uptime as in `ComponentUptime.uptime`. */
    uptime: percent,
    /** Ids of the open incidents of the member checks, ascending. */
    incidentIds: z.array(integer, { error: "must be an array" }),
  },
  objectError,
);

export const componentUptimeSchema = z.object(
  {
    componentId: nonEmpty,
    /** Exactly 90 UTC days, oldest first; aggregated by `aggregateUptime`. */
    days: z.array(uptimeDaySchema, { error: "must be an array" }),
    /** Result-weighted over the window; 0..100 or null. */
    uptime: percent,
  },
  objectError,
);

/** "degraded": the check answered successfully but slower than its latency objective. */
/** Limits of manual incidents. Lengths count UTF-16 code units, as `String.length` does. */
export const MANUAL_INCIDENT_TITLE_MAX = 200;
export const MANUAL_INCIDENT_MESSAGE_MAX = 2000;
export const MANUAL_INCIDENT_MAX_UPDATES = 100;
export const MANUAL_INCIDENT_MAX_COMPONENTS = 50;
/** Largest request body the api accepts for a write: 16 KiB. */
export const MANUAL_INCIDENT_MAX_BODY_BYTES = 16 * 1024;

export const MANUAL_INCIDENT_IMPACTS = ["none", "minor", "major", "critical"] as const;
export const MANUAL_INCIDENT_STATUSES = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
] as const;

export const manualIncidentImpactSchema = oneOf(MANUAL_INCIDENT_IMPACTS);
export const manualIncidentStatusSchema = oneOf(MANUAL_INCIDENT_STATUSES);
const openStatusSchema = oneOf(["investigating", "identified", "monitoring"]);

/** Plain text: control characters are refused, newline only where `multiline` is set. */
const plainBody = (max: number, multiline: boolean): z.ZodString =>
  z
    .string({ error: "must be a string" })
    .min(1, `must be 1..${max} characters`)
    .max(max, `must be 1..${max} characters`)
    .refine((v) => !(multiline ? /[^\P{Cc}\n]/u : /\p{Cc}/u).test(v), {
      error: multiline
        ? "must not contain control characters except newline"
        : "must not contain control characters",
    });

const manualTitle = plainBody(MANUAL_INCIDENT_TITLE_MAX, false);
const manualMessage = plainBody(MANUAL_INCIDENT_MESSAGE_MAX, true);

const manualComponentIds = z
  .array(
    z
      .string({ error: "must be a string" })
      .max(MAX_COMPONENT_ID, `must be at most ${MAX_COMPONENT_ID} characters`)
      .regex(COMPONENT_ID, { error: "must match ^[a-z0-9][a-z0-9._-]*$" }),
    { error: "must be an array" },
  )
  .max(MANUAL_INCIDENT_MAX_COMPONENTS, `must have at most ${MANUAL_INCIDENT_MAX_COMPONENTS} ids`)
  .refine((ids) => new Set(ids).size === ids.length, { error: "must not contain duplicates" });

/** One timed message of a manual incident. */
export const manualIncidentUpdateSchema = z.object(
  { at: finite, status: manualIncidentStatusSchema, message: manualMessage },
  objectError,
);

/** Body of `POST /manual-incidents`. `status` defaults to `investigating`; not `resolved`. */
export const manualIncidentInputSchema = z.object(
  {
    title: manualTitle,
    impact: manualIncidentImpactSchema,
    componentIds: manualComponentIds,
    status: openStatusSchema.optional(),
    message: manualMessage,
  },
  objectError,
);

/** Body of `POST /manual-incidents/{id}/updates`. `status` may be `resolved`. */
export const manualIncidentUpdateInputSchema = z.object(
  { status: manualIncidentStatusSchema, message: manualMessage },
  objectError,
);

/**
 * A manual incident. Invariants: `status` is `resolved` iff `resolvedAt` is set; `updates` is
 * non-empty, ordered by `at`; the last update has the incident status and, when resolved, `at`
 * equal to `resolvedAt`.
 */
export const manualIncidentSchema = z
  .object(
    {
      id: integer,
      title: manualTitle,
      componentIds: manualComponentIds,
      impact: manualIncidentImpactSchema,
      status: manualIncidentStatusSchema,
      createdAt: finite,
      resolvedAt: finite.nullable(),
      updates: z
        .array(manualIncidentUpdateSchema, { error: "must be an array" })
        .min(1, "must not be empty")
        .max(
          MANUAL_INCIDENT_MAX_UPDATES,
          `must have at most ${MANUAL_INCIDENT_MAX_UPDATES} updates`,
        ),
    },
    objectError,
  )
  .superRefine((incident, ctx) => {
    const isResolved = incident.status === "resolved";
    if (isResolved !== (incident.resolvedAt !== null)) {
      ctx.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message: "must be set exactly when status is resolved",
      });
    }
    for (const [i, update] of incident.updates.entries()) {
      const previous = incident.updates[i - 1];
      if (previous !== undefined && update.at < previous.at) {
        ctx.addIssue({
          code: "custom",
          path: ["updates", i, "at"],
          message: "must not precede the previous update",
        });
      }
    }
    const last = incident.updates.at(-1);
    if (last === undefined) {
      return;
    }
    const index = incident.updates.length - 1;
    if (last.status !== incident.status) {
      ctx.addIssue({
        code: "custom",
        path: ["updates", index, "status"],
        message: "must equal the incident status",
      });
    }
    if (incident.resolvedAt !== null && last.at !== incident.resolvedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["updates", index, "at"],
        message: "must equal resolvedAt",
      });
    }
  });

export type CheckStatus = z.infer<typeof checkStatusSchema>;
/** A `CheckStatus`, or "unknown" (no result yet) or "maintenance" (active window). */
export type CheckState = z.infer<typeof checkStateSchema>;
export type HttpMethod = z.infer<typeof httpMethodSchema>;
/** A literal header value, or `{ env: NAME }` that the probe resolves from its environment. */
export type HeaderValue = z.infer<typeof headerValueSchema>;
/** A status code 100..599 or a range string `"lo-hi"`. */
export type ExpectedStatus = z.infer<typeof expectedStatusSchema>[number];
/** `{ pointer, equals }` or `{ pointer, exists: true }`. */
export type JsonAssertion = z.infer<typeof jsonAssertSchema>;
export type HttpCheck = z.infer<typeof httpCheckSchema>;
/**
 * Watches the leaf certificate of a TLS endpoint. Only the leaf's expiry is judged;
 * the chain and the hostname are not verified. `port` and `warnDays` are always set
 * in served data (the api config parser applies the defaults 443 and 14).
 */
export type TlsCheck = z.infer<typeof tlsCheckSchema>;
/**
 * A job pings the api; the check is down when no ping arrives within `period + grace`.
 * The probe never runs it. In `CheckWithState`, `lastResultAt` is the time of the last ping.
 * The ping secret is not part of this type: the api never serves it.
 */
export type HeartbeatCheck = z.infer<typeof heartbeatCheckSchema>;
/** A TCP port that must accept a connection; the probe sends nothing and closes at once. */
export type TcpCheck = z.infer<typeof tcpCheckSchema>;
export type DnsRecordType = z.infer<typeof dnsRecordTypeSchema>;
/** A DNS record that must resolve, to the `expected` values when set. */
export type DnsCheck = z.infer<typeof dnsCheckSchema>;
/**
 * Watches the registration expiry of a domain (RDAP). `certDaysLeft` carries the whole days
 * left. Degraded within `warnDays`, down when expired or unknown. `intervalMs` is at least
 * `MIN_DOMAIN_INTERVAL_MS`.
 */
export type DomainCheck = z.infer<typeof domainCheckSchema>;
export type Check = HttpCheck | TlsCheck | TcpCheck | DnsCheck | DomainCheck | HeartbeatCheck;
export type Result = z.infer<typeof resultSchema>;
export type Incident = z.infer<typeof incidentSchema>;
export type ManualIncidentImpact = z.infer<typeof manualIncidentImpactSchema>;
export type ManualIncidentStatus = z.infer<typeof manualIncidentStatusSchema>;
/** One timed message of a manual incident; its index is the stable update number. */
export type ManualIncidentUpdate = z.infer<typeof manualIncidentUpdateSchema>;
/** An incident that an operator posts by hand. */
export type ManualIncident = z.infer<typeof manualIncidentSchema>;
/** Body of `POST /manual-incidents`. */
export type ManualIncidentInput = z.infer<typeof manualIncidentInputSchema>;
/** Body of `POST /manual-incidents/{id}/updates`. */
export type ManualIncidentUpdateInput = z.infer<typeof manualIncidentUpdateInputSchema>;
/** A planned maintenance window for one check, half-open `[start, end)`. */
export type MaintenanceWindow = z.infer<typeof maintenanceWindowSchema>;
/** The latest result of one probe location for a check. */
export type LocationResult = z.infer<typeof locationResultSchema>;
export type CheckStateFields = z.infer<typeof checkStateFieldsSchema>;
/** A check with its evaluated state; distributes over the `Check` union. */
export type CheckWithState = Check & CheckStateFields;
/** One UTC calendar day of a check's uptime. */
export type UptimeDay = z.infer<typeof uptimeDaySchema>;
/** The 90-day uptime of one check. */
export type CheckUptime = z.infer<typeof checkUptimeSchema>;
/** A named, customer-facing group of checks. */
export type Component = z.infer<typeof componentSchema>;
/** A component with its combined state, window uptime and open incident ids. */
export type ComponentWithState = z.infer<typeof componentWithStateSchema>;
/** The 90-day uptime of one component. */
export type ComponentUptime = z.infer<typeof componentUptimeSchema>;
/**
 * Body of POST /results: a `Result` where `location` and `attempts` may be absent. A missing
 * `attempts` means 1; a missing or blank `location` means `default`.
 */
export type PostResultRequest = z.infer<typeof postResultRequestSchema>;
/** GET /checks */
export type ChecksResponse = CheckWithState[];
/** GET /checks/:id/results */
export type ResultsResponse = Result[];
/** GET /incidents */
export type IncidentsResponse = Incident[];
/** GET /manual-incidents */
export type ManualIncidentsResponse = ManualIncident[];
/** GET /maintenance */
export type MaintenanceResponse = MaintenanceWindow[];
/** GET /uptime: one entry per configured check, in the order of GET /checks. */
export type UptimeResponse = CheckUptime[];
/** GET /components: one entry per configured component, in configured order. */
export type ComponentsResponse = ComponentWithState[];
/** GET /components/uptime: one entry per configured component, in configured order. */
export type ComponentsUptimeResponse = ComponentUptime[];

export interface ErrorResponse {
  error: string;
}
