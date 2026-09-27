/**
 * Inventory CRUD and hierarchy rules shared by the UI and server integrations.
 * Optional expected snapshots make integration corrections conditional at the database write.
 */
import { Meteor } from 'meteor/meteor';
import type { Mongo } from 'meteor/mongo';

import type InventoryItem from '/imports/model/InventoryItem';
import { MAX_ITEM_DESCRIPTION_LENGTH, MAX_ITEM_NAME_LENGTH } from '/imports/model/ItemConstants';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import type { SearchFragment } from '/imports/model/SearchFragment';
import detectCircularReference, { getAncestorChain } from '/imports/utility/circularReference';
import createLogger from '/imports/utility/Logger';
import asMeteorMethods from '/imports/utility/MeteorMethods';
import { NamedCollection } from '/imports/utility/NamedCollection';
import type NoId from '/imports/utility/NoId';
import type RecordInput from '/imports/utility/RecordInput';
import { buildSearchQuery } from '/imports/utility/searchQuery';
// import strictSelector from '/imports/utility/strictSelector'; // Will be used by safely* methods

export type { InventoryItem } from '/imports/model/InventoryItem';

const logger = createLogger(module);
const MAX_CONTAINER_SUBSCRIPTION_IDS = 100;

export const InventoryItemsCollection = new NamedCollection<InventoryItem>('items');

let hierarchyMutationTail = Promise.resolve();

/** Serialize hierarchy mutations so parent validation and writes share one boundary. */
export const withInventoryHierarchyMutationLock = async <T>(operation: () => Promise<T>): Promise<T> => {
    let release: () => void = () => undefined;
    const previous = hierarchyMutationTail;
    hierarchyMutationTail = new Promise<void>((resolve) => {
        release = resolve;
    });
    await previous;
    try {
        return await operation();
    } finally {
        release();
    }
};

export interface InventoryDeletionMetadata {
    requestId: string;
    source: { system: string; reference: string };
    note?: string;
    deletedAt?: Date;
}

/** Add the canonical active-record predicate to an inventory selector. */
export const activeInventoryItemSelector = (
    selector: Mongo.Selector<InventoryItem> = {}
): Mongo.Selector<InventoryItem> => ({ ...selector, deletedAt: { $exists: false } });

export const snapshotSelector = (item: InventoryItem): Mongo.Selector<InventoryItem> => ({
    _id: item._id,
    name: item.name,
    description: item.description ?? { $exists: false },
    containerId: item.containerId ?? { $exists: false },
    isContainer: item.isContainer,
    locked: item.locked ?? { $in: [false, undefined] },
    $expr: { $eq: ['$tagIds', { $literal: item.tagIds }] },
    properties: item.properties ?? { $exists: false },
    deletedAt: item.deletedAt ?? { $exists: false },
    deletedByRequestId: item.deletedByRequestId ?? { $exists: false },
    deletedBy: item.deletedBy ?? { $exists: false },
    deletionNote: item.deletionNote ?? { $exists: false },
    createdAt: item.createdAt,
    modifiedAt: item.modifiedAt,
});

