/**
 * Mock-data review states for the complete search route composition.
 * Reuses the live page layout so responsive and scroll review targets production structure.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Heading } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { SearchFragment } from '/imports/model/SearchFragment';
import type { TracedInventorySearch } from '/imports/model/TracedInventorySearch';

import { AppShell } from './AppShell';
import { FilterBar } from './FilterBar';
import { SearchBanner } from './SearchBanner';
import { SearchBar } from './SearchBar';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchPageLayout } from './SearchPageLayout';
import { SearchResultsView } from './SearchResultsView';
import { SearchScopeSelector } from './SearchScopeSelector';

type ReviewState = 'idle' | 'loading' | 'empty' | 'error' | 'results' | 'long';

interface SearchPageStoryProps {
    scope: 'global' | 'scoped';
    reviewState: ReviewState;
    activeFilters?: boolean;
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
}: SearchPageStoryProps): React.ReactElement => {
    const [scope, setScope] = useState(initialScope);
    const [query, setQuery] = useState(reviewState === 'idle' ? '' : 'storage');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [fragments, setFragments] = useState<SearchFragment[]>(
        activeFilters ? [{ type: 'name', value: 'storage' }] : []
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
                        activeFilterCount={fragments.length}
                        filtersExpanded={filtersExpanded}
                        onToggleFilters={() => {
                            setFiltersExpanded((expanded) => !expanded);
                        }}
                        queryControls={
                            <SearchBar
                                className="search-banner-query"
                                value={query}
                                onChange={setQuery}
                                onSearch={() => {
                                    setSubmitted(true);
                                }}
                                onClear={() => {
                                    setQuery('');
                                    setSubmitted(false);
                                }}
                                submitDisabled={query.trim() === '' && fragments.length === 0}
                            />
                        }
                        scopeControls={
                            <SearchScopeSelector
                                className="search-banner-scope"
                                value={scope}
                                onChange={setScope}
                                scopeLabel="Rack A"
                            />
                        }
                    />
                }
            >
                <SearchPageLayout
                    filterEditor={
                        filtersExpanded ? (
                            <Box pad="medium" background="light-2" round="small">
                                <Heading level="4" margin={{ top: 'none', bottom: 'small' }}>
                                    Filters
                                </Heading>
                                <FilterBar
                                    filters={fragments}
                                    onChange={setFragments}
                                    onClearAll={() => {
                                        setFragments([]);
                                    }}
                                />
                                <SearchFragmentBuilder
                                    fragments={fragments}
                                    onChange={setFragments}
                                    availableTags={[]}
                                />
                            </Box>
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
    requiredViewports: ['390x844', '640x900', '641x900', '768x1024', '1280x720', '1600x1000'],
    expectedResponsiveChanges:
        'At phone width the Inventory wordmark hides, the submit label becomes icon-only, and the banner retains a query row and scope/filter row without horizontal scrolling. The banner and results remain separately reachable at all sizes.',
    interactionChecks,
    knownExclusions: 'Uses mock results and does not exercise Meteor search, persistence, or route navigation.',
});

export const GlobalIdle: Story = {
    args: { scope: 'global', reviewState: 'idle' },
    parameters: {
        review: review(
            'Idle global search',
            'Blue banner contains exit, empty query, All Items scope and Filters; white body starts with idle status.',
            ['Open menu; Search is a noninteractive current item.', 'Focus query and exit.']
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
            ['Focus a result link.', 'Open and close Filters.']
        ),
    },
};
export const ScopedResults: Story = {
    args: { scope: 'scoped', reviewState: 'results' },
    parameters: {
        review: review(
            'Scoped results',
            'The banner selects Rack A and has a labelled Return to Rack A chevron; cards remain in the white results region.',
            ['Open menu; active Search is noninteractive.', 'Focus exit and scope controls.']
        ),
    },
};
export const ScopedActiveFilters: Story = {
    args: { scope: 'scoped', reviewState: 'results', activeFilters: true },
    parameters: {
        review: review(
            'Active scoped filter',
            'The blue banner visibly summarizes Filters (1); opening Filters reveals the editable chip and builder in white without moving the trigger.',
            ['Expand Filters and remove the active chip.', 'Check results remain reachable.']
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
