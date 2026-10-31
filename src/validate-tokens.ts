import {
  type TokenCreateInput,
  type TokenMetadata,
  type TokenSecretResponse,
  type TokensResponse,
  tokenCreateInputSchema,
  tokenMetadataSchema,
  tokenSecretResponseSchema,
  tokensResponseSchema,
} from "./tokens.ts";
import { type Validation, validateWith } from "./validate-core.ts";

/** Validates a token as the api serves it. A `secret` or digest field is rejected. */
export function validateTokenMetadata(value: unknown, path = "token"): Validation<TokenMetadata> {
  return validateWith(tokenMetadataSchema, value, path);
}

/** Validates `GET /admin/tokens`. */
export function validateTokensResponse(
  value: unknown,
  path = "tokens",
): Validation<TokensResponse> {
  return validateWith(tokensResponseSchema, value, path);
}

/**
 * Validates the body of `POST /admin/tokens`. It has no clock: the api checks that `expiresAt`
 * lies in the future and within its window.
 */
export function validateTokenCreateInput(
  value: unknown,
  path = "token",
): Validation<TokenCreateInput> {
  return validateWith(tokenCreateInputSchema, value, path);
}

/** Validates the answer of a token create or rotate. */
export function validateTokenSecretResponse(
  value: unknown,
  path = "response",
): Validation<TokenSecretResponse> {
  return validateWith(tokenSecretResponseSchema, value, path);
}
