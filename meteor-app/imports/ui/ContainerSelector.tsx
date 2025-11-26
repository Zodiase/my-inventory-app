import { Box, List, Text } from 'grommet';
import { Folder, Home } from 'grommet-icons';
import React from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';

/**
 * ContainerSelector component for selecting a parent container when moving items.
 *
 * @remarks
 * Displays a list of containers that can be selected as move targets.
 * Containers that would create circular references are automatically filtered out.
 * All touch targets are 44x44px minimum for iOS accessibility.
 *
 * The component shows a hierarchical indent for nested containers to visualize
 * the container structure.
 */

export interface ContainerSelectorProps {
    /** List of available containers to choose from (already filtered for circular refs) */
    containers: InventoryItem[];

    /** Currently selected container ID (undefined for root) */
    selectedContainerId?: string;

    /** Callback when a container is selected */
    onSelect: (containerId: string | undefined) => void;

    /** Show "Move to Root" option */
    showRootOption?: boolean;

    /** Whether the selector is disabled */
    disabled?: boolean;
}

/**
 * ContainerSelector component displays a selectable list of containers.
 *
 * @example
 * ```tsx
 * // Get all containers and filter out circular references
 * const allContainers = await InventoryItemsCollection.find({
 *   isContainer: true
 * }).fetchAsync();
 *
 * // Filter out the item being moved and its descendants
 * const validContainers = allContainers.filter(c => {
 *   // Use circular reference detection here
 *   return !wouldCreateCircularReference(itemId, c._id);
 * });
 *
 * <ContainerSelector
 *   containers={validContainers}
 *   selectedContainerId={currentContainerId}
 *   onSelect={(id) => setSelectedContainer(id)}
 *   showRootOption
 * />
 * ```
 */
export const ContainerSelector: React.FC<ContainerSelectorProps> = ({
    containers,
    selectedContainerId,
    onSelect,
    showRootOption = true,
    disabled = false,
}) => {
    // Build a map of containerId -> depth for indentation
    const depthMap = new Map<string, number>();

    // Calculate depth for each container
    const calculateDepth = (container: InventoryItem): number => {
        if (depthMap.has(container._id)) {
            return depthMap.get(container._id)!;
        }

        if (!container.containerId) {
            depthMap.set(container._id, 0);
            return 0;
        }

        const parent = containers.find((c) => c._id === container.containerId);
        if (!parent) {
            depthMap.set(container._id, 0);
            return 0;
        }

        const depth = calculateDepth(parent) + 1;
        depthMap.set(container._id, depth);
        return depth;
    };

    // Calculate depths for all containers
    containers.forEach((c) => calculateDepth(c));

    // Sort containers by hierarchy (parents before children)
    const sortedContainers = [...containers].sort((a, b) => {
        const depthA = depthMap.get(a._id) || 0;
        const depthB = depthMap.get(b._id) || 0;

        if (depthA !== depthB) {
            return depthA - depthB;
        }

        return a.name.localeCompare(b.name);
    });

    // Build list data including optional root
    const listData: Array<{ id: string | undefined; name: string; depth: number }> = [];

    if (showRootOption) {
        listData.push({
            id: undefined,
            name: 'Root (No Container)',
            depth: 0,
        });
    }

    sortedContainers.forEach((container) => {
        listData.push({
            id: container._id,
            name: container.name,
            depth: depthMap.get(container._id) || 0,
        });
    });

    return (
        <Box fill overflow="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <List
                data={listData}
                pad={{ horizontal: 'small', vertical: 'xsmall' }}
                onClickItem={(event) => {
                    if (!disabled) {
                        const item = event.item as {
                            id: string | undefined;
                            name: string;
                            depth: number;
                        };
                        onSelect(item.id);
                    }
                }}
            >
                {(datum: { id: string | undefined; name: string; depth: number }) => {
                    const isSelected = datum.id === selectedContainerId;
                    const isRoot = datum.id === undefined;
                    const indentPx = datum.depth * 24;

                    return (
                        <Box
                            direction="row"
                            align="center"
                            pad="small"
                            background={isSelected ? 'brand' : undefined}
                            round="xsmall"
                            style={{
                                minHeight: '44px',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                paddingLeft: `${12 + indentPx}px`,
                            }}
                        >
                            <Box width="24px" margin={{ right: 'small' }}>
                                {isRoot ? (
                                    <Home size="medium" color={isSelected ? 'white' : 'brand'} />
                                ) : (
                                    <Folder size="medium" color={isSelected ? 'white' : 'dark-3'} />
                                )}
                            </Box>
                            <Text color={isSelected ? 'white' : undefined}>{datum.name}</Text>
                        </Box>
                    );
                }}
            </List>
        </Box>
    );
};

export default ContainerSelector;
