/** Prefix of a token id: `tok_` followed by 24 lower-case hex digits. */
export const TOKEN_ID_PREFIX = "tok_";
/** A token id: `tok_` followed by 24 lower-case hex digits. */
export const TOKEN_ID = new RegExp(`^${TOKEN_ID_PREFIX}[0-9a-f]{24}$`);
