import React, { type ComponentProps } from 'react';
import styled from 'styled-components';

import type { SearchFragment } from '/imports/model/SearchFragment';

/**
 * FilterBar component for context-aware filtering of current view.
 *
 * Displays active filters and allows users to:
 * - View all active filters as removable chips
 * - Clear individual filters
 * - Clear all filters at once
 * - See filter count
 *
 * @remarks
 * This component is designed for touch-friendly interaction with:
 * - Large tap targets (44x44px minimum)
 * - Clear visual indication of active filters
 * - Easy removal of filters
 * - Sticky/fixed positioning option for mobile
 *
 * Used in conjunction with search to filter items in the current view
 * (e.g., when browsing a container, apply filters to items in that container).
 */

interface FilterBarProps extends Omit<ComponentProps<'div'>, 'onChange'> {
    /** Current array of active filters */
    filters?: SearchFragment[];
    /** Callback when filters change */
    onChange?: (filters: SearchFragment[]) => void;
    /** Callback when all filters are cleared */
    onClearAll?: () => void;
    /** Available tags for display (id and name pairs) */
    availableTags?: Array<{ _id: string; name: string }>;
    /** Whether to show the filter bar (hide when no filters) */
    alwaysShow?: boolean;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FilterBarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const FilterCount = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #666;
`;

const ClearAllButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 16px;
    background: transparent;
    color: #ff3b30;
    border: 1px solid #ff3b30;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        background: rgba(255, 59, 48, 0.1);
    }

    &:active {
        background: rgba(255, 59, 48, 0.2);
        transform: scale(0.98);
    }
`;

const FilterChipList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const FilterChip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #007aff;
    color: white;
    border-radius: 20px;
    min-height: 44px;
`;

const FilterType = styled.span`
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.8;
`;

const FilterValue = styled.span`
    font-size: 14px;
    font-weight: 500;
`;

const RemoveButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 10px; /* Centers 24px icon: (44px - 24px) / 2 = 10px */
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: white;
    font-size: 16px;
    transition: background-color 0.15s;

    &:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    &:active {
        background: rgba(255, 255, 255, 0.4);
    }
`;

const EmptyState = styled.div`
    padding: 12px;
    text-align: center;
    color: #999;
    font-size: 14px;
`;

export const FilterBar: React.FC<FilterBarProps> = ({
    filters = [],
    onChange,
    onClearAll,
    availableTags = [],
    alwaysShow = false,
    className,
    style,
}) => {
    const handleRemoveFilter = (index: number): void => {
        const newFilters = [...filters];
        newFilters.splice(index, 1);
        onChange?.(newFilters);
    };

    const handleClearAll = (): void => {
        onChange?.([]);
        onClearAll?.();
    };

    const getFilterDisplay = (filter: SearchFragment): { type: string; value: string } => {
        switch (filter.type) {
            case 'name':
                return { type: 'Name', value: `"${filter.value}"` };
            case 'tagInclude':
                return {
                    type: 'Has',
                    value: filter.tagIds.map((id) => availableTags.find((t) => t._id === id)?.name ?? id).join(', '),
                };
            case 'tagExclude':
                return {
                    type: 'Not',
                    value: filter.tagIds.map((id) => availableTags.find((t) => t._id === id)?.name ?? id).join(', '),
                };
            case 'containerType':
                return {
                    type: 'Type',
                    value: filter.value === 'all' ? 'All' : filter.value === 'containers' ? 'Containers' : 'Items',
                };
            case 'containerScope':
                return { type: 'In', value: filter.containerRootId ?? 'All' };
            case 'property':
                return { type: filter.field, value: String(filter.value) };
            default:
                return { type: 'Filter', value: '' };
        }
    };

    // Don't render if no filters and not set to always show
    if (filters.length === 0 && !alwaysShow) {
        return null;
    }

    return (
        <Container className={className} style={style}>
            {filters.length > 0 ? (
                <>
                    <FilterBarHeader>
                        <FilterCount>
                            {filters.length} active filter{filters.length !== 1 ? 's' : ''}
                        </FilterCount>
                        <ClearAllButton onClick={handleClearAll} type="button">
                            Clear All
                        </ClearAllButton>
                    </FilterBarHeader>

                    <FilterChipList>
                        {filters.map((filter, index) => {
                            const display = getFilterDisplay(filter);
                            return (
                                <FilterChip key={index}>
                                    <FilterType>{display.type}:</FilterType>
                                    <FilterValue>{display.value}</FilterValue>
                                    <RemoveButton
                                        onClick={() => {
                                            handleRemoveFilter(index);
                                        }}
                                        aria-label={`Remove ${display.type} filter`}
                                        type="button"
                                    >
                                        ✕
                                    </RemoveButton>
                                </FilterChip>
                            );
                        })}
                    </FilterChipList>
                </>
            ) : (
                <EmptyState>No active filters</EmptyState>
            )}
        </Container>
    );
};

export default FilterBar;
