/**
 * Presentational inventory browser for one container level.
 * Owns the responsive sheet, scan metadata, sorting, row semantics, and touch gestures;
 * Meteor subscriptions and route-level loading decisions stay in the container module.
 */
import { Box } from 'grommet';
import { Folder, Next, Package } from 'grommet-icons';
import React, { type ComponentPropsWithoutRef, type ReactElement, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Link } from 'wouter';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import {
    inventorySortOptions,
    type InventorySortOption,
    sortInventoryItems,
} from '/imports/ui/AllItemsView/inventorySort';
import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';
import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { LongPressContextMenu } from '/imports/ui/LongPressContextMenu';
import { uiTokens } from '/imports/ui/theme';
import { usePullToRefresh } from '/imports/utility/pullToRefresh';
import { useSwipeNavigation } from '/imports/utility/swipeNavigation';

const PULL_TRIGGER_DISTANCE_PX = 80;
const PULL_MAX_VISUAL_DISTANCE_PX = 60;
const ROTATION_MAX_DEGREES = 360;
const SWIPE_THRESHOLD_PX = 100;
const SWIPE_EDGE_THRESHOLD_PX = 50;
const SWIPE_MAX_VERTICAL_DEVIATION_PX = 50;
const PARENT_CONTAINER_OFFSET = 2;
const MAX_VISIBLE_TAGS = 2;
const LOADING_ROW_COUNT = 6;
const SKELETON_VARIANT_DIVISOR = 2;

const noopRefresh = async (): Promise<void> => {
    return undefined;
};

const Root = styled.div`
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    padding: ${uiTokens.space.sm};
`;

const ScrollableContainer = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
`;

const ContentFrame = styled.div`
    width: min(100%, 1200px);
    margin: 0 auto;
`;

const InventorySheet = styled.section`
    overflow: hidden;
    border: 1px solid ${uiTokens.color.borderStrong};
    border-radius: ${uiTokens.radius.control};
    background: ${uiTokens.color.surfaceRaised};
`;

const InventoryToolbar = styled.div`
    display: flex;
    min-height: 64px;
    align-items: center;
    justify-content: space-between;
    gap: ${uiTokens.space.lg};
    padding: ${uiTokens.space.sm} ${uiTokens.space.lg};
    border-bottom: 1px solid ${uiTokens.color.borderSubtle};
    background: ${uiTokens.color.surfaceSunken};

    @media (max-width: 599px) {
        gap: ${uiTokens.space.md};
        padding: ${uiTokens.space.sm} ${uiTokens.space.md};
    }
`;

const InventoryCount = styled.div`
    min-width: 0;
`;

const CountPrimary = styled.div`
    color: ${uiTokens.color.text};
    font-size: ${uiTokens.font.sizeMedium};
    font-weight: ${uiTokens.font.weightSemibold};
    line-height: ${uiTokens.font.lineHeightTight};
`;

const CountBreakdown = styled.div`
    margin-top: ${uiTokens.space.xs};
    overflow: hidden;
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeXSmall};
    line-height: ${uiTokens.font.lineHeightTight};
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SortControl = styled.label`
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: ${uiTokens.space.sm};
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeSmall};
    font-weight: ${uiTokens.font.weightMedium};

    @media (max-width: 599px) {
        align-items: flex-start;
        flex-direction: column;
        gap: ${uiTokens.space.xxs};
    }
`;

const SortSelect = styled.select`
    min-width: 172px;
    height: ${uiTokens.size.touchTarget};
    min-height: ${uiTokens.size.touchTarget};
    padding: 0 ${uiTokens.space.xxxl} 0 ${uiTokens.space.md};
    border: 1px solid ${uiTokens.color.borderStrong};
    border-radius: ${uiTokens.radius.control};
    background: ${uiTokens.color.surfaceRaised};
    color: ${uiTokens.color.text};
    font: inherit;

    @media (max-width: 599px) {
        min-width: 158px;
        max-width: 46vw;
    }
`;

const inventoryColumns = css`
    display: grid;
    grid-template-columns: minmax(220px, 2.2fr) minmax(92px, 0.55fr) minmax(180px, 1.2fr) minmax(108px, 0.65fr) 24px;
    gap: ${uiTokens.space.lg};
`;

