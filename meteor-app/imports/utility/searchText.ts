/**
 * Shared literal-text preparation for exact MongoDB lookup and structured filters.
 * User input must never be interpreted as a regular expression.
 */

/** Escape every regular-expression metacharacter so MongoDB matches literal text. */
export const escapeSearchText = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
