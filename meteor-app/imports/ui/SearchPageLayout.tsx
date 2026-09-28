/**
 * Shared search-page structure for the live route and visual review stories.
 * Keeps the neutral heading, controls, and sole results scroll region consistent.
 * Search data and navigation remain owned by the calling route.
 */
import { Box, Button, Heading, Text } from 'grommet';
import { Filter } from 'grommet-icons';
import React, { type ReactElement, type ReactNode, type Ref } from 'react';
import styled from 'styled-components';

const SearchExitLink = styled.a`
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: #064f91;
    font-weight: 600;
    text-decoration: underline;

    &:focus-visible {
        outline: 2px solid #007aff;
        outline-offset: 2px;
    }
`;

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

const SearchControls = styled(Box)`
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
    scopeDescription: string;
    exitHref: string;
    exitLabel: string;
    filtersExpanded: boolean;
    onToggleFilters: () => void;
    controls: ReactNode;
    results: ReactNode;
    resultsRef?: Ref<HTMLDivElement>;
}

export const SearchPageLayout = ({
    scopeDescription,
    exitHref,
    exitLabel,
    filtersExpanded,
    onToggleFilters,
    controls,
    results,
    resultsRef,
}: SearchPageLayoutProps): ReactElement => (
    <SearchRoute aria-label="Inventory search">
        <SearchControls gap="small">
            <Box direction="row" justify="between" align="center" gap="medium" wrap>
                <Heading level="2" margin="none">
                    Search
                </Heading>
                <Button
                    icon={<Filter />}
                    label={filtersExpanded ? 'Hide Filters' : 'Filters'}
                    aria-expanded={filtersExpanded}
                    onClick={onToggleFilters}
                    secondary={!filtersExpanded}
                    primary={filtersExpanded}
                />
            </Box>
            <Box direction="row" justify="between" align="center" gap="small" wrap>
                <Text size="small" color="dark-2">
                    {scopeDescription}
                </Text>
                <SearchExitLink href={exitHref}>{exitLabel}</SearchExitLink>
            </Box>
            {controls}
        </SearchControls>
        <SearchResultsRegion ref={resultsRef} role="region" aria-label="Search results" tabIndex={0}>
            {results}
        </SearchResultsRegion>
    </SearchRoute>
);