const ColumnHeader = styled.div`
    ${inventoryColumns};
    align-items: center;
    min-height: 36px;
    padding: ${uiTokens.space.xs} ${uiTokens.space.lg};
    border-bottom: 1px solid ${uiTokens.color.borderSubtle};
    color: ${uiTokens.color.textMuted};
    font-size: ${uiTokens.font.sizeXSmall};
    font-weight: ${uiTokens.font.weightSemibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;

    @media (max-width: 899px) {
        display: none;
    }
`;

const InventoryList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
`;

const InventoryListItem = styled.li`
    margin: 0;
    padding: 0;
    border-bottom: 1px solid ${uiTokens.color.borderSubtle};

    &:last-child {
        border-bottom: 0;
    }

    > div {
        display: block;
        width: 100%;
    }
`;

const ItemRowLink = styled(Link)<{ $isContainer: boolean }>`
    ${inventoryColumns};
    box-sizing: border-box;
    width: 100%;
    min-height: 62px;
    align-items: center;
    padding: ${uiTokens.space.sm} ${uiTokens.space.lg};
    background: ${(props) => (props.$isContainer ? uiTokens.color.brandSubtle : uiTokens.color.surfaceRaised)};
    color: inherit;
    text-decoration: none;
    transition: background ${uiTokens.motion.fast};

    &:hover {
        background: ${(props) => (props.$isContainer ? uiTokens.color.brandGhostActive : uiTokens.color.surfaceSunken)};
    }

    &:active {
        background: ${uiTokens.color.surfaceSubtleActive};
    }

    &:focus-visible {
        position: relative;
        z-index: 1;
        outline: ${uiTokens.focus.ring};
        outline-offset: -2px;
    }

    @media (max-width: 899px) {
        grid-template-columns: minmax(0, 1fr) 24px;
        min-height: 68px;
        gap: ${uiTokens.space.md};
    }

    @media (max-width: 599px) {
        min-height: 64px;
        padding: ${uiTokens.space.sm} ${uiTokens.space.md};
    }
`;

const NameCell = styled.div`
    display: grid;
    min-width: 0;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: center;
    gap: ${uiTokens.space.md};
`;

const ItemIcon = styled.span<{ $isContainer: boolean }>`
    display: inline-flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    color: ${(props) => (props.$isContainer ? uiTokens.color.brand : uiTokens.color.textMuted)};
`;

const NameStack = styled.div`
    min-width: 0;
`;

const ItemName = styled.div<{ $isContainer: boolean }>`
    overflow: hidden;
    color: ${uiTokens.color.text};
    font-size: ${uiTokens.font.sizeMedium};
    font-weight: ${(props) => (props.$isContainer ? uiTokens.font.weightSemibold : uiTokens.font.weightMedium)};
    line-height: ${uiTokens.font.lineHeightTight};
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ItemDescription = styled.div`
    margin-top: ${uiTokens.space.xs};
    overflow: hidden;
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeSmall};
    line-height: ${uiTokens.font.lineHeightTight};
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 899px) {
        display: none;
    }
`;

const CompactMetadata = styled.div`
    display: none;
    margin-top: ${uiTokens.space.xs};
    overflow: hidden;
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeSmall};
    line-height: ${uiTokens.font.lineHeightTight};
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 899px) {
        display: block;
    }
`;

const DesktopCell = styled.div`
    min-width: 0;

    @media (max-width: 899px) {
        display: none;
    }
`;

const TypeBadge = styled.span<{ $isContainer: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: ${uiTokens.space.xs} ${uiTokens.space.sm};
    border-radius: ${uiTokens.radius.pill};
    background: ${(props) => (props.$isContainer ? uiTokens.color.brandSubtle : uiTokens.color.surfaceSubtle)};
    color: ${(props) => (props.$isContainer ? uiTokens.color.brandActive : uiTokens.color.textWeak)};
    font-size: ${uiTokens.font.sizeXSmall};
    font-weight: ${uiTokens.font.weightSemibold};
    white-space: nowrap;
`;

const TagSummary = styled.div`
    display: flex;
    min-width: 0;
    align-items: center;
    gap: ${uiTokens.space.xs};
    overflow: hidden;
`;

const TagPill = styled.span`
    display: inline-block;
    max-width: 112px;
    overflow: hidden;
    padding: ${uiTokens.space.xs} ${uiTokens.space.sm};
    border-radius: ${uiTokens.radius.pill};
    background: ${uiTokens.color.surfaceSubtle};
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeXSmall};
    line-height: ${uiTokens.font.lineHeightTight};
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const NoMetadata = styled.span`
    color: ${uiTokens.color.textMuted};
    font-size: ${uiTokens.font.sizeSmall};
`;

