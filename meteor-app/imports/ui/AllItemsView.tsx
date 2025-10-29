import { Box, Button, List, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ComponentProps, type ReactElement, useState } from 'react';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';
import { useTracker } from '/imports/utility/reactMeteorData';

/**
 * AllItemsView displays inventory items in a hierarchical navigation structure.
 *
 * Features:
 * - Shows items at the current container level
 * - BreadcrumbTrail for navigation context and moving up the hierarchy
 * - Visual distinction between containers (Folder icon) and items
 * - Touch-optimized navigation (44x44px minimum touch targets)
 * - Click containers to navigate into them
 *
 * @remarks
 * The component maintains local state for the current container ID and fetches only
 * the items at that level. Container items show a Folder icon and Next arrow to
 * indicate they can be navigated into.
 */
export interface AllItemsViewProps {
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

export const AllItemsView = ({
    initialContainerId,
    onNavigate,
    ...rootElementProps
}: AllItemsViewProps & ComponentProps<'div'>): ReactElement => {
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
        <Box {...rootElementProps} fill gap="small" pad="small">
            {/* Breadcrumb trail for navigation */}
            <BreadcrumbTrail
                path={containerPath}
                showHomeIcon
                onNavigate={(item) => {
                    handleNavigateToContainer(item?._id);
                }}
            />

            {/* Items list */}
            {items.length === 0 ? (
                <Box align="center" justify="center" pad="large">
                    <Text color="text-weak">No items at this level</Text>
                </Box>
            ) : (
                <List data={items} pad="none" border={false}>
                    {(item: InventoryItem) => (
                        <Box
                            key={item._id}
                            direction="row"
                            align="center"
                            pad="small"
                            gap="small"
                            background="background-front"
                            hoverIndicator="background-contrast"
                            style={{
                                minHeight: '44px',
                                cursor: item.isContainer ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                                if (item.isContainer) {
                                    handleNavigateToContainer(item._id);
                                }
                            }}
                        >
                            {/* Icon for containers */}
                            {item.isContainer && <Folder size="medium" color="brand" />}

                            {/* Item name */}
                            <Box flex>
                                <Text weight={item.isContainer ? 'bold' : 'normal'}>{item.name}</Text>
                                {item.description && (
                                    <Text size="small" color="text-weak" truncate>
                                        {item.description}
                                    </Text>
                                )}
                            </Box>

                            {/* Navigation arrow for containers */}
                            {item.isContainer && <Next size="medium" color="text-weak" />}
                        </Box>
                    )}
                </List>
            )}
        </Box>
    );
};
