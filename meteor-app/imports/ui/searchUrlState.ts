/**
 * Encodes the dedicated search page's reproducible query, filters, and scope.
 * Only known fragment shapes are accepted from the URL before they reach search.
 */
import type { SearchFragment } from '/imports/model/SearchFragment';

export interface SearchUrlState {
    query: string;
    scope: 'global' | 'scoped';
    containerId?: string;
    fragments: SearchFragment[];
    submitted: boolean;
}

const propertyFields = new Set([
    'serialNumber',
    'make',
    'model',
    'purchaseFrom',
    'purchasePrice',
    'marketValue',
    'condition',
]);

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const parseFragment = (serialized: string): SearchFragment | undefined => {
    try {
        const value: unknown = JSON.parse(serialized);
        if (typeof value !== 'object' || value === null || !('type' in value)) return undefined;
        const fragment = value as Record<string, unknown>;
        switch (fragment.type) {
            case 'name':
            case 'text':
                return typeof fragment.value === 'string' ? { type: fragment.type, value: fragment.value } : undefined;
            case 'tagInclude':
            case 'tagExclude':
                return isStringArray(fragment.tagIds) ? { type: fragment.type, tagIds: fragment.tagIds } : undefined;
            case 'containerType':
                return fragment.value === 'all' || fragment.value === 'items' || fragment.value === 'containers'
                    ? { type: 'containerType', value: fragment.value }
                    : undefined;
            case 'containerScope':
                return typeof fragment.containerRootId === 'string' || fragment.containerRootId === null
                    ? { type: 'containerScope', containerRootId: fragment.containerRootId }
                    : undefined;
            case 'property':
                return typeof fragment.field === 'string' &&
                    propertyFields.has(fragment.field) &&
                    (typeof fragment.value === 'string' || typeof fragment.value === 'number')
                    ? {
                          type: 'property',
                          field: fragment.field as Extract<SearchFragment, { type: 'property' }>['field'],
                          value: fragment.value,
                      }
                    : undefined;
            default:
                return undefined;
        }
    } catch {
        return undefined;
    }
};

export const readSearchUrlState = (search: string): SearchUrlState => {
    const params = new URLSearchParams(search);
    const rawContainerId = params.get('container');
    const containerId = rawContainerId !== null && rawContainerId !== '' ? rawContainerId : undefined;
    return {
        query: params.get('q') ?? '',
        scope: params.get('scope') === 'within' && containerId !== undefined ? 'scoped' : 'global',
        containerId,
        fragments: params
            .getAll('f')
            .map(parseFragment)
            .filter((fragment): fragment is SearchFragment => fragment !== undefined),
        submitted: params.get('run') === '1',
    };
};

export const getSearchUrl = (state: SearchUrlState): string => {
    const params = new URLSearchParams();
    if (state.query !== '') params.set('q', state.query);
    if (state.containerId !== undefined) params.set('container', state.containerId);
    if (state.scope === 'scoped' && state.containerId !== undefined) params.set('scope', 'within');
    state.fragments.forEach((fragment) => {
        params.append('f', JSON.stringify(fragment));
    });
    if (state.submitted) params.set('run', '1');
    const query = params.toString();
    return `/search${query === '' ? '' : `?${query}`}`;
};
