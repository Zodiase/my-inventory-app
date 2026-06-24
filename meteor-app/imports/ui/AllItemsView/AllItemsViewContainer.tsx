import type { Mongo } from 'meteor/mongo';
import React, { type ComponentProps, type ReactElement, useState, useCallback } from 'react';
import { useLocation } from 'wouter';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import type { SearchFragment } from '/imports/model/SearchFragment';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import { buildSearchQuery } from '/imports/utility/searchQuery';
import { usePageTitle } from '/imports/utility/usePageTitle';

const REFRESH_VISUAL_DELAY_MS = 500;

/**
 * AllItemsViewContainer is a container component that fetches data from Meteor and passes it
 * to AllItemsViewPresentation.
 *
 * This component handles:
 * - Fetching items at the current container level from Meteor
 * - Building the breadcrumb path by traversing parent containers
 * - Managing navigation state
 * - Applying search filters to the current view (context-aware filtering)
 *
 * @remarks
 * The component maintains local state for the current container ID and fetches only
 * the items at that level. It uses Meteor's useTracker for reactive data.
 *
 * When filters are provided, they are applied to narrow down the visible items
 * within the current container (context-aware filtering).
 */
export interface AllItemsViewContainerProps {
    /**
     * Initial container ID to display. If undefined, shows root level items.
     */
    initialContainerId?: string;

    /**
     * Callback when navigating to a different container.
     * @param containerId - The ID of the container being navigated to, or undefined for root
     */
    onNavigate?: (containerId: string | undefined) => void;

    /**
     * Optional search fragments to filter the items in the current view.
     * These filters apply to items at the current container level only.
     */
    filters?: SearchFragment[];
}

export const AllItemsViewContainer = ({
    initialContainerId,
    onNavigate,
    filters = [],
    ...rootElementProps
}: AllItemsViewContainerProps & ComponentProps<'div'>): ReactElement => {
    const [currentContainerId, setCurrentContainerId] = useState<string | undefined>(initialContainerId);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [, setLocation] = useLocation();

    usePageTitle('Items - My Inventory');

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
        // Trigger re-fetch by updating dependency
        setRefreshTrigger((prev) => prev + 1);

        // Small delay for visual feedback
        await new Promise((resolve) => {
            setTimeout(resolve, REFRESH_VISUAL_DELAY_MS);
        });
    }, []);

    const isLoadingItems = useSubscribe('items.byContainer', currentContainerId ?? null);
    const isLoadingTags = useSubscribe('tags.all');

    // Fetch items at current level with optional filters
    const items = useTracker(() => {
        // Start with base query for current container level
        const baseQuery: Mongo.Selector<InventoryItem> = {
            containerId: currentContainerId,
        };

        // If filters are provided, merge them with base query
        if (filters.length > 0) {
            const filterQuery = buildSearchQuery(filters) as Mongo.Selector<InventoryItem>;

            // Combine base query (container scoping) with filter query (AND logic)
            const combinedQuery: Mongo.Selector<InventoryItem> = {
                $and: [baseQuery, filterQuery],
            };

            return InventoryItemsCollection.find(combinedQuery, {
                sort: [
                    ['isContainer', 'desc'], // Containers first
                    ['name', 'asc'],
                    ['createdAt', 'asc'],
                ],
            }).fetch();
        } else {
            // No filters - just show items at current level
            return InventoryItemsCollection.find(baseQuery, {
                sort: [
                    ['isContainer', 'desc'], // Containers first
                    ['name', 'asc'],
                    ['createdAt', 'asc'],
                ],
            }).fetch();
        }
    }, [currentContainerId, JSON.stringify(filters), refreshTrigger]);

    // Fetch current container path for breadcrumb
    const containerPath = useTracker(() => {
        if (currentContainerId === undefined) {
            return [];
        }
        const container = InventoryItemsCollection.findOne({ _id: currentContainerId });
        if (container === undefined) {
            return [];
        }

        const path: InventoryItem[] = [container];
        let current = container;
        while (current.containerId !== undefined) {
            const parent = InventoryItemsCollection.findOne({ _id: current.containerId });
            if (parent === undefined) break;
            path.unshift(parent);
            current = parent;
        }
        return path;
    }, [currentContainerId]);

    const handleNavigateToContainer = (containerId: string | undefined): void => {
        setCurrentContainerId(containerId);
        onNavigate?.(containerId);
    };

    if (isLoadingItems() || isLoadingTags()) {
        return <LoadingState />;
    }

    return (
        <AllItemsViewPresentation
            {...rootElementProps}
            items={items}
            containerPath={containerPath}
            onNavigateToContainer={(containerId) => {
                handleNavigateToContainer(containerId);
            }}
            onBreadcrumbNavigate={(containerId) => {
                handleNavigateToContainer(containerId);
            }}
            onRefresh={handleRefresh}
            onViewItemDetails={(itemId) => {
                setLocation(`/items/${itemId}`);
            }}
        />
    );
};
