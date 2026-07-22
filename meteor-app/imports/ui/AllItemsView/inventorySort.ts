/**
 * Pure sorting rules for the browsable inventory sheet.
 * Kept separate so Storybook, the Meteor container, and unit tests share one
 * deterministic definition without coupling sort behavior to React state.
 */
import type { InventoryItem } from '/imports/model/InventoryItem';
import { compareNaturalText } from '/imports/utility/naturalSort';

export const inventorySortOptions = [
    { value: 'name-asc', label: 'Name (A–Z)' },
    { value: 'name-desc', label: 'Name (Z–A)' },
    { value: 'updated-desc', label: 'Recently updated' },
    { value: 'updated-asc', label: 'Oldest updated' },
] as const;

export type InventorySortOption = (typeof inventorySortOptions)[number]['value'];

const compareContainerType = (first: InventoryItem, second: InventoryItem): number => {
    if (first.isContainer === second.isContainer) return 0;
    return first.isContainer ? -1 : 1;
};

const compareStableFallback = (first: InventoryItem, second: InventoryItem): number => {
    const byName = compareNaturalText(first.name, second.name);
    if (byName !== 0) return byName;
    return first.createdAt.getTime() - second.createdAt.getTime();
};

export const compareInventoryItems = (
    first: InventoryItem,
    second: InventoryItem,
    sortOption: InventorySortOption
): number => {
    if (sortOption === 'name-asc' || sortOption === 'name-desc') {
        const byContainerType = compareContainerType(first, second);
        if (byContainerType !== 0) return byContainerType;

        const byName = compareNaturalText(first.name, second.name);
        if (byName !== 0) return sortOption === 'name-desc' ? -byName : byName;
        return first.createdAt.getTime() - second.createdAt.getTime();
    }

    const byModifiedDate = first.modifiedAt.getTime() - second.modifiedAt.getTime();
    if (byModifiedDate !== 0) return sortOption === 'updated-desc' ? -byModifiedDate : byModifiedDate;

    return compareStableFallback(first, second);
};

export const sortInventoryItems = (items: InventoryItem[], sortOption: InventorySortOption): InventoryItem[] => {
    return [...items].sort((first, second) => compareInventoryItems(first, second, sortOption));
};
