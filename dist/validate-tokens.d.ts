import { type TokenCreateInput, type TokenMetadata, type TokenSecretResponse, type TokensResponse } from "./tokens.ts";
import { type Validation } from "./validate-core.ts";
/** Validates a token as the api serves it. A `secret` or digest field is rejected. */
export declare function validateTokenMetadata(value: unknown, path?: string): Validation<TokenMetadata>;
/** Validates `GET /admin/tokens`. */
export declare function validateTokensResponse(value: unknown, path?: string): Validation<TokensResponse>;
/**
 * Validates the body of `POST /admin/tokens`. It has no clock: the api checks that `expiresAt`
 * lies in the future and within its window.
 */
export declare function validateTokenCreateInput(value: unknown, path?: string): Validation<TokenCreateInput>;
/** Validates the answer of a token create or rotate. */
export declare function validateTokenSecretResponse(value: unknown, path?: string): Validation<TokenSecretResponse>;
