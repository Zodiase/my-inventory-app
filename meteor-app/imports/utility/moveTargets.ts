import type { InventoryItem } from '/imports/model/InventoryItem';

const getBlockedMoveTargetIds = (containers: InventoryItem[], itemId: string | undefined): Set<string> => {
    const blockedIds = new Set<string>();
    if (itemId === undefined) return blockedIds;

    blockedIds.add(itemId);

    let didAddDescendant = true;
    while (didAddDescendant) {
        didAddDescendant = false;

        for (const container of containers) {
            if (blockedIds.has(container._id)) continue;
            if (container.containerId !== undefined && blockedIds.has(container.containerId)) {
                blockedIds.add(container._id);
                didAddDescendant = true;
            }
        }
    }

    return blockedIds;
};

export const getValidMoveTargetContainers = (
    containers: InventoryItem[],
    itemId: string | undefined
): InventoryItem[] => {
    const blockedIds = getBlockedMoveTargetIds(containers, itemId);
    return containers.filter((container) => !blockedIds.has(container._id));
};