const UpdatedText = styled.time`
    display: block;
    overflow: hidden;
    color: ${uiTokens.color.textWeak};
    font-size: ${uiTokens.font.sizeSmall};
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const RowChevron = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${uiTokens.color.textMuted};
`;

const EmptyState = styled.div`
    display: flex;
    min-height: 180px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: ${uiTokens.space.sm};
    padding: ${uiTokens.space.xxxl};
    color: ${uiTokens.color.textWeak};
    text-align: center;
`;

const EmptyTitle = styled.div`
    color: ${uiTokens.color.text};
    font-weight: ${uiTokens.font.weightSemibold};
`;

const EmptyHint = styled.div`
    font-size: ${uiTokens.font.sizeSmall};
`;

const skeletonPulse = keyframes`
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.8; }
`;

const SkeletonRow = styled.div`
    ${inventoryColumns};
    min-height: 62px;
    align-items: center;
    padding: ${uiTokens.space.sm} ${uiTokens.space.lg};
    border-bottom: 1px solid ${uiTokens.color.borderSubtle};

    &:last-child {
        border-bottom: 0;
    }

    @media (max-width: 899px) {
        grid-template-columns: minmax(0, 1fr) 24px;
        min-height: 68px;
    }
`;

const SkeletonBar = styled.div<{ $width: string }>`
    width: ${(props) => props.$width};
    max-width: 100%;
    height: 12px;
    border-radius: ${uiTokens.radius.small};
    background: ${uiTokens.color.borderSubtle};
    animation: ${skeletonPulse} 1.2s ease-in-out infinite;

    @media (max-width: 899px) {
        &:not(:first-child) {
            display: none;
        }
    }
`;

const PullToRefreshIndicator = styled.div`
    position: absolute;
    z-index: 100;
    top: 0;
    left: 50%;
    display: flex;
    width: ${uiTokens.size.touchTarget};
    height: ${uiTokens.size.touchTarget};
    align-items: center;
    justify-content: center;
    transform: translateX(-50%);
    pointer-events: none;
    transition: transform ${uiTokens.motion.standard}, opacity ${uiTokens.motion.standard};
`;

const rotate = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const RefreshIcon = styled.svg.attrs<{ isTriggered: boolean; pullDistance: number }>(() => ({
    viewBox: '0 0 24 24',
    width: '24',
    height: '24',
}))<{ isTriggered: boolean; pullDistance: number }>`
    fill: none;
    stroke: ${(props) => (props.isTriggered ? uiTokens.color.brand : uiTokens.color.textMuted)};
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: rotate(${(props) =>
        Math.min((props.pullDistance / PULL_TRIGGER_DISTANCE_PX) * ROTATION_MAX_DEGREES, ROTATION_MAX_DEGREES)}deg);
    transition: stroke ${uiTokens.motion.standard};

    ${(props) =>
        props.isTriggered
            ? css`
                  animation: ${rotate} 0.6s linear infinite;
              `
            : undefined}
`;

export interface AllItemsViewPresentationProps {
    items: InventoryItem[];
    containerPath: InventoryItem[];
    availableTags?: TagRecord[];
    loading?: boolean;
    showHomeIcon?: boolean;
    onNavigateToContainer: (containerId: string) => void;
    onBreadcrumbNavigate: (containerId: string | undefined) => void;
    onRefresh?: () => Promise<void>;
    onEditItem?: (itemId: string) => void;
    onDeleteItem?: (itemId: string) => void;
    onViewItemDetails?: (itemId: string) => void;
}

const formatCount = (count: number, singular: string, plural: string): string => {
    return `${count} ${count === 1 ? singular : plural}`;
};

