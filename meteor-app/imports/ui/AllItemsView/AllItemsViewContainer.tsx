/**
 * Meteor-backed container for the hierarchical inventory list.
 * Keeps publication state, current-container selection, breadcrumbs, and route updates
 * out of the presentational list component.
 */
import type { Mongo } from 'meteor/mongo';
import React, { type ComponentProps, type ReactElement, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import type { SearchFragment } from '/imports/model/SearchFragment';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import { buildSearchQuery } from '/imports/utility/searchQuery';
import { usePageTitle } from '/imports/utility/usePageTitle';

const REFRESH_VISUAL_DELAY_MS = 500;

const findInventoryItemById = (itemId: string): InventoryItem | undefined => {
    return InventoryItemsCollection.find({ _id: itemId }, { limit: 1 }).fetch()[0];
};

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

    useEffect(() => {
        setCurrentContainerId(initialContainerId);
    }, [initialContainerId]);

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

            return InventoryItemsCollection.find(combinedQuery).fetch();
        }

        // No filters - just show items at current level
        return InventoryItemsCollection.find(baseQuery).fetch();
    }, [currentContainerId, JSON.stringify(filters), refreshTrigger]);

    const availableTags = useTracker(() => TagsCollection.find({}, { sort: { name: 1 } }).fetch(), []);

    // Fetch current container path for breadcrumb
    const containerPath = useTracker(() => {
        if (currentContainerId === undefined) {
            return [];
        }
        const container = findInventoryItemById(currentContainerId);
        if (container === undefined) {
            return [];
        }

        const path: InventoryItem[] = [container];
        const visitedContainerIds = new Set<string>([container._id]);
        let current = container;
        while (current.containerId !== undefined) {
            if (visitedContainerIds.has(current.containerId)) break;

            const parent = findInventoryItemById(current.containerId);
            if (parent === undefined) break;

            path.unshift(parent);
            visitedContainerIds.add(parent._id);
            current = parent;
        }
        return path;
    }, [currentContainerId]);

    const handleNavigateToContainer = (containerId: string | undefined): void => {
        setCurrentContainerId(containerId);
        onNavigate?.(containerId);
        setLocation(containerId === undefined ? '/items' : `/container/${containerId}`);
    };

    return (
        <AllItemsViewPresentation
            {...rootElementProps}
            items={items}
            containerPath={containerPath}
            availableTags={availableTags}
            loading={isLoadingItems() || isLoadingTags()}
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
