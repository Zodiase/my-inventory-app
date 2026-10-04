/** Pure URL-contract regressions; no browser, Meteor server, or database is required. */
import { expect, test } from '@playwright/test';

import { getSearchUrl, readSearchUrlState } from '../../../meteor-app/imports/ui/searchUrlState';
import type { SearchUrlState } from '../../../meteor-app/imports/ui/searchUrlState';

const parseUrl = (url: string): SearchUrlState => readSearchUrlState(new URL(url, 'http://test.invalid').search);

test('empty URL has inert global defaults', () => {
    const defaults = { query: '', scope: 'global', containerId: undefined, fragments: [], submitted: false };
    expect(readSearchUrlState('')).toEqual(defaults);
    expect(getSearchUrl(defaults as SearchUrlState)).toBe('/search');
});

for (const scope of ['global', 'scoped'] as const) {
    test(`${scope} Unicode state round trips all known fragment shapes and repeated AND groups`, () => {
        const state: SearchUrlState = {
            query: 'Crème 鍋 + & / ? =',
            scope,
            containerId: 'Kitchen/id + &',
            submitted: true,
            fragments: [
                { type: 'name', value: 'Ninja & mixer' },
                { type: 'text', value: '鍋 + lid' },
                { type: 'tagInclude', tagIds: ['a', 'b'] },
                { type: 'tagInclude', tagIds: ['c'] },
                { type: 'tagExclude', tagIds: ['d'] },
                { type: 'containerType', value: 'items' },
                { type: 'containerScope', containerRootId: null },
                { type: 'containerScope', containerRootId: 'root' },
                { type: 'property', field: 'purchasePrice', value: 0 },
                { type: 'property', field: 'make', value: 'Brand & Co' },
            ],
        };
        expect(parseUrl(getSearchUrl(state))).toEqual(state);
    });
}

test('malformed or unknown fragments are dropped independently of valid query/scope/filter state', () => {
    const invalid = [
        '{bad',
        'null',
        '[]',
        '42',
        JSON.stringify({ type: 'unknown', value: 'x' }),
        JSON.stringify({ type: 'name', value: 42 }),
        JSON.stringify({ type: 'text', value: null }),
        JSON.stringify({ type: 'tagInclude', tagIds: ['a', 42] }),
        JSON.stringify({ type: 'tagExclude', tagIds: 'a' }),
        JSON.stringify({ type: 'containerType', value: 'invalid' }),
        JSON.stringify({ type: 'containerScope', containerRootId: 42 }),
        JSON.stringify({ type: 'property', field: 'unknown', value: 'x' }),
        JSON.stringify({ type: 'property', field: 'make', value: {} }),
    ];
    const params = new URLSearchParams({ q: 'retained', container: 'kitchen', scope: 'within', run: '1' });
    const valid = { type: 'tagExclude', tagIds: ['retired'] };
    params.append('f', JSON.stringify(valid));
    invalid.forEach((value) => params.append('f', value));
    params.append('f', JSON.stringify({ type: 'name', value: 'plate' }));
    expect(readSearchUrlState(params.toString())).toEqual({
        query: 'retained',
        containerId: 'kitchen',
        scope: 'scoped',
        submitted: true,
        fragments: [valid, { type: 'name', value: 'plate' }],
    });
});

test('unavailable scoped root and invalid control values recover to global/inert defaults', () => {
    expect(readSearchUrlState('?scope=within')).toMatchObject({ scope: 'global', containerId: undefined });
    expect(readSearchUrlState('?scope=within&container=')).toMatchObject({ scope: 'global', containerId: undefined });
    expect(readSearchUrlState('?scope=invalid&container=kitchen&run=yes')).toMatchObject({
        scope: 'global',
        containerId: 'kitchen',
        submitted: false,
    });
});

test('clear query preserves scope and filters; reset filters preserves query', () => {
    const state: SearchUrlState = {
        query: 'plate',
        scope: 'scoped',
        containerId: 'kitchen',
        submitted: true,
        fragments: [{ type: 'containerType', value: 'items' }],
    };
    const cleared = { ...state, query: '' };
    expect(parseUrl(getSearchUrl(cleared))).toEqual(cleared);
    expect(new URL(getSearchUrl(cleared), 'http://test.invalid').searchParams.has('q')).toBe(false);
    const reset: SearchUrlState = { ...state, scope: 'global', containerId: undefined, fragments: [] };
    expect(getSearchUrl(reset)).toBe('/search?q=plate&run=1');
    expect(parseUrl(getSearchUrl(reset))).toEqual(reset);
});

test('unsubmitted URLs omit run and unknown query parameters do not become filters', () => {
    const state = readSearchUrlState('?q=plate&scope=within&container=kitchen&run=0&unknown=x');
    expect(state.submitted).toBe(false);
    expect(state.fragments).toEqual([]);
    expect(getSearchUrl(state)).toBe('/search?q=plate&container=kitchen&scope=within');
});