export const createInventoryItem = async (
    itemInput: RecordInput<InventoryItem>,
    assignedId?: string
): Promise<string> =>
    await withInventoryHierarchyMutationLock(async () => {
        const { name, description, containerId, isContainer = false, tagIds = [], properties } = itemInput;

        if (typeof name === 'undefined' || name.trim() === '') {
            throw new Error('Item must have a name.');
        }

        // Validate name length
        if (name.length > MAX_ITEM_NAME_LENGTH) {
            throw new Error(`Item name must be ${MAX_ITEM_NAME_LENGTH} characters or less.`);
        }

        // Validate description length if provided
        if (typeof description !== 'undefined' && description.length > MAX_ITEM_DESCRIPTION_LENGTH) {
            throw new Error(`Item description must be ${MAX_ITEM_DESCRIPTION_LENGTH} characters or less.`);
        }

        // Validate containerId if provided
        if (typeof containerId !== 'undefined' && containerId !== '') {
            const parentContainer = await InventoryItemsCollection.findOneAsync(
                activeInventoryItemSelector({ _id: containerId })
            );

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

        const itemId = await InventoryItemsCollection.insertAsync(
            assignedId === undefined ? newItem : { ...newItem, _id: assignedId }
        );

        logger.log('Item created', { itemId, name: newItem.name, isContainer });

        return itemId;
    });

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
    updates: Partial<Pick<InventoryItem, 'name' | 'description' | 'isContainer' | 'tagIds' | 'properties'>>,
    expected?: InventoryItem
): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: itemId }));

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Validate updates
    if (typeof updates.name !== 'undefined') {
        if (updates.name.trim() === '') {
            throw new Error('Item name cannot be empty.');
        }
        if (updates.name.length > MAX_ITEM_NAME_LENGTH) {
            throw new Error(`Item name must be ${MAX_ITEM_NAME_LENGTH} characters or less.`);
        }
    }

    if (typeof updates.description !== 'undefined' && updates.description.length > MAX_ITEM_DESCRIPTION_LENGTH) {
        throw new Error(`Item description must be ${MAX_ITEM_DESCRIPTION_LENGTH} characters or less.`);
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
        expected === undefined ? { _id: itemId } : snapshotSelector(expected),
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
    _item: InventoryItem,
    _updates: Partial<Pick<InventoryItem, 'name' | 'description' | 'isContainer' | 'tagIds' | 'properties'>>
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
export const moveItem = async (
    itemId: string,
    targetContainerId: string | null | undefined,
    expected?: InventoryItem
): Promise<number> =>
    await withInventoryHierarchyMutationLock(async () => {
        const item = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: itemId }));

        if (typeof item === 'undefined') {
            throw new RecordNotFoundException('Item not found', { _id: itemId });
        }

        if (item.locked === true) throw new Error('Cannot move locked item. Unlock it first.');

        // Normalize empty string and null to undefined
        const normalizedTargetId =
            typeof targetContainerId === 'undefined' || targetContainerId === null || targetContainerId === ''
                ? undefined
                : targetContainerId;

        // Validate target container if specified
        if (typeof normalizedTargetId !== 'undefined') {
            const targetContainer: InventoryItem | undefined = await InventoryItemsCollection.findOneAsync(
                activeInventoryItemSelector({ _id: normalizedTargetId })
            );

            if (typeof targetContainer === 'undefined') {
                throw new RecordNotFoundException('Target container not found', { _id: normalizedTargetId });
            }

            if (!targetContainer.isContainer) {
                throw new Error('Target must be a container (isContainer: true).');
            }

            // Check for circular reference
            const wouldCreateCycle = await detectCircularReference(
                itemId,
                normalizedTargetId,
                InventoryItemsCollection
            );

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

        const result = await InventoryItemsCollection.updateAsync(
            expected === undefined ? { _id: itemId } : snapshotSelector(expected),
            updateOp
        );

        logger.log('Item moved', { itemId, from: item.containerId, to: normalizedTargetId, rowsAffected: result });

        return result;
    });

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
    _item: InventoryItem,
    _targetContainerId: string | null | undefined
): Promise<number> => {
    // TODO: Implement optimistic locking version
    // This will use strictSelector(item, ['containerId'])
    throw new Error('safelyMoveItem not yet implemented');
};

/**
 * Logically delete an inventory item through a version-checked tombstone update.
 *
 * @param itemId - ID of the item to delete
 * @returns Promise resolving to the number of records marked deleted (0 or 1)
 */
