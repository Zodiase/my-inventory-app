/**
 * Pure projection of inventory children into supported physical storage slots.
 * It keeps placement validation deterministic and preserves every rejected or
 * duplicate record for a visible fallback instead of silently dropping data.
 */
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { StorageLayoutCell, StorageLayoutDefinition } from '/imports/model/PropertyValues';
import type { StoragePosition } from '/imports/model/StorageLayout';

export const STACK_TOWER_MODEL_ID = 'stack-tower-2col-5tier-v1';
export const STACK_TOWER_TIER_COUNT = 5;
export const STACK_TOWER_POSITIONS: StoragePosition[] = ['left', 'right'];
export const VANITY_FIXTURE_TYPE = 'sink vanity';
export const TOILET_RACK_FIXTURE_TYPE = 'over-toilet shelving rack';
export const VANITY_DRAWER_COUNT = 3;
export const TOILET_RACK_SHELF_COUNT = 4;

export type StructuredStorageLayoutKind = 'declarative' | 'stack-tower' | 'vanity' | 'over-toilet-rack';

export interface StructuredStorageTier {
    tier: number;
    slots: Record<StoragePosition, InventoryItem | undefined>;
}

export interface StructuredStorageProjection {
    tiers: StructuredStorageTier[];
    fallbackItems: InventoryItem[];
}

export interface VanityStorageProjection {
    leftDrawers: Array<InventoryItem | undefined>;
    underSink: InventoryItem | undefined;
    fallbackItems: InventoryItem[];
}

export interface ShelfStorageProjection {
    shelves: Array<InventoryItem | undefined>;
    fallbackItems: InventoryItem[];
}

export interface DeclarativeStorageProjection {
    layout: StorageLayoutDefinition & { columns: number; rows: number; cells: StorageLayoutCell[] };
    cells: StorageLayoutCell[];
    itemsBySlot: Map<string, InventoryItem>;
    fallbackItems: InventoryItem[];
}

const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;

/** Return true only for complete, non-overlapping grid definitions that are safe to render. */
export const isDeclarativeStorageLayout = (
    layout: StorageLayoutDefinition | undefined
): layout is StorageLayoutDefinition & { columns: number; rows: number; cells: StorageLayoutCell[] } => {
    if (
        layout === undefined ||
        !isPositiveInteger(layout.columns) ||
        !isPositiveInteger(layout.rows) ||
        !Array.isArray(layout.cells) ||
        layout.cells.length === 0
    ) {
        return false;
    }

    const slotIds = new Set<string>();
    const occupiedCoordinates = new Set<string>();

    for (const cell of layout.cells) {
        const rowSpan = cell.rowSpan ?? 1;
        const columnSpan = cell.columnSpan ?? 1;
        const cellKind: unknown = cell.kind;
        if (
            typeof cell.slotId !== 'string' ||
            cell.slotId.trim() === '' ||
            slotIds.has(cell.slotId) ||
            typeof cell.label !== 'string' ||
            cell.label.trim() === '' ||
            !isPositiveInteger(cell.row) ||
            !isPositiveInteger(cell.column) ||
            !isPositiveInteger(rowSpan) ||
            !isPositiveInteger(columnSpan) ||
            cell.row + rowSpan - 1 > layout.rows ||
            cell.column + columnSpan - 1 > layout.columns ||
            (cellKind !== 'storage' && cellKind !== 'non-storage')
        ) {
            return false;
        }

        slotIds.add(cell.slotId);
        for (let row = cell.row; row < cell.row + rowSpan; row += 1) {
            for (let column = cell.column; column < cell.column + columnSpan; column += 1) {
                const coordinate = `${row}:${column}`;
                if (occupiedCoordinates.has(coordinate)) return false;
                occupiedCoordinates.add(coordinate);
            }
        }
    }

    return true;
};

