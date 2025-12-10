import React, { type ComponentProps } from 'react';
import styled from 'styled-components';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { usePageTitle } from '/imports/utility/usePageTitle';

/**
 * SearchResultsView component for displaying search results with breadcrumb context.
 *
 * Shows a list of items matching search criteria with:
 * - Item name and description
 * - Breadcrumb trail showing container hierarchy
 * - Container type badge (container vs item)
 * - Tag chips
 * - Tap-friendly item cards
 *
 * @remarks
 * This component is designed for touch-friendly interaction with:
 * - Large tap targets (44x44px minimum) for items
 * - Clear visual hierarchy
 * - Breadcrumb context for navigation
 * - Responsive layout for mobile
 *
 * Used to display results from the items.search Meteor method.
 */

interface SearchResultsViewProps extends ComponentProps<'div'> {
    /** Array of search result items */
    items?: InventoryItem[];
    /** Callback when an item is clicked/tapped */
    onItemClick?: (itemId: string) => void;
    /** Whether results are currently loading */
    loading?: boolean;
    /** Optional function to get breadcrumb path for an item */
    getItemPath?: (itemId: string) => InventoryItem[];
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ResultsHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const ResultCount = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #666;
`;

const ResultsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ResultCard = styled.button`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    min-height: 44px;

    &:hover {
        background: #f9f9f9;
        border-color: #007aff;
    }

    &:active {
        background: #f0f0f0;
        transform: scale(0.99);
    }
`;

const ItemHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const ItemInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const ItemName = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
    word-wrap: break-word;
`;

const ItemDescription = styled.div`
    font-size: 14px;
    color: #666;
    word-wrap: break-word;
`;

const ContainerBadge = styled.span<{ isContainer: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: ${(props) => (props.isContainer ? '#34c759' : '#007aff')};
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
`;

const Breadcrumb = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #999;
    flex-wrap: wrap;
`;

const BreadcrumbItem = styled.span`
    &:not(:last-child)::after {
        content: '›';
        margin-left: 6px;
        color: #ccc;
    }
`;

const TagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const TagChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: #e5e5e5;
    border-radius: 12px;
    font-size: 12px;
    color: #666;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #999;
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 12px;
`;

const EmptyText = styled.div`
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
`;

const EmptyHint = styled.div`
    font-size: 14px;
    color: #bbb;
`;

const LoadingState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #666;
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 4px solid #e5e5e5;
    border-top-color: #007aff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
    items = [],
    onItemClick,
    loading = false,
    getItemPath,
    className,
    style,
}) => {
    usePageTitle('Search - My Inventory');

    const handleItemClick = (itemId: string): void => {
        onItemClick?.(itemId);
    };

    if (loading) {
        return (
            <Container className={className} style={style}>
                <LoadingState>
                    <LoadingSpinner />
                    <div style={{ marginTop: '16px' }}>Loading results...</div>
                </LoadingState>
            </Container>
        );
    }

    if (items.length === 0) {
        return (
            <Container className={className} style={style}>
                <EmptyState>
                    <EmptyIcon>🔍</EmptyIcon>
                    <EmptyText>No results found</EmptyText>
                    <EmptyHint>Try adjusting your search criteria</EmptyHint>
                </EmptyState>
            </Container>
        );
    }

    return (
        <Container className={className} style={style}>
            <ResultsHeader>
                <ResultCount>
                    {items.length} result{items.length !== 1 ? 's' : ''}
                </ResultCount>
            </ResultsHeader>

            <ResultsList>
                {items.map((item) => {
                    const path = getItemPath?.(item._id) ?? [];
                    const breadcrumbPath = path.length > 0 ? path.slice(0, -1) : [];

                    return (
                        <ResultCard
                            key={item._id}
                            onClick={() => {
                                handleItemClick(item._id);
                            }}
                            type="button"
                        >
                            <ItemHeader>
                                <ItemInfo>
                                    <ItemName>{item.name}</ItemName>
                                    {item.description !== '' && <ItemDescription>{item.description}</ItemDescription>}
                                </ItemInfo>
                                <ContainerBadge isContainer={item.isContainer}>
                                    {item.isContainer ? '📦 Container' : '📄 Item'}
                                </ContainerBadge>
                            </ItemHeader>

                            {breadcrumbPath.length > 0 && (
                                <Breadcrumb>
                                    {breadcrumbPath.map((pathItem) => (
                                        <BreadcrumbItem key={pathItem._id}>{pathItem.name}</BreadcrumbItem>
                                    ))}
                                </Breadcrumb>
                            )}

                            {item.tagIds.length > 0 && (
                                <TagList>
                                    {item.tagIds.map((tagId) => (
                                        <TagChip key={tagId}>{tagId}</TagChip>
                                    ))}
                                </TagList>
                            )}
                        </ResultCard>
                    );
                })}
            </ResultsList>
        </Container>
    );
};

export default SearchResultsView;