export const logicalDeleteInventoryItem = async (
    item: InventoryItem,
    metadata: InventoryDeletionMetadata
): Promise<number> =>
    await withInventoryHierarchyMutationLock(async () => {
        if (item.deletedAt !== undefined) throw new Error('Item is already deleted.');
        if (item.locked === true) throw new Error('Cannot delete locked item. Unlock it first.');

        if (item.isContainer) {
            const childCount = await InventoryItemsCollection.find(
                activeInventoryItemSelector({ containerId: item._id })
            ).countAsync();

            if (childCount > 0) {
                throw new Error(
                    `Cannot delete container with ${childCount} child items. Move or delete children first.`
                );
            }
        }

        const deletedAt = metadata.deletedAt ?? new Date();
        const result = await InventoryItemsCollection.updateAsync(activeInventoryItemSelector(snapshotSelector(item)), {
            $set: {
                deletedAt,
                deletedByRequestId: metadata.requestId,
                deletedBy: metadata.source,
                ...(metadata.note === undefined ? {} : { deletionNote: metadata.note }),
                modifiedAt: deletedAt,
            },
        });

        logger.log('Item logically deleted', {
            itemId: item._id,
            name: item.name,
            isContainer: item.isContainer,
            requestId: metadata.requestId,
            rowsAffected: result,
        });

        return result;
    });

/** UI deletion entrypoint; agent deletion calls the same conditional tombstone operation. */
export const deleteInventoryItem = async (itemId: string): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: itemId }));
    if (typeof item === 'undefined') throw new RecordNotFoundException('Item not found', { _id: itemId });
    return await logicalDeleteInventoryItem(item, {
        requestId: `ui-delete-${item._id}-${item.modifiedAt.getTime()}`,
        source: { system: 'inventory-ui', reference: 'items.deleteItem' },
    });
};

/** Deliberate maintenance lookup that includes logically deleted records. */
export const getInventoryItemForAudit = async (itemId: string): Promise<InventoryItem | undefined> =>
    await InventoryItemsCollection.findOneAsync({ _id: itemId });

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
export const safelyDeleteInventoryItem = async (item: InventoryItem): Promise<number> =>
    await logicalDeleteInventoryItem(item, {
        requestId: `safe-delete-${item._id}-${item.modifiedAt.getTime()}`,
        source: { system: 'inventory-api', reference: 'safelyDeleteInventoryItem' },
    });

/** Change only the dedicated structural lock state; metadata and contents remain editable. */
export const setInventoryItemLocked = async (itemId: string, locked: boolean): Promise<number> => {
    const item = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: itemId }));
    if (typeof item === 'undefined') throw new RecordNotFoundException('Item not found', { _id: itemId });
    return await InventoryItemsCollection.updateAsync(activeInventoryItemSelector({ _id: itemId }), {
        $set: { locked, modifiedAt: new Date() },
    });
};

export const lockInventoryItem = async (itemId: string): Promise<number> => await setInventoryItemLocked(itemId, true);
export const unlockInventoryItem = async (itemId: string): Promise<number> =>
    await setInventoryItemLocked(itemId, false);

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
    const item = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: itemId }));

    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Get ancestors (returns parent first, root last)
    const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

    // Reverse to get root first, and append the item itself
    return [...ancestors.reverse(), item];
};

/**
 * Search for items using flexible search fragments.
 *
 * @param fragments - Array of search fragments to combine with AND logic
 * @returns Promise resolving to array of matching items
 *
 * @remarks
 * This method uses the buildSearchQuery utility to convert search fragments
 * into MongoDB queries. Multiple fragments are combined with AND logic.
 *
 * Supported fragment types:
 * - name: Partial, case-insensitive name search
 * - tagInclude: Items must have specified tags
 * - tagExclude: Items must NOT have specified tags
 * - containerType: Filter by container vs item
 * - containerScope: Search within specific container hierarchy
 * - property: Search by custom property values
 *
 * @example
 * ```typescript
 * // Search for laptops with "electronics" tag
 * const results = await searchItems([
 *   { type: 'name', value: 'laptop' },
 *   { type: 'tagInclude', tagIds: ['electronics123'] }
 * ]);
 * ```
 */
