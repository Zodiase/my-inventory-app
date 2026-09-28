/**
 * Shared search-page structure for the live route and visual review stories.
 * The shell owns primary controls; this component reserves one scroll region
 * for results and a small optional area for expanded filter editing.
 */
import { Box } from 'grommet';
import React, { type ReactElement, type ReactNode, type Ref } from 'react';
import styled from 'styled-components';

const SearchRoute = styled.section`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    gap: 12px;

    @media (max-height: 620px) {
        gap: 8px;
    }
`;

const FilterEditor = styled(Box)`
    flex: 0 1 auto;
    min-height: 0;
    overflow-y: auto;
`;

const SearchResultsRegion = styled(Box)`
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;

    &:focus-visible {
        outline: 2px solid #007aff;
        outline-offset: -2px;
    }
`;

interface SearchPageLayoutProps {
    filterEditor?: ReactNode;
    results: ReactNode;
    resultsRef?: Ref<HTMLDivElement>;
}

export const SearchPageLayout = ({ filterEditor, results, resultsRef }: SearchPageLayoutProps): ReactElement => (
    <SearchRoute aria-label="Inventory search results">
        {filterEditor !== undefined && filterEditor !== null && <FilterEditor>{filterEditor}</FilterEditor>}
        <SearchResultsRegion ref={resultsRef} role="region" aria-label="Search results" tabIndex={0}>
            {results}
        </SearchResultsRegion>
    </SearchRoute>
);
