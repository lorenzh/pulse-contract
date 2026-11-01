import { tokenCreateInputSchema, tokenMetadataSchema, tokenSecretResponseSchema, tokensResponseSchema, } from "./tokens.js";
import { validateWith } from "./validate-core.js";
/** Validates a token as the api serves it. A `secret` or digest field is rejected. */
export function validateTokenMetadata(value, path = "token") {
    return validateWith(tokenMetadataSchema, value, path);
}
/** Validates `GET /admin/tokens`. */
export function validateTokensResponse(value, path = "tokens") {
    return validateWith(tokensResponseSchema, value, path);
}
/**
 * Validates the body of `POST /admin/tokens`. It has no clock: the api checks that `expiresAt`
 * lies in the future and within its window.
 */
export function validateTokenCreateInput(value, path = "token") {
    return validateWith(tokenCreateInputSchema, value, path);
}
/** Validates the answer of a token create or rotate. */
export function validateTokenSecretResponse(value, path = "response") {
    return validateWith(tokenSecretResponseSchema, value, path);
}