export const searchItems = async (fragments: SearchFragment[]): Promise<InventoryItem[]> => {
    if (!Array.isArray(fragments)) {
        throw new Error('Search fragments must be an array');
    }

    const scopeFragments = fragments.filter(
        (fragment) =>
            fragment.type === 'containerScope' && fragment.containerRootId !== null && fragment.containerRootId !== ''
    );
    const nonScopeFragments = fragments.filter((fragment) => fragment.type !== 'containerScope');
    const conditions: Array<Mongo.Selector<InventoryItem>> = [];
    const baseQuery = buildSearchQuery(nonScopeFragments) as Mongo.Selector<InventoryItem>;

    if (Object.keys(baseQuery).length > 0) {
        conditions.push(baseQuery);
    }

    for (const fragment of scopeFragments) {
        if (fragment.type === 'containerScope' && fragment.containerRootId !== null) {
            const scopedContainerIds = await getContainerScopeIds(fragment.containerRootId);
            conditions.push({ containerId: { $in: scopedContainerIds } });
        }
    }

    const query = activeInventoryItemSelector(
        conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions }
    );

    logger.log('Searching items', { fragments, query });

    // Execute query and return results
    return await InventoryItemsCollection.find(query).fetchAsync();
};

const getContainerScopeIds = async (containerRootId: string): Promise<string[]> => {
    const scopedContainerIds = new Set<string>([containerRootId]);
    let pendingContainerIds = [containerRootId];

    while (pendingContainerIds.length > 0) {
        const childContainers = await InventoryItemsCollection.find(
            activeInventoryItemSelector({
                containerId: { $in: pendingContainerIds },
                isContainer: true,
            })
        ).fetchAsync();

        pendingContainerIds = childContainers
            .map((container) => container._id)
            .filter((containerId) => !scopedContainerIds.has(containerId));

        pendingContainerIds.forEach((containerId) => scopedContainerIds.add(containerId));
    }

    return Array.from(scopedContainerIds);
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
        return InventoryItemsCollection.find(activeInventoryItemSelector());
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

        // Include all containers so scoped item views can still build breadcrumbs and parent labels.
        return InventoryItemsCollection.find(
            activeInventoryItemSelector({
                $or: [
                    normalizedContainerId === undefined
                        ? { $or: [{ containerId: { $exists: false } }, { containerId: { $type: 'null' } }] }
                        : { containerId: normalizedContainerId },
                    { isContainer: true },
                ],
            })
        );
    });

    /** Publish direct children for logical containers projected into their parent's view. */
    Meteor.publish('items.byContainers', function publishItemsByContainers(containerIds: unknown) {
        if (
            !Array.isArray(containerIds) ||
            containerIds.length > MAX_CONTAINER_SUBSCRIPTION_IDS ||
            containerIds.some((containerId) => typeof containerId !== 'string' || containerId === '')
        ) {
            throw new Meteor.Error('invalid-container-ids', 'Container IDs must be an array of non-empty strings.');
        }

        if (containerIds.length === 0) {
            this.ready();
            return;
        }

        return InventoryItemsCollection.find(activeInventoryItemSelector({ containerId: { $in: containerIds } }));
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
            this.ready();
            return;
        }

        return InventoryItemsCollection.find(
            activeInventoryItemSelector({
                $or: [{ tagIds: { $in: tagIds } }, { isContainer: true }],
            })
        );
    });

    /**
     * Publish a single item by its ID.
     *
     * @param itemId - ID of the item to publish
     * @returns Cursor for the specified item
     */
    Meteor.publish('items.byId', function publishItemById(itemId: string) {
        logger.log('Publishing items.byId', { itemId });

        if (typeof itemId !== 'string' || itemId.trim() === '') {
            this.ready();
            return;
        }

        return InventoryItemsCollection.find(activeInventoryItemSelector({ _id: itemId }));
    });
}

export default asMeteorMethods(InventoryItemsCollection, {
    createItem: async (itemInput: RecordInput<InventoryItem>) => await createInventoryItem(itemInput),
    updateItem: updateInventoryItem,
    moveItem,
    deleteItem: deleteInventoryItem,
    lockItem: lockInventoryItem,
    unlockItem: unlockInventoryItem,
    getPath: getItemPath,
    search: searchItems,
});
