import type { InventoryItem } from '/imports/model/InventoryItem';
import type { PropertyValues } from '/imports/model/PropertyValues';

/**
 * A normalized inventory row produced by an import source (CSV or JSON).
 *
 * Mirrors a subset of `InventoryItem` fields that participate in dedup.
 * JSON-sourced rows carry `createdAt` / `modifiedAt`; CSV-sourced rows do not.
 */
export interface NormalizedRow {
    createdAt?: Date;
    modifiedAt?: Date;
    name: string;
    description?: string;
    containerId?: string;
    isContainer?: boolean;
    tagIds?: string[];
    properties?: PropertyValues;
}

export type DedupAction = 'exact-duplicate' | 'superset-merge' | 'create-new';

export interface DedupResult {
    action: DedupAction;
    target?: InventoryItem;
    mergeFields?: Partial<InventoryItem>;
}

const COMPARABLE_PROPERTY_KEYS = ['make', 'model', 'serialNumber', 'purchaseDate'] as const;

const ALL_PROPERTY_KEYS = [
    'serialNumber',
    'make',
    'model',
    'purchaseDate',
    'purchaseFrom',
    'purchasePrice',
    'marketValue',
    'warranty',
    'condition',
] as const;

const TOP_LEVEL_KEYS = ['description', 'containerId', 'isContainer', 'tagIds'] as const;

function isDate(v: unknown): v is Date {
    return v instanceof Date;
}

function datesEqual(a: Date, b: Date): boolean {
    return a.getTime() === b.getTime();
}

function tagIdsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const seen = new Set(a);
    return b.every((v) => seen.has(v));
}

function valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (isDate(a) && isDate(b)) return datesEqual(a, b);
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => valuesEqual(v, b[i]));
    }
    return false;
}

function topLevelValuesEqual(key: (typeof TOP_LEVEL_KEYS)[number], a: unknown, b: unknown): boolean {
    if (key === 'tagIds' && Array.isArray(a) && Array.isArray(b)) {
        return tagIdsEqual(a as string[], b as string[]);
    }
    return valuesEqual(a, b);
}

/**
 * Returns true when every comparable field defined on `existing` has the same
 * value on `candidate`. `createdAt` is compared only when `candidate` provides
 * it (JSON-sourced rows do; CSV-sourced rows do not).
 */
function existingDefinedComparablesMatch(candidate: NormalizedRow, existing: InventoryItem): boolean {
    if (candidate.createdAt !== undefined && !datesEqual(candidate.createdAt, existing.createdAt)) {
        return false;
    }
    if (candidate.name !== existing.name) return false;

    const cp = candidate.properties ?? {};
    const ep = existing.properties ?? {};
    for (const k of COMPARABLE_PROPERTY_KEYS) {
        const ev = ep[k];
        if (ev === undefined) continue;
        const cv = cp[k];
        if (!valuesEqual(cv, ev)) return false;
    }
    return true;
}

/**
 * Returns true when any field defined on BOTH sides has different values.
 * Comparable fields are excluded here — they're handled by the identity check.
 */
function hasNonComparableConflict(candidate: NormalizedRow, existing: InventoryItem): boolean {
    for (const k of TOP_LEVEL_KEYS) {
        const cv = candidate[k];
        const ev = existing[k];
        if (cv === undefined || ev === undefined) continue;
        if (!topLevelValuesEqual(k, cv, ev)) return true;
    }
    const cp = candidate.properties ?? {};
    const ep = existing.properties ?? {};
    const comparable: ReadonlySet<string> = new Set(COMPARABLE_PROPERTY_KEYS);
    for (const k of ALL_PROPERTY_KEYS) {
        if (comparable.has(k)) continue;
        const cv = cp[k];
        const ev = ep[k];
        if (cv === undefined || ev === undefined) continue;
        if (!valuesEqual(cv, ev)) return true;
    }
    return false;
}

/**
 * Returns the fields the candidate would add to existing (defined on candidate,
 * undefined on existing). Returns `undefined` when candidate adds nothing.
 */
function computeMergeFields(candidate: NormalizedRow, existing: InventoryItem): Partial<InventoryItem> | undefined {
    const merge: Partial<InventoryItem> = {};
    let hasAny = false;

    for (const k of TOP_LEVEL_KEYS) {
        const cv = candidate[k];
        const ev = existing[k];
        if (cv !== undefined && ev === undefined) {
            (merge as Record<string, unknown>)[k] = cv;
            hasAny = true;
        }
    }

    const cp = candidate.properties ?? {};
    const ep = existing.properties ?? {};
    const mergedProps: PropertyValues = { ...ep };
    let hasProps = false;
    for (const k of ALL_PROPERTY_KEYS) {
        const cv = cp[k];
        const ev = ep[k];
        if (cv !== undefined && ev === undefined) {
            (mergedProps as Record<string, unknown>)[k] = cv;
            hasProps = true;
            hasAny = true;
        }
    }
    if (hasProps) merge.properties = mergedProps;

    return hasAny ? merge : undefined;
}

function classifyOne(candidate: NormalizedRow, existing: InventoryItem): DedupResult {
    if (!existingDefinedComparablesMatch(candidate, existing)) {
        return { action: 'create-new' };
    }
    if (hasNonComparableConflict(candidate, existing)) {
        return { action: 'create-new' };
    }
    const merge = computeMergeFields(candidate, existing);
    if (merge === undefined) {
        return { action: 'exact-duplicate', target: existing };
    }
    return { action: 'superset-merge', target: existing, mergeFields: merge };
}

/**
 * Classify a candidate row against the supplied existing matches as
 * `exact-duplicate`, `superset-merge`, or `create-new`.
 *
 * When multiple matches are supplied, the highest-priority outcome wins:
 * `exact-duplicate` > `superset-merge` > `create-new`. The returned `target`
 * is the existing item the candidate would merge into or skip against.
 *
 * Pure function — no Meteor or DB imports.
 */
export function classify(candidate: NormalizedRow, existingMatches: InventoryItem[]): DedupResult {
    if (existingMatches.length === 0) return { action: 'create-new' };

    let supersetResult: DedupResult | undefined = undefined;
    for (const existing of existingMatches) {
        const result = classifyOne(candidate, existing);
        if (result.action === 'exact-duplicate') return result;
        if (result.action === 'superset-merge' && supersetResult === undefined) {
            supersetResult = result;
        }
    }
    return supersetResult ?? { action: 'create-new' };
}

export default classify;
