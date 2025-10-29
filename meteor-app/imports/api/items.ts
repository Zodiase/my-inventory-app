import { Meteor } from 'meteor/meteor';

import type InventoryItem from '/imports/model/InventoryItem';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import detectCircularReference, { getAncestorChain } from '/imports/utility/circularReference';
import createLogger from '/imports/utility/Logger';
import asMeteorMethods from '/imports/utility/MeteorMethods';
import { NamedCollection } from '/imports/utility/NamedCollection';
import type NoId from '/imports/utility/NoId';
import type RecordInput from '/imports/utility/RecordInput';
// import strictSelector from '/imports/utility/strictSelector'; // Will be used by safely* methods

export type { InventoryItem } from '/imports/model/InventoryItem';

const logger = createLogger(module);

export const InventoryItemsCollection = new NamedCollection<InventoryItem>('items');

export const createInventoryItem = async (itemInput: RecordInput<InventoryItem>): Promise<string> => {
    const { name, description, containerId, isContainer = false, tagIds = [], properties } = itemInput;

    if (typeof name === 'undefined' || name.trim() === '') {
        throw new Error('Item must have a name.');
    }

    // Validate name length
    if (name.length > 500) {
        throw new Error('Item name must be 500 characters or less.');
    }

    // Validate description length if provided
    if (typeof description !== 'undefined' && description.length > 5000) {
        throw new Error('Item description must be 5000 characters or less.');
    }

    // Validate containerId if provided
    if (typeof containerId !== 'undefined' && containerId !== '') {
        const parentContainer = await InventoryItemsCollection.findOneAsync({ _id: containerId });

        if (typeof parentContainer === 'undefined') {
            throw new Error('Parent container not found.');
        }

        if (!parentContainer.isContainer) {
            throw new Error('Parent must be a container (isContainer: true).');
        }
    }

    const now = new Date();
    const newItem: NoId<InventoryItem> = {
        name: name.trim(),
        description: typeof description !== 'undefined' ? description.trim() : undefined,
        containerId: typeof containerId !== 'undefined' && containerId !== '' ? containerId : undefined,
        isContainer,
        tagIds: [...tagIds], // Create a copy to avoid mutations
        properties,
        createdAt: now,
        modifiedAt: now,
    };

    const itemId = await InventoryItemsCollection.insertAsync(newItem);

    logger.log('Item created', { itemId, name: newItem.name, isContainer });

    return itemId;
};

/**
 * Update an existing inventory item.
 *
 * @param itemId - ID of the item to update
 * @param updates - Fields to update (partial InventoryItem)
 * @returns Promise resolving to the number of items updated (0 or 1)
 *
 * @remarks
 * This method performs an unconditional update based on itemId only.
 * For optimistic locking (to prevent race conditions), use safelyUpdateInventoryItem instead.
 * containerId changes should use moveItem instead for proper validation.
 */
export const updateInventoryItem = async (
    itemId: string,
    updates: Partial<Pick<InventoryItem, 'name' | 'description' | 'isContainer' | 'tagIds' | 'properties'>>
): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Validate updates
    if (typeof updates.name !== 'undefined') {
        if (updates.name.trim() === '') {
            throw new Error('Item name cannot be empty.');
        }
        if (updates.name.length > 500) {
            throw new Error('Item name must be 500 characters or less.');
        }
    }

    if (typeof updates.description !== 'undefined' && updates.description.length > 5000) {
        throw new Error('Item description must be 5000 characters or less.');
    }

    // Prepare the update object
    const updateFields: Partial<InventoryItem> = {
        ...updates,
        modifiedAt: new Date(),
    };

    // Trim string fields
    if (typeof updateFields.name !== 'undefined') {
        updateFields.name = updateFields.name.trim();
    }
    if (typeof updateFields.description !== 'undefined') {
        updateFields.description = updateFields.description.trim();
    }

    const result = await InventoryItemsCollection.updateAsync(
        { _id: itemId },
        {
            $set: updateFields,
        }
    );

    logger.log('Item updated', { itemId, updatedFields: Object.keys(updates), rowsAffected: result });

    return result;
};

/**
 * Safely update an inventory item with optimistic locking.
 *
 * @param item - The current state of the item (must include all CollectionItem fields)
 * @param updates - Fields to update (partial InventoryItem)
 * @returns Promise resolving to the number of items updated (0 if concurrent modification detected, 1 if successful)
 *
 * @remarks
 * Uses strictSelector to ensure the item hasn't been modified since it was read.
 * Returns 0 if the item was modified by another operation (caller should re-read and retry).
 * This is the optimistic locking pattern - useful for preventing race conditions in the UI.
 *
 * @example
 * ```typescript
 * const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
 * const result = await safelyUpdateInventoryItem(item, { name: 'New Name' });
 * if (result === 0) {
 *   // Item was modified by someone else, refresh and try again
 * }
 * ```
 */
