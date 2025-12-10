import { Box, List, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ComponentProps, type ReactElement, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';
import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { LongPressContextMenu } from '/imports/ui/LongPressContextMenu';
import { usePullToRefresh } from '/imports/utility/pullToRefresh';
import { useSwipeNavigation } from '/imports/utility/swipeNavigation';

// Pull-to-refresh and navigation constants
const PULL_TRIGGER_DISTANCE_PX = 80;
const PULL_MAX_VISUAL_DISTANCE_PX = 60;
const ROTATION_MAX_DEGREES = 360;
const SWIPE_THRESHOLD_PX = 100;
const SWIPE_EDGE_THRESHOLD_PX = 50;
const SWIPE_MAX_VERTICAL_DEVIATION_PX = 50;
const ICON_ROTATION_DIVISOR = 2;

/**
 * Scrollable container for items list
 */
const ScrollableContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
`;

/**
 * Pull-to-refresh indicator container
 */
const PullToRefreshIndicator = styled.div`
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    pointer-events: none;
    z-index: 100;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
`;

/**
 * Rotation animation for refresh icon
 */
/**
 * Animation and rotation constants
 */
const ROTATION_DIVISOR_FOR_ICON = 2; // Divide rotation by 2 for icon animation

const rotate = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

/**
 * Refresh icon arrow (SVG)
 */
const RefreshIcon = styled.svg.attrs<{ isTriggered: boolean; pullDistance: number }>(() => ({
    viewBox: '0 0 24 24',
    width: '24',
    height: '24',
}))<{ isTriggered: boolean; pullDistance: number }>`
    fill: none;
    stroke: ${(props) => (props.isTriggered ? '#7D4CDB' : '#999')};
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: rotate(${(props) =>
        Math.min((props.pullDistance / PULL_TRIGGER_DISTANCE_PX) * ROTATION_MAX_DEGREES, ROTATION_MAX_DEGREES)}deg);
    transition: stroke 0.2s ease-out;

    ${(props) =>
        props.isTriggered &&
        `
        animation: ${rotate} 0.6s linear infinite;
    `}
`;

/**
 * AllItemsViewPresentation is a pure presentation component that displays inventory items
 * in a hierarchical structure.
 *
 * This component receives all data as props and has no dependencies on Meteor's reactive
 * data system, making it fully testable in Storybook.
 *
 * Features:
 * - Shows items at the current container level
 * - BreadcrumbTrail for navigation context
 * - Visual distinction between containers (Folder icon) and items
 * - Touch-optimized navigation (44x44px minimum touch targets)
 * - Pull-to-refresh gesture for iOS-style data refresh
 * - Long-press context menus on items for actions
 * - Click containers to navigate into them
 */
export interface AllItemsViewPresentationProps {
    /**
     * Items to display at the current level
     */
    items: InventoryItem[];

    /**
     * Path of containers from root to current location for breadcrumb
     */
    containerPath: InventoryItem[];

    /**
     * Whether to show the home icon in breadcrumb
     */
    showHomeIcon?: boolean;

    /**
     * Callback when a container is clicked to navigate into it
     */
    onNavigateToContainer: (containerId: string) => void;

    /**
     * Callback when navigating via breadcrumb trail
     */
    onBreadcrumbNavigate: (containerId: string | undefined) => void;

    /**
     * Callback when pull-to-refresh is triggered
     */
    onRefresh?: () => Promise<void>;

    /**
     * Callback when item edit is selected from context menu
     */
    onEditItem?: (itemId: string) => void;

    /**
     * Callback when item delete is selected from context menu
     */
    onDeleteItem?: (itemId: string) => void;

    /**
     * Callback when item view details is selected from context menu
     */
    onViewItemDetails?: (itemId: string) => void;
}

export const AllItemsViewPresentation = ({
    items,
    containerPath,
    showHomeIcon = true,
    onNavigateToContainer,
    onBreadcrumbNavigate,
    onRefresh,
    onEditItem,
    onDeleteItem,
    onViewItemDetails,
    ...rootElementProps
}: AllItemsViewPresentationProps & ComponentProps<'div'>): ReactElement => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Pull-to-refresh hook
    const { isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
        containerRef,
        onRefresh: onRefresh ?? (async () => {}),
        triggerDistance: PULL_TRIGGER_DISTANCE_PX,
        enabled: onRefresh !== undefined,
    });

    // Swipe-back navigation hook
    // Navigate to parent container (second-to-last in breadcrumb path)
    const hasParent = containerPath.length > 0;
    const parentContainerId = containerPath.length > 1 ? containerPath[containerPath.length - 2]?._id : undefined;

    useSwipeNavigation(
        containerRef,
        {
            enabled: hasParent,
            threshold: SWIPE_THRESHOLD_PX,
            edgeThreshold: SWIPE_EDGE_THRESHOLD_PX,
            maxVerticalDeviation: SWIPE_MAX_VERTICAL_DEVIATION_PX,
        },
        () => {
            // Navigate to parent container
            onBreadcrumbNavigate(parentContainerId);
        }
    );

    return (
        <Box {...rootElementProps} fill gap="small" pad="small">
            {/* Pull-to-refresh indicator */}
            {onRefresh !== undefined && (
                <PullToRefreshIndicator
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

            {/* Scrollable container */}
            <ScrollableContainer ref={containerRef}>
                {/* Breadcrumb trail for navigation */}
                <BreadcrumbTrail
                    path={containerPath}
                    showHomeIcon={showHomeIcon}
                    onNavigate={(item) => {
                        onBreadcrumbNavigate(item?._id);
                    }}
                />

                {/* Items list */}
                {items.length === 0 ? (
                    <Box align="center" justify="center" pad="large">
                        <Text color="text-weak">No items at this level</Text>
                    </Box>
                ) : (
                    <List data={items} pad="none" border={false}>
                        {(item: InventoryItem) => {
                            // Build context menu actions
                            const menuActions = [];

                            // Always add View Details - navigates to /items/:itemId
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

                            const hasContextMenu = menuActions.length > 0;

                            return (
                                <LongPressContextMenu key={item._id} actions={menuActions}>
                                    <Box
                                        direction="row"
                                        align="center"
                                        pad="small"
                                        gap="small"
                                        background="background-front"
                                        hoverIndicator="background-contrast"
                                        style={{
                                            minHeight: '44px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            if (item.isContainer) {
                                                onNavigateToContainer(item._id);
                                            } else if (onViewItemDetails !== undefined) {
                                                onViewItemDetails(item._id);
                                            }
                                        }}
                                    >
                                        {/* Icon for containers */}
                                        {item.isContainer && <Folder size="medium" color="brand" />}

                                        {/* Item name */}
                                        <Box flex>
                                            <Text weight={item.isContainer ? 'bold' : 'normal'}>{item.name}</Text>
                                            {item.description !== '' &&
                                                item.description !== null &&
                                                item.description !== undefined && (
                                                    <Text size="small" color="text-weak" truncate>
                                                        {item.description}
                                                    </Text>
                                                )}
                                        </Box>

                                        {/* Navigation arrow for containers */}
                                        {item.isContainer && <Next size="medium" color="text-weak" />}
                                    </Box>
                                </LongPressContextMenu>
                            );
                        }}
                    </List>
                )}
            </ScrollableContainer>
        </Box>
    );
};
