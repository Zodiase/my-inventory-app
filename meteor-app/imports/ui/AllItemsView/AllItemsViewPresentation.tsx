import { Box, List, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ComponentProps, type ReactElement } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';

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
}

export const AllItemsViewPresentation = ({
    items,
    containerPath,
    showHomeIcon = true,
    onNavigateToContainer,
    onBreadcrumbNavigate,
    ...rootElementProps
}: AllItemsViewPresentationProps & ComponentProps<'div'>): ReactElement => {
    return (
        <Box {...rootElementProps} fill gap="small" pad="small">
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
                                    onNavigateToContainer(item._id);
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
