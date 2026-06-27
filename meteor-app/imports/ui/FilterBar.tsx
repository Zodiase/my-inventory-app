import { Close } from 'grommet-icons';
import React, { type ComponentProps } from 'react';
import styled from 'styled-components';

import type { SearchFragment } from '/imports/model/SearchFragment';
import { uiTokens } from '/imports/ui/theme';

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
    gap: ${uiTokens.space.sm};
`;

const FilterBarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${uiTokens.space.md};
`;

const FilterCount = styled.span`
    font-size: ${uiTokens.font.sizeSmall};
    font-weight: ${uiTokens.font.weightSemibold};
    color: ${uiTokens.color.textWeak};
`;

const ClearAllButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${uiTokens.space.sm};
    min-height: ${uiTokens.size.touchTarget};
    padding: ${uiTokens.space.sm} ${uiTokens.space.lg};
    background: transparent;
    color: ${uiTokens.color.danger};
    border: 1px solid ${uiTokens.color.danger};
    border-radius: ${uiTokens.radius.control};
    font-size: ${uiTokens.font.sizeSmall};
    font-weight: ${uiTokens.font.weightSemibold};
    cursor: pointer;
    transition: background-color ${uiTokens.motion.fast}, transform ${uiTokens.motion.fast};

    &:hover {
        background: ${uiTokens.color.dangerSubtle};
    }

    &:active {
        background: ${uiTokens.color.dangerSubtleStrong};
        transform: scale(0.98);
    }
`;

const FilterChipList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${uiTokens.space.sm};
`;

const FilterChip = styled.div`
    display: flex;
    align-items: center;
    gap: ${uiTokens.space.sm};
    padding: ${uiTokens.space.sm} ${uiTokens.space.md};
    background: ${uiTokens.color.brand};
    color: ${uiTokens.color.textInverse};
    border-radius: ${uiTokens.radius.pill};
    min-height: ${uiTokens.size.touchTarget};
`;

const FilterType = styled.span`
    font-size: ${uiTokens.font.sizeXSmall};
    font-weight: ${uiTokens.font.weightSemibold};
    text-transform: uppercase;
    opacity: 0.8;
`;

const FilterValue = styled.span`
    font-size: ${uiTokens.font.sizeSmall};
    font-weight: ${uiTokens.font.weightMedium};
`;

const RemoveButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: ${uiTokens.size.touchTarget};
    min-height: ${uiTokens.size.touchTarget};
    padding: ${uiTokens.space.sm};
    background: ${uiTokens.color.textInverseWeak};
    border: none;
    border-radius: ${uiTokens.radius.round};
    cursor: pointer;
    color: ${uiTokens.color.textInverse};
    font-size: ${uiTokens.font.sizeMedium};
    transition: background-color ${uiTokens.motion.fast};

    &:hover {
        background: ${uiTokens.color.textInverseWeakHover};
    }

    &:active {
        background: ${uiTokens.color.textInverseWeakActive};
    }
`;

const EmptyState = styled.div`
    padding: ${uiTokens.space.md};
    text-align: center;
    color: ${uiTokens.color.textMuted};
    font-size: ${uiTokens.font.sizeSmall};
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
                                        <Close size="16px" />
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
