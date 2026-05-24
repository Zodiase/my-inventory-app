/**
 * UMR (Under My Roof) sentinel values for empty/unset fields.
 *
 * UMR's CSV exports write a small set of placeholder strings when a field is empty:
 *   - "(unspecified)"  — generic empty
 *   - "(uncategorized)" — empty Category
 *   - "(uncollected)"  — empty Collection
 *   - "(unassigned)"   — empty Location / container
 *
 * On import we treat these as empty (`undefined`). On export with `umrCompat=true`
 * we emit the matching sentinel so a round-trip through UMR is loss-less.
 *
 * Pure module: no Meteor or Mongo imports.
 */

export type SentinelKind = 'generic' | 'category' | 'collection' | 'location';

export const SENTINELS: Readonly<Record<SentinelKind, string>> = Object.freeze({
    generic: '(unspecified)',
    category: '(uncategorized)',
    collection: '(uncollected)',
    location: '(unassigned)',
});

const ALL_SENTINEL_VALUES: ReadonlySet<string> = new Set(Object.values(SENTINELS));

/**
 * Returns `undefined` if `value` is empty or matches any known UMR sentinel,
 * otherwise returns the trimmed value.
 */
export function fromSentinel(value: string | undefined | null): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
        return undefined;
    }
    if (ALL_SENTINEL_VALUES.has(trimmed)) {
        return undefined;
    }
    return trimmed;
}

/**
 * Returns the sentinel string for `kind` when `value` is empty/undefined,
 * otherwise returns the value unchanged.
 */
export function toSentinel(value: string | undefined | null, kind: SentinelKind): string {
    if (value === undefined || value === null || value === '') {
        return SENTINELS[kind];
    }
    return value;
}

/**
 * True iff `value` is a recognised UMR sentinel string.
 */
export function isSentinel(value: string | undefined | null): boolean {
    if (value === undefined || value === null) {
        return false;
    }
    return ALL_SENTINEL_VALUES.has(value.trim());
}
