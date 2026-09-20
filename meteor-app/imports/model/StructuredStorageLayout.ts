/**
 * Pure projection of inventory children into supported physical storage slots.
 * It keeps placement validation deterministic and preserves every rejected or
 * duplicate record for a visible fallback instead of silently dropping data.
 */
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { StoragePosition } from '/imports/model/StorageLayout';

export const STACK_TOWER_MODEL_ID = 'stack-tower-2col-5tier-v1';
export const STACK_TOWER_TIER_COUNT = 5;
export const STACK_TOWER_POSITIONS: StoragePosition[] = ['left', 'right'];

export interface StructuredStorageTier {
    tier: number;
    slots: Record<StoragePosition, InventoryItem | undefined>;
}

export interface StructuredStorageProjection {
    tiers: StructuredStorageTier[];
    fallbackItems: InventoryItem[];
}

export const hasStackTowerLayout = (container: InventoryItem | undefined, items: InventoryItem[]): boolean => {
    if (container?.properties?.storageLayout?.modelId === STACK_TOWER_MODEL_ID) return true;

    return items.some((item) => item.properties?.storagePlacement?.modelId === STACK_TOWER_MODEL_ID);
};

export const projectStackTowerItems = (items: InventoryItem[]): StructuredStorageProjection => {
    const tiers: StructuredStorageTier[] = Array.from({ length: STACK_TOWER_TIER_COUNT }, (_, index) => ({
        tier: index + 1,
        slots: { left: undefined, right: undefined },
    }));
    const fallbackItems: InventoryItem[] = [];

    for (const item of items) {
        const placement = item.properties?.storagePlacement;
        const isValidPlacement =
            placement?.modelId === STACK_TOWER_MODEL_ID &&
            Number.isInteger(placement.tier) &&
            placement.tier >= 1 &&
            placement.tier <= STACK_TOWER_TIER_COUNT &&
            STACK_TOWER_POSITIONS.includes(placement.position);

        if (!isValidPlacement) {
            fallbackItems.push(item);
            continue;
        }

        const tier = tiers[placement.tier - 1];
        if (tier.slots[placement.position] !== undefined) {
            fallbackItems.push(item);
            continue;
        }

        tier.slots[placement.position] = item;
    }

    return { tiers, fallbackItems };
};
