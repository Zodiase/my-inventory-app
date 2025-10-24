import type { Filter } from 'mongodb';

import type InventoryItem from '/imports/model/InventoryItem';
import type SearchFragment from '/imports/model/SearchFragment';

/**
 * Build a MongoDB query from search fragments.
 *
 * @param fragments - Array of search fragments to combine with AND logic
 * @returns MongoDB query object that can be used with collection.find()
 *
 * @remarks
 * Multiple fragments are combined with AND logic - all fragments must match for
 * an item to be included in results.
 *
 * Special cases:
 * - Empty fragments array returns {} (matches all items)
 * - ContainerScopeFragment with null containerRootId is ignored (search all items)
 * - Multiple TagIncludeFragments require ALL tags (AND logic)
 * - Single TagIncludeFragment with multiple tagIds requires ANY tag (OR logic)
 *
 * @example
 * ```typescript
 * const fragments: SearchFragment[] = [
 *   { type: 'name', value: 'laptop' },
 *   { type: 'tagInclude', tagIds: ['electronics'] },
 *   { type: 'containerType', value: 'items' }
 * ];
 * const query = buildSearchQuery(fragments);
 * const results = await InventoryItemsCollection.find(query).fetchAsync();
 * ```
 */
export const buildSearchQuery = (fragments: SearchFragment[]): Filter<InventoryItem> => {
    if (fragments.length === 0) {
        return {};
    }

    const conditions: Filter<InventoryItem>[] = [];

    for (const fragment of fragments) {
        switch (fragment.type) {
            case 'name': {
                // Partial match, case-insensitive
                conditions.push({
                    name: {
                        $regex: fragment.value,
                        $options: 'i',
                    },
                } as Filter<InventoryItem>);
                break;
            }

            case 'tagInclude': {
                // Has ANY of the specified tags (OR logic within this fragment)
                conditions.push({
                    tagIds: {
                        $in: fragment.tagIds,
                    },
                } as Filter<InventoryItem>);
                break;
            }

            case 'tagExclude': {
                // Does NOT have any of the specified tags (NOR logic)
                conditions.push({
                    tagIds: {
                        $nin: fragment.tagIds,
                    },
                } as Filter<InventoryItem>);
                break;
            }

            case 'containerType': {
                // Filter by container type
                if (fragment.value === 'containers') {
                    conditions.push({
                        isContainer: true,
                    } as Filter<InventoryItem>);
                } else if (fragment.value === 'items') {
                    conditions.push({
                        isContainer: false,
                    } as Filter<InventoryItem>);
                }
                // 'all' means no filtering - don't add condition
                break;
            }

            case 'containerScope': {
                // Search within a specific container
                if (fragment.containerRootId !== null && fragment.containerRootId !== '') {
                    conditions.push({
                        containerId: fragment.containerRootId,
                    } as Filter<InventoryItem>);
                }
                // Null or empty means search all items - don't add condition
                break;
            }

            case 'property': {
                // Search in properties fields
                const fieldPath = `properties.${fragment.field}` as keyof InventoryItem;

                if (typeof fragment.value === 'number') {
                    // Exact match for numbers
                    conditions.push({
                        [fieldPath]: fragment.value,
                    } as Filter<InventoryItem>);
                } else {
                    // Partial match, case-insensitive for strings
                    conditions.push({
                        [fieldPath]: {
                            $regex: fragment.value,
                            $options: 'i',
                        },
                    } as Filter<InventoryItem>);
                }
                break;
            }
        }
    }

    // Combine all conditions with AND logic
    if (conditions.length === 0) {
        return {};
    }

    if (conditions.length === 1) {
        return conditions[0];
    }

    return {
        $and: conditions,
    } as Filter<InventoryItem>;
};

/**
 * Get all items within a container hierarchy (container and all descendants).
 *
 * @param containerRootId - The root container ID to search within
 * @returns MongoDB query matching items in the container tree
 *
 * @remarks
 * This searches recursively through the container hierarchy. It will match:
 * - Items directly in the specified container
 * - Items in sub-containers at any depth
 *
 * For a non-recursive search (only direct children), use ContainerScopeFragment instead.
 *
 * @example
 * ```typescript
 * const query = buildContainerHierarchyQuery('box-123');
 * const allItemsInBox = await InventoryItemsCollection.find(query).fetchAsync();
 * ```
 */
export const buildContainerHierarchyQuery = (containerRootId: string): Filter<InventoryItem> => {
    // TODO: Implement recursive container search when container hierarchy depth tracking is added
    // For now, only searches direct children
    return {
        containerId: containerRootId,
    } as Filter<InventoryItem>;
};

export default buildSearchQuery;