export const safelyUpdateInventoryItem = async (
    item: InventoryItem,
    updates: Partial<Pick<InventoryItem, 'name' | 'description' | 'isContainer' | 'tagIds' | 'properties'>>
): Promise<number> => {
    // TODO: Implement optimistic locking version
    // This will use strictSelector(item, ['name', 'isContainer', 'containerId'])
    throw new Error('safelyUpdateInventoryItem not yet implemented');
};

/**
 * Move an item to a different container.
 *
 * @param itemId - ID of the item to move
 * @param targetContainerId - ID of the new parent container (null/undefined for root)
 * @returns Promise resolving to the number of items updated (0 or 1)
 *
 * @remarks
 * This method performs an unconditional move based on itemId only.
 * For optimistic locking (to prevent race conditions), use safelyMoveItem instead.
 * Validates:
 * - Target container exists and has isContainer: true
 * - Move does not create circular reference (item containing itself)
 */
export const moveItem = async (itemId: string, targetContainerId: string | null | undefined): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Normalize empty string and null to undefined
    const normalizedTargetId =
        typeof targetContainerId === 'undefined' || targetContainerId === null || targetContainerId === ''
            ? undefined
            : targetContainerId;

    // Validate target container if specified
    if (typeof normalizedTargetId !== 'undefined') {
        const targetContainer: InventoryItem | undefined = await InventoryItemsCollection.findOneAsync({
            _id: normalizedTargetId,
        });

        if (typeof targetContainer === 'undefined') {
            throw new RecordNotFoundException('Target container not found', { _id: normalizedTargetId });
        }

        if (!targetContainer.isContainer) {
            throw new Error('Target must be a container (isContainer: true).');
        }

        // Check for circular reference
        const wouldCreateCycle = await detectCircularReference(itemId, normalizedTargetId, InventoryItemsCollection);

        if (wouldCreateCycle) {
            throw new Error('Cannot move item: would create circular reference in container hierarchy.');
        }
    }

    // MongoDB doesn't support $set with undefined values
    // Use $unset to remove the field when moving to root, otherwise use $set
    const updateOp =
        typeof normalizedTargetId === 'undefined'
            ? {
                  $unset: { containerId: true as const },
                  $set: { modifiedAt: new Date() },
              }
            : {
                  $set: {
                      containerId: normalizedTargetId,
                      modifiedAt: new Date(),
                  },
              };

    const result = await InventoryItemsCollection.updateAsync({ _id: itemId }, updateOp);

    logger.log('Item moved', { itemId, from: item.containerId, to: normalizedTargetId, rowsAffected: result });

    return result;
};

/**
 * Safely move an item to a different container with optimistic locking.
 *
 * @param item - The current state of the item (must include all CollectionItem fields)
 * @param targetContainerId - ID of the new parent container (null/undefined for root)
 * @returns Promise resolving to the number of items updated (0 if concurrent modification detected, 1 if successful)
 *
 * @remarks
 * Uses strictSelector to ensure the item hasn't been modified since it was read.
 * Returns 0 if the item was modified by another operation (caller should re-read and retry).
 * This is the optimistic locking pattern - useful for preventing race conditions in the UI.
 *
 * @example
 * ```typescript
 * const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
 * const result = await safelyMoveItem(item, 'newContainerId');
 * if (result === 0) {
 *   // Item was moved by someone else, refresh and try again
 * }
 * ```
 */
export const safelyMoveItem = async (
    item: InventoryItem,
    targetContainerId: string | null | undefined
): Promise<number> => {
    // TODO: Implement optimistic locking version
    // This will use strictSelector(item, ['containerId'])
    throw new Error('safelyMoveItem not yet implemented');
};

/**
 * Delete an inventory item.
 *
 * @param itemId - ID of the item to delete
 * @returns Promise resolving to the number of items deleted (0 or 1)
 *
 * @remarks
 * This method performs an unconditional delete based on itemId only.
 * For optimistic locking (to prevent race conditions), use safelyDeleteInventoryItem instead.
 *
 * For containers (isContainer: true), this method only deletes the container itself.
 * Child items must be handled separately based on the deletion strategy:
 * - Option A: Move children to parent container and tag with "no container"
 * - Option B: Prompt user to select new container for children
 * - Option C: Recursively delete all children (with confirmation)
 *
 * The UI should implement the deletion strategy and handle children before calling this method.
 */
