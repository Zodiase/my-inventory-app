/**
 * Mock-data review states for the complete search route composition.
 * Reuses the live page layout so responsive and scroll review targets production structure.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { SearchFragment } from '/imports/model/SearchFragment';
import type { TracedInventorySearch } from '/imports/model/TracedInventorySearch';

import { AppShell } from './AppShell';
import { SearchAppliedFilters } from './SearchAppliedFilters';
import { SearchBanner } from './SearchBanner';
import { hasRunnableFilter, resetSearchFilters, setItemTypeFilter, setTagFilterState } from './searchFilterState';
import { SearchPageLayout } from './SearchPageLayout';
import { SearchResultsView } from './SearchResultsView';

type ReviewState = 'idle' | 'loading' | 'empty' | 'error' | 'results' | 'long';

interface SearchPageStoryProps {
    scope: 'global' | 'scoped';
    reviewState: ReviewState;
    activeFilters?: boolean;
    scopeAvailable?: boolean;
    contradictoryFilters?: boolean;
    legacyFilters?: boolean;
}

const makeItem = (index: number): InventoryItem => ({
    _id: `storybook-item-${index}`,
    name: `Storage item ${String(index).padStart(2, '0')}`,
    description: `A mock inventory item for reviewing result card ${index}.`,
    isContainer: false,
    tagIds: [],
    containerId: 'storybook-rack',
    createdAt: new Date('2026-09-27T00:00:00Z'),
    modifiedAt: new Date('2026-09-27T00:00:00Z'),
});

const rack: InventoryItem = {
    ...makeItem(0),
    _id: 'storybook-rack',
    name: 'Rack A',
    isContainer: true,
    containerId: undefined,
};

const SearchPageStory = ({
    scope: initialScope,
    reviewState,
    activeFilters = false,
    scopeAvailable = true,
    contradictoryFilters = false,
    legacyFilters = false,
}: SearchPageStoryProps): React.ReactElement => {
    const [scope, setScope] = useState(initialScope);
    const [query, setQuery] = useState(reviewState === 'idle' ? '' : 'storage');
    const [fragments, setFragments] = useState<SearchFragment[]>(
        legacyFilters
            ? [{ type: 'name', value: 'bathroom' }]
            : contradictoryFilters
            ? [
                  { type: 'tagInclude', tagIds: ['tag-tools'] },
                  { type: 'tagExclude', tagIds: ['tag-tools'] },
              ]
            : activeFilters
            ? [
                  { type: 'tagInclude', tagIds: ['tag-tools'] },
                  { type: 'containerType', value: 'items' },
              ]
            : []
    );
    const [submitted, setSubmitted] = useState(reviewState !== 'idle');
    const items =
        reviewState === 'results'
            ? [makeItem(1), makeItem(2), makeItem(3)]
            : reviewState === 'long'
            ? Array.from({ length: 31 }, (_, index) => makeItem(index + 1))
            : [];
    const run: TracedInventorySearch | undefined =
        reviewState === 'idle' || reviewState === 'loading'
            ? undefined
            : {
                  results: [],
                  runId: 'srch-StorybookRun123',
                  count: items.length,
                  resultIds: items.map((item) => item._id),
                  status: reviewState === 'error' ? 'error' : items.length === 0 ? 'empty' : 'success',
                  ...(reviewState === 'error' ? { errorCode: 'search-unavailable' as const } : {}),
              };

    return (
        <Box height="100vh" width="100%">
            <AppShell
                location="/search"
                headerContent={
                    <SearchBanner
                        exitHref={scope === 'scoped' ? '/container/storybook-rack' : '/items'}
                        exitLabel={scope === 'scoped' ? 'Return to Rack A' : 'Exit search to All Items'}
                        query={query}
                        onQueryChange={(value) => {
                            setQuery(value);
                            setSubmitted(false);
                        }}
                        onSearch={() => {
                            setSubmitted(true);
                        }}
                        scope={scope}
                        scopeLabel="Rack A"
                        scopeAvailable={scopeAvailable}
                        onScopeChange={setScope}
                        fragments={fragments}
                        availableTags={[
                            {
                                _id: 'tag-tools',
                                name: 'Tools',
                                parentTagId: '',
                                path: [{ _id: 'tag-tools', name: 'Tools' }],
                            },
                            {
                                _id: 'tag-spare',
                                name: 'Spare',
                                parentTagId: '',
                                path: [{ _id: 'tag-spare', name: 'Spare' }],
                            },
                        ]}
                        onSetTagState={(tagId, state) => {
                            const next = setTagFilterState(fragments, tagId, state);
                            setFragments(next);
                            setSubmitted(query.trim() !== '' || hasRunnableFilter(next));
                        }}
                        onTypeChange={(type) => {
                            const next = setItemTypeFilter(fragments, type);
                            setFragments(next);
                            setSubmitted(query.trim() !== '' || hasRunnableFilter(next));
                        }}
                        onResetFilters={() => {
                            setScope('global');
                            setFragments(resetSearchFilters());
                            setSubmitted(query.trim() !== '');
                        }}
                    />
                }
            >
                <SearchPageLayout
                    filterEditor={
                        fragments.some(
                            (fragment) =>
                                fragment.type === 'tagInclude' ||
                                fragment.type === 'tagExclude' ||
                                (fragment.type === 'containerType' && fragment.value !== 'all')
                        ) ? (
                            <SearchAppliedFilters
                                fragments={fragments}
                                tags={[
                                    { _id: 'tag-tools', name: 'Tools' },
                                    { _id: 'tag-spare', name: 'Spare' },
                                ]}
                                onRemoveTag={(tagId) => {
                                    setFragments((current) => setTagFilterState(current, tagId, 'neutral'));
                                }}
                                onClearType={() => {
                                    setFragments((current) => setItemTypeFilter(current, 'all'));
                                }}
                            />
                        ) : undefined
                    }
                    results={
                        <SearchResultsView
                            items={items}
                            loading={reviewState === 'loading'}
                            hasSearched={submitted}
                            errorMessage={
                                reviewState === 'error'
                                    ? 'Search is temporarily unavailable. Please try again.'
                                    : undefined
                            }
                            searchRun={run}
                            getItemPath={(itemId) => [rack, items.find((item) => item._id === itemId) ?? rack]}
                        />
                    }
                />
            </AppShell>
        </Box>
    );
};

const meta = {
    title: 'UI/SearchPageLayout',
    component: SearchPageStory,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof SearchPageStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const review = (purpose: string, expectedComposition: string, interactionChecks: string[]) => ({
    purpose,
    expectedComposition,
    requiredViewports: ['320x700', '390x844', '459x900', '460x900', '619x900', '620x900', '1280x720'],
    expectedResponsiveChanges:
        'The blue banner stays one row without menu or brand. At narrow widths one scope/filter button reserves 160px for query. At medium width Scope and Filters separate; at roomy width Scope, Tags, and Type separate. The banner stays fixed as results scroll.',
    interactionChecks,
    knownExclusions: 'Uses mock results and does not exercise Meteor search, persistence, or route navigation.',
});

export const GlobalIdle: Story = {
    args: { scope: 'global', reviewState: 'idle', scopeAvailable: false },
    parameters: {
        review: review(
            'Idle global search',
            'Blue banner contains exit, one empty query, and progressive scope/filter controls; white body starts with quiet idle status.',
            ['Open the compact menu and check Scope, Tags, Type order.', 'Focus query and exit.']
        ),
    },
};
export const GlobalLoading: Story = {
    args: { scope: 'global', reviewState: 'loading' },
    parameters: {
        review: review('Pending search', 'Banner stays usable while white body announces loading.', [
            'Focus query while loading.',
        ]),
    },
};
export const GlobalEmpty: Story = {
    args: { scope: 'global', reviewState: 'empty' },
    parameters: {
        review: review('No matches', 'White body shows zero results and muted server run reference below the banner.', [
            'Confirm zero-result status is announced.',
        ]),
    },
};
export const GlobalError: Story = {
    args: { scope: 'global', reviewState: 'error' },
    parameters: {
        review: review(
            'Search error',
            'White body distinguishes an error from empty results and retains the run reference.',
            ['Confirm error status is announced.']
        ),
    },
};
export const GlobalResults: Story = {
    args: { scope: 'global', reviewState: 'results' },
    parameters: {
        review: review(
            'Global results',
            'Result count and run reference precede linked cards; no duplicate heading, scope subtitle or detached Back link appears in white.',
            ['Focus a result link.', 'Open and close a filter menu.']
        ),
    },
};
export const ScopedResults: Story = {
    args: { scope: 'scoped', reviewState: 'results' },
    parameters: {
        review: review(
            'Scoped results',
            'The banner selects Rack A and has a labelled Return to Rack A chevron; cards remain in the white results region.',
            ['Open the scope menu.', 'Focus exit and scope controls.']
        ),
    },
};
export const ScopedActiveFilters: Story = {
    args: { scope: 'scoped', reviewState: 'results', activeFilters: true },
    parameters: {
        review: review(
            'Active scoped filter',
            'The banner summarizes Tools and Items type; the compact menu exposes Scope, Tags and Type without body chips.',
            ['Remove Tools, then choose Containers.', 'Check results remain reachable.']
        ),
    },
};
export const ContradictoryRestoredFilters: Story = {
    args: { scope: 'global', reviewState: 'results', contradictoryFilters: true },
    parameters: {
        review: review(
            'Contradictory legacy URL',
            'The open tag controls warn that Tools is included and excluded; both selections remain visible for repair.',
            ['Open Tags or the combined menu and inspect the warning.', 'Remove either conflicting selection.']
        ),
    },
};
export const LegacySavedFilters: Story = {
    args: { scope: 'global', reviewState: 'results', legacyFilters: true },
    parameters: {
        review: review(
            'Older shared search link',
            'The active older filter is counted and explained in Filters; Reset removes it while preserving the query.',
            ['Open Filters at desktop and phone widths.', 'Reset and verify the active count clears.']
        ),
    },
};
export const LongResults: Story = {
    args: { scope: 'global', reviewState: 'long' },
    parameters: {
        review: review(
            'Long result set',
            'The banner stays fixed; only the bounded white results region scrolls through all linked cards.',
            ['Scroll results to the end and confirm banner position.', 'Confirm document itself does not scroll.']
        ),
    },
};
