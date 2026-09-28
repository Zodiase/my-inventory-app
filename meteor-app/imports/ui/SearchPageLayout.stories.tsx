/**
 * Mock-data review states for the complete search route composition.
 * Reuses the live page layout so responsive and scroll review targets production structure.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Heading } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';

import { AppShell } from './AppShell';
import { FilterBar } from './FilterBar';
import { SearchBar } from './SearchBar';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchPageLayout } from './SearchPageLayout';
import { SearchResultsView } from './SearchResultsView';
import { SearchScopeSelector } from './SearchScopeSelector';

type ReviewState = 'idle' | 'loading' | 'empty' | 'results' | 'long';

interface SearchPageStoryProps {
    scope: 'global' | 'scoped';
    reviewState: ReviewState;
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

const SearchPageStory = ({ scope: initialScope, reviewState }: SearchPageStoryProps): React.ReactElement => {
    const [scope, setScope] = useState(initialScope);
    const [query, setQuery] = useState(reviewState === 'idle' ? '' : 'storage');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [submitted, setSubmitted] = useState(reviewState !== 'idle');
    const items =
        reviewState === 'results'
            ? [makeItem(1), makeItem(2), makeItem(3)]
            : reviewState === 'long'
            ? Array.from({ length: 31 }, (_, index) => makeItem(index + 1))
            : [];

    return (
        <Box height="100vh" width="100%">
            <AppShell location="/search">
                <SearchPageLayout
                    scopeDescription={scope === 'scoped' ? 'Search in Rack A' : 'Search all items'}
                    filtersExpanded={filtersExpanded}
                    onToggleFilters={() => {
                        setFiltersExpanded((expanded) => !expanded);
                    }}
                    controls={
                        <>
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                                onSearch={() => {
                                    setSubmitted(true);
                                }}
                                onClear={() => {
                                    setQuery('');
                                    setSubmitted(false);
                                }}
                                submitDisabled={query.trim() === ''}
                            />
                            <SearchScopeSelector value={scope} onChange={setScope} scopeLabel="Rack A" />
                            <FilterBar filters={[]} onChange={() => undefined} onClearAll={() => undefined} />
                            {filtersExpanded && (
                                <Box pad="medium" background="light-2" round="small">
                                    <Heading level="4" margin={{ top: 'none', bottom: 'small' }}>
                                        Filters
                                    </Heading>
                                    <SearchFragmentBuilder
                                        fragments={[]}
                                        onChange={() => undefined}
                                        availableTags={[]}
                                    />
                                </Box>
                            )}
                        </>
                    }
                    results={
                        <SearchResultsView
                            items={items}
                            loading={reviewState === 'loading'}
                            hasSearched={submitted}
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

export const GlobalIdle: Story = { args: { scope: 'global', reviewState: 'idle' } };
export const GlobalLoading: Story = { args: { scope: 'global', reviewState: 'loading' } };
export const GlobalEmpty: Story = { args: { scope: 'global', reviewState: 'empty' } };
export const GlobalResults: Story = { args: { scope: 'global', reviewState: 'results' } };
export const ScopedResults: Story = { args: { scope: 'scoped', reviewState: 'results' } };
export const LongResults: Story = { args: { scope: 'global', reviewState: 'long' } };
