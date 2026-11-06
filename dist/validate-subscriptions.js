import { subscriptionAnswerSchema, subscriptionRequestSchema, subscriptionTokenRequestSchema, } from "./subscriptions.js";
import { validateWith } from "./validate-core.js";
/** Validates the body of `POST /subscriptions`. The address must already be normalized. */
export function validateSubscriptionRequest(value, path = "request") {
    return validateWith(subscriptionRequestSchema, value, path);
}
/** Validates the body of a confirm or unsubscribe call. The route checks the token pattern. */
export function validateSubscriptionTokenRequest(value, path = "request") {
    return validateWith(subscriptionTokenRequestSchema, value, path);
}
/** Validates the success answer of a subscription route. */
export function validateSubscriptionAnswer(value, path = "answer") {
    return validateWith(subscriptionAnswerSchema, value, path);
}
