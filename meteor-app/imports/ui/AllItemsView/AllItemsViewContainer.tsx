import React, { type ComponentProps, type ReactElement, useState } from 'react';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
import { useTracker } from '/imports/utility/reactMeteorData';

/**
 * AllItemsViewContainer is a container component that fetches data from Meteor and passes it
 * to AllItemsViewPresentation.
 *
 * This component handles:
 * - Fetching items at the current container level from Meteor
 * - Building the breadcrumb path by traversing parent containers
 * - Managing navigation state
 *
 * @remarks
 * The component maintains local state for the current container ID and fetches only
 * the items at that level. It uses Meteor's useTracker for reactive data.
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
}

export const AllItemsViewContainer = ({
    initialContainerId,
    onNavigate,
    ...rootElementProps
}: AllItemsViewContainerProps & ComponentProps<'div'>): ReactElement => {
    const [currentContainerId, setCurrentContainerId] = useState<string | undefined>(initialContainerId);

    // Fetch items at current level
    const items = useTracker(
        () =>
            InventoryItemsCollection.find(
                {
                    containerId: currentContainerId,
                },
                {
                    sort: [
                        ['isContainer', 'desc'], // Containers first
                        ['name', 'asc'],
                        ['createdAt', 'asc'],
                    ],
                }
            ).fetch(),
        [currentContainerId]
    );

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
        />
    );
};
