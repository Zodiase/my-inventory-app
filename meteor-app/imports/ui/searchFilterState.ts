/**
 * Pure URL-fragment operations for the compact search controls.
 * Keeps older shared-link filters visible until the user explicitly resets them.
 */
import type { SearchFragment } from '/imports/model/SearchFragment';

export type SearchItemType = 'all' | 'items' | 'containers';

export const getSelectedTags = (fragments: SearchFragment[], type: 'tagInclude' | 'tagExclude'): string[] => [
    ...new Set(fragments.flatMap((fragment) => (fragment.type === type ? fragment.tagIds : []))),
];

export const getSelectedItemType = (fragments: SearchFragment[]): SearchItemType =>
    fragments.find((fragment) => fragment.type === 'containerType')?.value ?? 'all';

export const getContradictoryTags = (fragments: SearchFragment[]): string[] => {
    const excluded = new Set(getSelectedTags(fragments, 'tagExclude'));
    return getSelectedTags(fragments, 'tagInclude').filter((id) => excluded.has(id));
};

export const getLegacyFilters = (fragments: SearchFragment[]): SearchFragment[] =>
    fragments.filter(
        (fragment) =>
            fragment.type !== 'tagInclude' && fragment.type !== 'tagExclude' && fragment.type !== 'containerType'
    );

export const getActiveFilterCount = (fragments: SearchFragment[]): number =>
    getSelectedTags(fragments, 'tagInclude').length +
    getSelectedTags(fragments, 'tagExclude').length +
    (getSelectedItemType(fragments) === 'all' ? 0 : 1) +
    getLegacyFilters(fragments).length;

export const hasRunnableFilter = (fragments: SearchFragment[]): boolean =>
    fragments.some(
        (fragment) =>
            (fragment.type === 'tagInclude' && fragment.tagIds.length > 0) ||
            (fragment.type === 'tagExclude' && fragment.tagIds.length > 0) ||
            (fragment.type === 'containerType' && fragment.value !== 'all') ||
            (fragment.type !== 'tagInclude' && fragment.type !== 'tagExclude' && fragment.type !== 'containerType')
    );

export const toggleTagFilter = (
    fragments: SearchFragment[],
    type: 'tagInclude' | 'tagExclude',
    tagId: string
): SearchFragment[] => {
    const selected = getSelectedTags(fragments, type);
    const opposite = getSelectedTags(fragments, type === 'tagInclude' ? 'tagExclude' : 'tagInclude');
    if (!selected.includes(tagId) && opposite.includes(tagId)) return fragments;
    const next = selected.includes(tagId) ? selected.filter((id) => id !== tagId) : [...selected, tagId];
    const retained = fragments.filter((fragment) => fragment.type !== type);
    if (type === 'tagExclude') return next.length === 0 ? retained : [...retained, { type, tagIds: next }];
    // A backend include fragment means OR, so separate fragments enforce AND.
    return [...retained, ...next.map((id): SearchFragment => ({ type, tagIds: [id] }))];
};

export const setItemTypeFilter = (fragments: SearchFragment[], value: SearchItemType): SearchFragment[] => {
    const retained = fragments.filter((fragment) => fragment.type !== 'containerType');
    return value === 'all' ? retained : [...retained, { type: 'containerType', value }];
};

export const resetSearchFilters = (): SearchFragment[] => [];

/** Older shared URLs may store several included tags in one OR fragment. */
export const normalizeIncludedTags = (fragments: SearchFragment[]): SearchFragment[] =>
    fragments.flatMap((fragment) =>
        fragment.type === 'tagInclude' && fragment.tagIds.length > 1
            ? fragment.tagIds.map((tagId): SearchFragment => ({ type: 'tagInclude', tagIds: [tagId] }))
            : [fragment]
    );
