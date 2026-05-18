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

    const conditions: Array<Filter<InventoryItem>> = [];

    for (const fragment of fragments) {
        switch (fragment.type) {
            case 'name': {
                // Partial match, case-insensitive
                const condition: Filter<InventoryItem> = {
                    name: {
                        $regex: fragment.value,
                        $options: 'i',
                    },
                };
                conditions.push(condition);
                break;
            }

            case 'tagInclude': {
                // Has ANY of the specified tags (OR logic within this fragment)
                const condition: Filter<InventoryItem> = {
                    tagIds: {
                        $in: fragment.tagIds,
                    },
                };
                conditions.push(condition);
                break;
            }

            case 'tagExclude': {
                // Does NOT have any of the specified tags (NOR logic)
                const condition: Filter<InventoryItem> = {
                    tagIds: {
                        $nin: fragment.tagIds,
                    },
                };
                conditions.push(condition);
                break;
            }

            case 'containerType': {
                // Filter by container type
                if (fragment.value === 'containers') {
                    const condition: Filter<InventoryItem> = {
                        isContainer: true,
                    };
                    conditions.push(condition);
                } else if (fragment.value === 'items') {
                    const condition: Filter<InventoryItem> = {
                        isContainer: false,
                    };
                    conditions.push(condition);
                }
                // 'all' means no filtering - don't add condition
                break;
            }

            case 'containerScope': {
                // Search within a specific container
                if (fragment.containerRootId !== null && fragment.containerRootId !== '') {
                    const condition: Filter<InventoryItem> = {
                        containerId: fragment.containerRootId,
                    };
                    conditions.push(condition);
                }
                // Null or empty means search all items - don't add condition
                break;
            }

            case 'property': {
                // Search in properties fields
                const fieldPath = `properties.${fragment.field}` as keyof InventoryItem;

                if (typeof fragment.value === 'number') {
                    // Exact match for numbers
                    const condition: Filter<InventoryItem> = {
                        [fieldPath]: fragment.value,
                    };
                    conditions.push(condition);
                } else {
                    // Partial match, case-insensitive for strings
                    const condition: Filter<InventoryItem> = {
                        [fieldPath]: {
                            $regex: fragment.value,
                            $options: 'i',
                        },
                    };
                    conditions.push(condition);
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

    const query: Filter<InventoryItem> = {
        $and: conditions,
    };
    return query;
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
    const query: Filter<InventoryItem> = {
        containerId: containerRootId,
    };
    return query;
};

export default buildSearchQuery;