export const deleteInventoryItem = async (itemId: string): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Check if this is a container with children
    if (item.isContainer) {
        const childCount = await InventoryItemsCollection.find({ containerId: itemId }).countAsync();

        if (childCount > 0) {
            throw new Error(`Cannot delete container with ${childCount} child items. Move or delete children first.`);
        }
    }

    const result = await InventoryItemsCollection.removeAsync({ _id: itemId });

    logger.log('Item deleted', { itemId, name: item.name, isContainer: item.isContainer, rowsAffected: result });

    return result;
};

/**
 * Safely delete an inventory item with optimistic locking.
 *
 * @param item - The current state of the item (must include all CollectionItem fields)
 * @returns Promise resolving to the number of items deleted (0 if concurrent modification detected, 1 if successful)
 *
 * @remarks
 * Uses strictSelector to ensure the item hasn't been modified since it was read.
 * Returns 0 if the item was modified by another operation (caller should re-read and retry).
 * This is the optimistic locking pattern - useful for preventing accidental deletion of modified items.
 *
 * Still checks for children if the item is a container.
 *
 * @example
 * ```typescript
 * const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
 * const result = await safelyDeleteInventoryItem(item);
 * if (result === 0) {
 *   // Item was modified by someone else, refresh and confirm deletion
 * }
 * ```
 */
export const safelyDeleteInventoryItem = async (item: InventoryItem): Promise<number> => {
    // TODO: Implement optimistic locking version
    // This will use strictSelector(item, ['name', 'isContainer', 'containerId'])
    throw new Error('safelyDeleteInventoryItem not yet implemented');
};

/**
 * Get the breadcrumb path for an item (all ancestors from root to item).
 *
 * @param itemId - ID of the item to get path for
 * @returns Promise resolving to array of items in path order (root first, item last)
 *
 * @remarks
 * This is used to display breadcrumb navigation trails showing where an item is located.
 * The array starts with the root container and ends with the requested item.
 *
 * @example
 * ```typescript
 * // Garage > Shelf > Box > Item
 * const path = await getItemPath('item123');
 * // Returns: [Garage, Shelf, Box, Item]
 * ```
 */
export const getItemPath = async (itemId: string): Promise<InventoryItem[]> => {
    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Get ancestors (returns parent first, root last)
    const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

    // Reverse to get root first, and append the item itself
    return [...ancestors.reverse(), item];
};

// Publications (server-side only)
if (Meteor.isServer) {
    /**
     * Publish all items in the inventory.
     *
     * @returns Cursor for all inventory items
     *
     * @remarks
     * This publication is used for the main inventory view and global search.
     * Items are published with all fields for complete data access.
     */
    Meteor.publish('items.all', function publishAllItems() {
        logger.log('Publishing items.all');
        return InventoryItemsCollection.find({});
    });

    /**
     * Publish items within a specific container (direct children only).
     *
     * @param containerId - ID of the parent container (null/undefined for root items)
     * @returns Cursor for items in the specified container
     *
     * @remarks
     * This publication is used for browsing a specific container's contents.
     * Pass null or undefined to get root-level items (no container).
     * Does NOT include descendants in sub-containers (non-recursive).
     */
    Meteor.publish('items.byContainer', function publishItemsByContainer(containerId: string | null | undefined) {
        logger.log('Publishing items.byContainer', { containerId });

        // Normalize containerId (treat null, undefined, and empty string as "no container")
        const normalizedContainerId =
            typeof containerId === 'undefined' || containerId === null || containerId === '' ? undefined : containerId;

        // Find items with matching containerId
        return InventoryItemsCollection.find({
            containerId: normalizedContainerId,
        });
    });

    /**
     * Publish items that have any of the specified tags.
     *
     * @param tagIds - Array of tag IDs to filter by
     * @returns Cursor for items with matching tags
     *
     * @remarks
     * Returns items that have AT LEAST ONE of the specified tags.
     * Used for filtering items by tag selection.
     * Empty array returns no items.
     */
    Meteor.publish('items.byTags', function publishItemsByTags(tagIds: string[]) {
        logger.log('Publishing items.byTags', { tagIds });

        if (!Array.isArray(tagIds) || tagIds.length === 0) {
            return this.ready();
        }

        return InventoryItemsCollection.find({
            tagIds: { $in: tagIds },
        });
    });
}

export default asMeteorMethods(InventoryItemsCollection, {
    createItem: createInventoryItem,
    updateItem: updateInventoryItem,
    moveItem,
    deleteItem: deleteInventoryItem,
    getPath: getItemPath,
});
