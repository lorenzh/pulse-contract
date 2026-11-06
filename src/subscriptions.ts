import { z } from "zod";

/** Routes of the notify subscription listener. */
export const SUBSCRIPTION_ROUTES = {
  subscribe: "/subscriptions",
  confirm: "/subscriptions/confirm",
  unsubscribe: "/subscriptions/unsubscribe",
} as const;

/** Largest request body of a subscription route, in bytes. */
export const SUBSCRIPTION_MAX_BODY_BYTES = 1024;

/** How long a confirmation link works: 24 hours. */
export const SUBSCRIPTION_CONFIRM_TTL_MS = 86_400_000;

/** Period of notify's cleanup of unconfirmed subscriptions: 1 hour. */
export const SUBSCRIPTION_CLEANUP_INTERVAL_MS = 3_600_000;

/** Longest subscriber address after normalization. */
export const SUBSCRIBER_EMAIL_MAX = 254;

/** Token of a confirmation link. */
export const SUBSCRIPTION_CONFIRM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Token of an unsubscribe link: id, a dot, and the secret. */
export const SUBSCRIPTION_UNSUBSCRIBE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/;

/** Statuses of a successful subscription answer. */
export const SUBSCRIPTION_RESULTS = ["accepted", "confirmed", "unsubscribed"] as const;

const TOKEN_MAX = 128;
const LOCAL_MAX = 64;
const DOMAIN_MAX = 253;
const LABEL_MAX = 63;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const ALL_DIGITS = /^\d+$/;
const isBlank = (c: string | undefined): boolean => c === " " || c === "\t";

/** Removes spaces and tabs at both ends; `String.trim` would also remove other whitespace. */
function trimBlanks(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && isBlank(value[start])) {
    start++;
  }
  while (end > start && isBlank(value[end - 1])) {
    end--;
  }
  return value.slice(start, end);
}

function isLocalPart(local: string): boolean {
  return (
    local.length >= 1 &&
    local.length <= LOCAL_MAX &&
    LOCAL_PART.test(local) &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..")
  );
}

function isDomain(domain: string): boolean {
  if (domain.length < 1 || domain.length > DOMAIN_MAX) {
    return false;
  }
  const labels = domain.split(".");
  const last = labels.at(-1);
  return (
    labels.length >= 2 &&
    last !== undefined &&
    !ALL_DIGITS.test(last) &&
    labels.every((label) => label.length <= LABEL_MAX && LABEL.test(label))
  );
}

/**
 * The normalized subscriber address, or `undefined` when the value is not an accepted address.
 * Trims spaces and tabs at both ends and lower-cases the result. Never throws.
 */
export function normalizeSubscriberEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = trimBlanks(value);
  if (!PRINTABLE_ASCII.test(trimmed)) {
    return undefined;
  }
  const parts = trimmed.split("@");
  const [local, domain] = parts;
  if (parts.length !== 2 || local === undefined || domain === undefined) {
    return undefined;
  }
  if (!isLocalPart(local) || !isDomain(domain)) {
    return undefined;
  }
  const result = trimmed.toLowerCase();
  return result.length <= SUBSCRIBER_EMAIL_MAX ? result : undefined;
}

const objectError = {
  error: (issue: { code: string; keys?: string[] }): string =>
    issue.code === "unrecognized_keys"
      ? `has an unknown field: ${(issue.keys ?? []).join(", ")}`
      : "must be an object",
};

/** Body of `POST /subscriptions`. Only the normalized address is valid. */
export const subscriptionRequestSchema = z.strictObject(
  {
    email: z
      .string({ error: "must be a string" })
      .refine((v) => normalizeSubscriberEmail(v) === v, {
        error: "must be a normalized email address",
      }),
  },
  objectError,
);

/** Body of `POST /subscriptions/confirm` and `/subscriptions/unsubscribe`. */
export const subscriptionTokenRequestSchema = z.strictObject(
  {
    token: z
      .string({ error: "must be a string" })
      .max(TOKEN_MAX, { error: `must be at most ${TOKEN_MAX} characters` }),
  },
  objectError,
);

const subscriptionResultSchema = z.enum(SUBSCRIPTION_RESULTS, {
  error: `must be one of ${SUBSCRIPTION_RESULTS.map((s) => JSON.stringify(s)).join(", ")}`,
});

/** Success answer of a subscription route. */
export const subscriptionAnswerSchema = z.strictObject(
  { status: subscriptionResultSchema },
  objectError,
);

export type SubscriptionRequest = z.infer<typeof subscriptionRequestSchema>;
export type SubscriptionTokenRequest = z.infer<typeof subscriptionTokenRequestSchema>;
export type SubscriptionResult = z.infer<typeof subscriptionResultSchema>;
export type SubscriptionAnswer = z.infer<typeof subscriptionAnswerSchema>;
