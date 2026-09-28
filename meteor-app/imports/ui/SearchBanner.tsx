/**
 * Search-specific application header controls.
 * Keeps the exit, query, scope, and filter disclosure together in the blue shell
 * while the route owns URL state and the white page owns only editing and results.
 */
import { Filter, FormPrevious } from 'grommet-icons';
import React, { type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';

const Landmark = styled.section`
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    min-width: 0;
`;

const QueryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const ExitLink = styled.a`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 44px;
    height: 44px;
    color: white;
    border-radius: 8px;

    &:hover,
    &:focus-visible {
        background: rgb(255 255 255 / 20%);
    }

    &:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
    }
`;

const ScopeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;

    @media (max-width: 640px) {
        .search-banner-scope svg {
            display: none;
        }

        .search-banner-scope button {
            min-width: 0;
            padding-inline: 8px;
        }

        .search-banner-scope button span:last-child {
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
`;

const FilterButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 0 0 auto;
    min-height: 44px;
    padding: 4px 10px;
    color: white;
    background: rgb(255 255 255 / 14%);
    border: 1px solid rgb(255 255 255 / 65%);
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;

    &:hover,
    &[aria-expanded='true'] {
        background: rgb(255 255 255 / 28%);
    }

    &:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
    }

    @media (max-width: 640px) {
        padding-inline: 8px;
    }
`;

const HiddenHeading = styled.h1`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;

interface SearchBannerProps {
    exitHref: string;
    exitLabel: string;
    queryControls: ReactNode;
    scopeControls: ReactNode;
    activeFilterCount: number;
    filtersExpanded: boolean;
    onToggleFilters: () => void;
}

export const SearchBanner = ({
    exitHref,
    exitLabel,
    queryControls,
    scopeControls,
    activeFilterCount,
    filtersExpanded,
    onToggleFilters,
}: SearchBannerProps): ReactElement => (
    <Landmark role="search" aria-label="Inventory search" className="search-banner">
        <HiddenHeading>Search</HiddenHeading>
        <QueryRow>
            <ExitLink href={exitHref} aria-label={exitLabel} title={exitLabel}>
                <FormPrevious aria-hidden="true" />
            </ExitLink>
            {queryControls}
        </QueryRow>
        <ScopeRow>
            {scopeControls}
            <FilterButton type="button" aria-expanded={filtersExpanded} onClick={onToggleFilters}>
                <Filter aria-hidden="true" size="16px" />
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </FilterButton>
        </ScopeRow>
    </Landmark>
);
