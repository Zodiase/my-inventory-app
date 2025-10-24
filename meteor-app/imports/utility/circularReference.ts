import type InventoryItem from '/imports/model/InventoryItem';
import type { NamedCollection } from '/imports/utility/NamedCollection';

/**
 * Check if moving an item would create a circular reference in the container hierarchy.
 *
 * @param itemId - The item being moved
 * @param targetContainerId - The proposed new parent container
 * @param itemsCollection - The Items collection to query
 * @returns Promise resolving to true if circular reference detected, false otherwise
 *
 * @remarks
 * A circular reference occurs when an item would become its own ancestor.
 * This happens if you try to move a container inside itself or inside one of
 * its descendants.
 *
 * Algorithm:
 * 1. If targetContainerId is empty/null, no circular reference possible (moving to root)
 * 2. If itemId === targetContainerId, direct circular reference
 * 3. Walk up the ancestor chain from targetContainer, checking if we encounter itemId
 *
 * Time complexity: O(depth) where depth is the container nesting level
 * Space complexity: O(depth) for the visited set
 *
 * @example
 * ```typescript
 * // Box A contains Box B which contains Box C
 * // Trying to move Box A into Box C would create a cycle
 * const wouldCycle = await detectCircularReference(
 *   'boxA',
 *   'boxC',
 *   InventoryItemsCollection
 * );
 * // Returns true - Box A cannot be inside Box C because Box C is inside Box A
 * ```
 */
export const detectCircularReference = async (
    itemId: string,
    targetContainerId: string | null | undefined,
    itemsCollection: NamedCollection<InventoryItem>
): Promise<boolean> => {
    // No target container means moving to root - no circular reference possible
    if (typeof targetContainerId === 'undefined' || targetContainerId === null || targetContainerId === '') {
        return false;
    }

    // Direct circular reference - item cannot contain itself
    if (itemId === targetContainerId) {
        return true;
    }

    // Walk up the ancestor chain from targetContainer
    // If we encounter itemId, we have a circular reference
    const visited = new Set<string>();
    let currentContainerId: string | undefined = targetContainerId;

    while (typeof currentContainerId !== 'undefined' && currentContainerId !== '') {
        // Prevent infinite loops in case database already has circular references
        if (visited.has(currentContainerId)) {
            return true; // Found a cycle in existing data
        }

        visited.add(currentContainerId);

        // If we encounter the item being moved, we've found a circular reference
        if (currentContainerId === itemId) {
            return true;
        }

        // Get the parent of the current container
        const container: InventoryItem | undefined = await itemsCollection.findOneAsync({ _id: currentContainerId });

        if (typeof container === 'undefined') {
            // Container not found - broken reference, but not a circular reference
            return false;
        }

        // Move up to the parent
        currentContainerId = container.containerId;
    }

    // Reached the root without finding itemId - no circular reference
    return false;
};

/**
 * Get all ancestor containers of an item (from direct parent up to root).
 *
 * @param itemId - The item to get ancestors for
 * @param itemsCollection - The Items collection to query
 * @returns Promise resolving to array of ancestor items (direct parent first, root last)
 *
 * @remarks
 * This is useful for building breadcrumb trails and validating hierarchy depth.
 * The array is ordered from closest ancestor (parent) to furthest (root).
 *
 * @example
 * ```typescript
 * // Garage > Shelf > Box > Item
 * const ancestors = await getAncestorChain('item123', InventoryItemsCollection);
 * // Returns: [Box, Shelf, Garage]
 * ```
 */
export const getAncestorChain = async (
    itemId: string,
    itemsCollection: NamedCollection<InventoryItem>
): Promise<InventoryItem[]> => {
    const ancestors: InventoryItem[] = [];
    const visited = new Set<string>();

    let currentItem = await itemsCollection.findOneAsync({ _id: itemId });

    if (typeof currentItem === 'undefined') {
        return ancestors;
    }

    let currentContainerId = currentItem.containerId;

    while (typeof currentContainerId !== 'undefined' && currentContainerId !== '') {
        // Prevent infinite loops
        if (visited.has(currentContainerId)) {
            break;
        }

        visited.add(currentContainerId);

        const container: InventoryItem | undefined = await itemsCollection.findOneAsync({ _id: currentContainerId });

        if (typeof container === 'undefined') {
            // Broken reference
            break;
        }

        ancestors.push(container);
        currentContainerId = container.containerId;
    }

    return ancestors;
};

export default detectCircularReference;
