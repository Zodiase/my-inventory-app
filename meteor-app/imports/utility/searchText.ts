/**
 * Shared literal-text preparation for app and agent inventory search.
 * User input must never be interpreted as a MongoDB regular expression.
 */

/** Escape every regular-expression metacharacter so MongoDB matches literal text. */
export const escapeSearchText = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