const formatUpdatedDate = (date: Date): string => {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const AllItemsViewPresentation = ({
    items,
    containerPath,
    availableTags = [],
    loading = false,
    showHomeIcon = true,
    onNavigateToContainer,
    onBreadcrumbNavigate,
    onRefresh,
    onEditItem,
    onDeleteItem,
    onViewItemDetails,
    ...rootElementProps
}: AllItemsViewPresentationProps & ComponentPropsWithoutRef<'div'>): ReactElement => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sortOption, setSortOption] = useState<InventorySortOption>('name-asc');
    const sortedItems = useMemo(() => sortInventoryItems(items, sortOption), [items, sortOption]);
    const tagNamesById = useMemo(() => new Map(availableTags.map((tag) => [tag._id, tag.name])), [availableTags]);
    const containerCount = items.filter((item) => item.isContainer).length;
    const itemCount = items.length - containerCount;

    const { isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
        containerRef,
        onRefresh: onRefresh ?? noopRefresh,
        triggerDistance: PULL_TRIGGER_DISTANCE_PX,
        enabled: onRefresh !== undefined,
    });

    const hasParent = containerPath.length > 0;
    const parentContainerId =
        containerPath.length >= PARENT_CONTAINER_OFFSET
            ? containerPath[containerPath.length - PARENT_CONTAINER_OFFSET]?._id
            : undefined;

    useSwipeNavigation(
        containerRef,
        {
            enabled: hasParent,
            threshold: SWIPE_THRESHOLD_PX,
            edgeThreshold: SWIPE_EDGE_THRESHOLD_PX,
            maxVerticalDeviation: SWIPE_MAX_VERTICAL_DEVIATION_PX,
        },
        () => {
            onBreadcrumbNavigate(parentContainerId);
        }
    );

    return (
        <Root {...rootElementProps}>
            {onRefresh !== undefined && (
                <PullToRefreshIndicator
                    data-testid="pull-to-refresh-indicator"
                    style={{
                        transform: `translateY(${Math.min(
                            pullDistance,
                            PULL_MAX_VISUAL_DISTANCE_PX
                        )}px) translateX(-50%)`,
                        opacity: Math.min(pullDistance / PULL_TRIGGER_DISTANCE_PX, 1),
                    }}
                >
                    {isRefreshing ? (
                        <LoadingSpinner size="small" />
                    ) : (
                        <RefreshIcon isTriggered={isTriggered} pullDistance={pullDistance}>
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                        </RefreshIcon>
                    )}
                </PullToRefreshIndicator>
            )}

            <ScrollableContainer ref={containerRef} data-testid="items-list">
                <ContentFrame>
                    <BreadcrumbTrail
                        path={containerPath}
                        showHomeIcon={showHomeIcon}
                        onNavigateRoot={() => {
                            onBreadcrumbNavigate(undefined);
                        }}
                        onNavigate={(item) => {
                            onBreadcrumbNavigate(item._id);
                        }}
                    />

                    <InventorySheet aria-label="Inventory entries">
                        <InventoryToolbar>
                            <InventoryCount aria-live="polite" data-testid="inventory-count">
                                <CountPrimary>
                                    {loading ? 'Loading inventory…' : formatCount(items.length, 'entry', 'entries')}
                                </CountPrimary>
                                <CountBreakdown>
                                    {loading
                                        ? 'Fetching this location'
                                        : `${formatCount(containerCount, 'container', 'containers')} • ${formatCount(
                                              itemCount,
                                              'item',
                                              'items'
                                          )}`}
                                </CountBreakdown>
                            </InventoryCount>

                            <SortControl>
                                <span>Sort</span>
                                <SortSelect
                                    aria-label="Sort inventory"
                                    value={sortOption}
                                    disabled={loading}
                                    onChange={(event) => {
                                        setSortOption(event.currentTarget.value as InventorySortOption);
                                    }}
                                >
                                    {inventorySortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </SortSelect>
                            </SortControl>
                        </InventoryToolbar>

                        <ColumnHeader aria-hidden="true">
                            <span>Name</span>
                            <span>Type</span>
                            <span>Tags</span>
                            <span>Updated</span>
                            <span />
                        </ColumnHeader>

                        {loading ? (
                            <Box role="status" aria-label="Loading inventory entries">
                                {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
                                    <SkeletonRow key={index} aria-hidden="true">
                                        <SkeletonBar $width={index % SKELETON_VARIANT_DIVISOR === 0 ? '72%' : '56%'} />
                                        <SkeletonBar $width="68px" />
                                        <SkeletonBar $width="82%" />
                                        <SkeletonBar $width="76px" />
                                        <span />
                                    </SkeletonRow>
                                ))}
                            </Box>
                        ) : sortedItems.length === 0 ? (
                            <EmptyState role="status">
                                <EmptyTitle>No items at this level</EmptyTitle>
                                <EmptyHint>
                                    Create an item or adjust the active filters to add something here.
                                </EmptyHint>
                            </EmptyState>
                        ) : (
                            <InventoryList>
                                {sortedItems.map((item) => {
                                    const menuActions = [];
                                    if (onViewItemDetails !== undefined) {
                                        menuActions.push({
                                            label: 'View Details',
                                            onClick: () => {
                                                onViewItemDetails(item._id);
                                            },
                                        });
                                    }
                                    if (onEditItem !== undefined) {
                                        menuActions.push({
                                            label: 'Edit',
                                            onClick: () => {
                                                onEditItem(item._id);
                                            },
                                        });
                                    }
                                    if (onDeleteItem !== undefined) {
                                        menuActions.push({
                                            label: 'Delete',
                                            onClick: () => {
                                                onDeleteItem(item._id);
                                            },
                                            variant: 'danger' as const,
                                        });
                                    }

                                    const tagNames = item.tagIds.map((tagId) => tagNamesById.get(tagId) ?? tagId);
                                    const compactDetail =
                                        item.description?.trim() !== '' && item.description !== undefined
                                            ? item.description
                                            : tagNames.length > 0
                                            ? tagNames.join(', ')
                                            : 'No additional details';

                                    return (
                                        <InventoryListItem key={item._id}>
                                            <LongPressContextMenu actions={menuActions}>
                                                <ItemRowLink
                                                    $isContainer={item.isContainer}
                                                    data-testid="inventory-row"
                                                    data-container={String(item.isContainer)}
                                                    href={
                                                        item.isContainer
                                                            ? `/container/${item._id}`
                                                            : `/items/${item._id}`
                                                    }
                                                    aria-label={
                                                        item.isContainer
                                                            ? `Open container ${item.name}`
                                                            : `View item ${item.name}`
                                                    }
                                                >
                                                    <NameCell>
                                                        <ItemIcon $isContainer={item.isContainer} aria-hidden="true">
                                                            {item.isContainer ? (
                                                                <Folder size="20px" color="currentColor" />
                                                            ) : (
                                                                <Package size="20px" color="currentColor" />
                                                            )}
                                                        </ItemIcon>
                                                        <NameStack>
                                                            <ItemName $isContainer={item.isContainer} title={item.name}>
                                                                {item.name}
                                                            </ItemName>
                                                            {item.description !== '' &&
                                                                item.description !== undefined && (
                                                                    <ItemDescription title={item.description}>
                                                                        {item.description}
                                                                    </ItemDescription>
                                                                )}
                                                            <CompactMetadata
                                                                title={`${
                                                                    item.isContainer ? 'Container' : 'Item'
                                                                } • ${compactDetail}`}
                                                            >
                                                                {item.isContainer ? 'Container' : 'Item'} •{' '}
                                                                {compactDetail}
                                                            </CompactMetadata>
                                                        </NameStack>
                                                    </NameCell>

                                                    <DesktopCell>
                                                        <TypeBadge $isContainer={item.isContainer}>
                                                            {item.isContainer ? 'Container' : 'Item'}
                                                        </TypeBadge>
                                                    </DesktopCell>

                                                    <DesktopCell>
                                                        {tagNames.length === 0 ? (
                                                            <NoMetadata>No tags</NoMetadata>
                                                        ) : (
                                                            <TagSummary title={tagNames.join(', ')}>
                                                                {tagNames
                                                                    .slice(0, MAX_VISIBLE_TAGS)
                                                                    .map((tagName, index) => (
                                                                        <TagPill
                                                                            key={`${item._id}-${item.tagIds[index]}`}
                                                                        >
                                                                            {tagName}
                                                                        </TagPill>
                                                                    ))}
                                                                {tagNames.length > MAX_VISIBLE_TAGS && (
                                                                    <TagPill>
                                                                        +{tagNames.length - MAX_VISIBLE_TAGS}
                                                                    </TagPill>
                                                                )}
                                                            </TagSummary>
                                                        )}
                                                    </DesktopCell>

                                                    <DesktopCell>
                                                        <UpdatedText
                                                            dateTime={item.modifiedAt.toISOString()}
                                                            title={item.modifiedAt.toLocaleString()}
                                                        >
                                                            {formatUpdatedDate(item.modifiedAt)}
                                                        </UpdatedText>
                                                    </DesktopCell>

                                                    <RowChevron aria-hidden="true">
                                                        <Next size="18px" color="currentColor" />
                                                    </RowChevron>
                                                </ItemRowLink>
                                            </LongPressContextMenu>
                                        </InventoryListItem>
                                    );
                                })}
                            </InventoryList>
                        )}
                    </InventorySheet>
                </ContentFrame>
            </ScrollableContainer>
        </Root>
    );
};
