import { type SubscriptionAnswer, type SubscriptionRequest, type SubscriptionTokenRequest } from "./subscriptions.ts";
import { type Validation } from "./validate-core.ts";
/** Validates the body of `POST /subscriptions`. The address must already be normalized. */
export declare function validateSubscriptionRequest(value: unknown, path?: string): Validation<SubscriptionRequest>;
/** Validates the body of a confirm or unsubscribe call. The route checks the token pattern. */
export declare function validateSubscriptionTokenRequest(value: unknown, path?: string): Validation<SubscriptionTokenRequest>;
/** Validates the success answer of a subscription route. */
export declare function validateSubscriptionAnswer(value: unknown, path?: string): Validation<SubscriptionAnswer>;
