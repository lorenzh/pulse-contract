import {
  type SubscriptionAnswer,
  type SubscriptionRequest,
  type SubscriptionTokenRequest,
  subscriptionAnswerSchema,
  subscriptionRequestSchema,
  subscriptionTokenRequestSchema,
} from "./subscriptions.ts";
import { type Validation, validateWith } from "./validate-core.ts";

/** Validates the body of `POST /subscriptions`. The address must already be normalized. */
export function validateSubscriptionRequest(
  value: unknown,
  path = "request",
): Validation<SubscriptionRequest> {
  return validateWith(subscriptionRequestSchema, value, path);
}

/** Validates the body of a confirm or unsubscribe call. The route checks the token pattern. */
export function validateSubscriptionTokenRequest(
  value: unknown,
  path = "request",
): Validation<SubscriptionTokenRequest> {
  return validateWith(subscriptionTokenRequestSchema, value, path);
}

/** Validates the success answer of a subscription route. */
export function validateSubscriptionAnswer(
  value: unknown,
  path = "answer",
): Validation<SubscriptionAnswer> {
  return validateWith(subscriptionAnswerSchema, value, path);
}
