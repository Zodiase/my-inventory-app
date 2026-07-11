import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SCENARIOS, selectVisualScenarios } from './visual-scenarios.mjs';

function slugsFor(changedFiles) {
    return new Set(selectVisualScenarios(changedFiles).scenarios.map(({ slug }) => slug));
}

function groupIdsFor(changedFiles) {
    return new Set(selectVisualScenarios(changedFiles).groups.map(({ id }) => id));
}

test('selects core route smoke for ordinary UI changes', () => {
    const selection = selectVisualScenarios(['meteor-app/imports/ui/SearchBar.tsx']);

    assert.equal(selection.mode, 'selected');
    assert.deepEqual(groupIdsFor(['meteor-app/imports/ui/SearchBar.tsx']), new Set(['core-smoke']));
    assert(slugsFor(['meteor-app/imports/ui/SearchBar.tsx']).has('core-search-desktop'));
    assert(slugsFor(['meteor-app/imports/ui/SearchBar.tsx']).has('core-search-mobile'));
});

test('selects core and focused Items screenshots for Items view changes', () => {
    const selectedSlugs = slugsFor(['meteor-app/imports/ui/AllItemsView/AllItemsViewPresentation.tsx']);

    assert.deepEqual(
        groupIdsFor(['meteor-app/imports/ui/AllItemsView/AllItemsViewPresentation.tsx']),
        new Set(['core-smoke', 'items'])
    );
    assert(selectedSlugs.has('core-items-desktop'));
    assert(selectedSlugs.has('items-add-filter'));
    assert(selectedSlugs.has('items-detail'));
    assert(!selectedSlugs.has('tags-detail'));
});

test('selects core and focused Tags screenshots for Tags view changes', () => {
    const selectedSlugs = slugsFor(['meteor-app/imports/ui/AllTagsView/AllTagsViewPresentation.tsx']);

    assert.deepEqual(
        groupIdsFor(['meteor-app/imports/ui/AllTagsView/AllTagsViewPresentation.tsx']),
        new Set(['core-smoke', 'tags'])
    );
    assert(selectedSlugs.has('core-tags-desktop'));
    assert(selectedSlugs.has('tags-list'));
    assert(selectedSlugs.has('tags-detail'));
    assert(!selectedSlugs.has('items-detail'));
});

test('selects all scenarios for shared visual infrastructure changes', () => {
    const selectedSlugs = slugsFor(['.github/workflows/pr-visual-evidence.yml']);

    assert.equal(selectedSlugs.size, SCENARIOS.length);
    assert.deepEqual(selectedSlugs, new Set(SCENARIOS.map(({ slug }) => slug)));
});

test('selects no scenarios for docs-only changes', () => {
    const selection = selectVisualScenarios(['README.md', 'docs/visual-testing.md']);

    assert.equal(selection.mode, 'none');
    assert.deepEqual(selection.groups, []);
    assert.deepEqual(selection.scenarios, []);
});