/** Project children into declarative storage cells without hiding rejected or duplicate placements. */
export const projectDeclarativeStorageItems = (
    layout: StorageLayoutDefinition | undefined,
    items: InventoryItem[]
): DeclarativeStorageProjection | undefined => {
    if (!isDeclarativeStorageLayout(layout)) return undefined;

    const storageSlotIds = new Set(layout.cells.filter((cell) => cell.kind === 'storage').map((cell) => cell.slotId));
    const itemsBySlot = new Map<string, InventoryItem>();
    const fallbackItems: InventoryItem[] = [];

    for (const item of items) {
        const slotId = item.properties?.storagePlacement?.slotId;
        if (slotId !== undefined && storageSlotIds.has(slotId) && !itemsBySlot.has(slotId)) {
            itemsBySlot.set(slotId, item);
        } else {
            fallbackItems.push(item);
        }
    }

    return { layout, cells: layout.cells, itemsBySlot, fallbackItems };
};

export const getStructuredStorageLayoutKind = (
    container: InventoryItem | undefined,
    items: InventoryItem[]
): StructuredStorageLayoutKind | undefined => {
    if (isDeclarativeStorageLayout(container?.properties?.storageLayout)) return 'declarative';
    if (container?.properties?.fixtureType === VANITY_FIXTURE_TYPE) return 'vanity';
    if (container?.properties?.fixtureType === TOILET_RACK_FIXTURE_TYPE) return 'over-toilet-rack';
    if (container?.properties?.storageLayout?.modelId === STACK_TOWER_MODEL_ID) return 'stack-tower';
    if (items.some((item) => item.properties?.storagePlacement?.modelId === STACK_TOWER_MODEL_ID)) {
        return 'stack-tower';
    }

    return undefined;
};

export const hasStackTowerLayout = (container: InventoryItem | undefined, items: InventoryItem[]): boolean => {
    return getStructuredStorageLayoutKind(container, items) === 'stack-tower';
};

export const projectStackTowerItems = (items: InventoryItem[]): StructuredStorageProjection => {
    const tiers: StructuredStorageTier[] = Array.from({ length: STACK_TOWER_TIER_COUNT }, (_, index) => ({
        tier: index + 1,
        slots: { left: undefined, right: undefined },
    }));
    const fallbackItems: InventoryItem[] = [];

    for (const item of items) {
        const placement = item.properties?.storagePlacement;
        const tier = placement?.tier;
        const position = placement?.position;
        const isValidPlacement =
            placement?.modelId === STACK_TOWER_MODEL_ID &&
            tier !== undefined &&
            Number.isInteger(tier) &&
            tier >= 1 &&
            tier <= STACK_TOWER_TIER_COUNT &&
            (position === 'left' || position === 'right');

        if (!isValidPlacement) {
            fallbackItems.push(item);
            continue;
        }

        const projectedTier = tiers[tier - 1];
        if (projectedTier.slots[position] !== undefined) {
            fallbackItems.push(item);
            continue;
        }

        projectedTier.slots[position] = item;
    }

    return { tiers, fallbackItems };
};

export const projectVanityItems = (items: InventoryItem[]): VanityStorageProjection => {
    const leftDrawers: Array<InventoryItem | undefined> = Array.from({ length: VANITY_DRAWER_COUNT });
    let underSink: InventoryItem | undefined = undefined;
    const fallbackItems: InventoryItem[] = [];

    for (const item of items) {
        const placement = item.properties?.storagePlacement;
        if (
            placement?.position === 'left' &&
            placement.tier !== undefined &&
            placement.tier >= 1 &&
            placement.tier <= VANITY_DRAWER_COUNT
        ) {
            const index = placement.tier - 1;
            if (leftDrawers[index] === undefined) leftDrawers[index] = item;
            else fallbackItems.push(item);
        } else if (placement?.position === 'below sink' && underSink === undefined) {
            underSink = item;
        } else {
            fallbackItems.push(item);
        }
    }

    return { leftDrawers, underSink, fallbackItems };
};

export const projectToiletRackItems = (items: InventoryItem[]): ShelfStorageProjection => {
    const shelves: Array<InventoryItem | undefined> = Array.from({ length: TOILET_RACK_SHELF_COUNT });
    const fallbackItems: InventoryItem[] = [];

    for (const item of items) {
        const tier = item.properties?.storagePlacement?.tier;
        if (tier !== undefined && tier >= 1 && tier <= TOILET_RACK_SHELF_COUNT && shelves[tier - 1] === undefined) {
            shelves[tier - 1] = item;
        } else {
            fallbackItems.push(item);
        }
    }

    return { shelves, fallbackItems };
};
