import { assert } from 'chai';

import type { InventoryItem } from '/imports/model/InventoryItem';
import {
    getStructuredStorageLayoutKind,
    isDeclarativeStorageLayout,
    projectDeclarativeStorageItems,
    projectStackTowerItems,
    STACK_TOWER_MODEL_ID,
} from '/imports/model/StructuredStorageLayout';

const createItem = (id: string, tier?: number, position: 'left' | 'right' = 'left'): InventoryItem => ({
    _id: id,
    name: id,
    isContainer: true,
    tagIds: [],
    createdAt: new Date('2026-01-01'),
    modifiedAt: new Date('2026-01-01'),
    properties:
        tier === undefined ? undefined : { storagePlacement: { modelId: STACK_TOWER_MODEL_ID, tier, position } },
});

describe('StructuredStorageLayout', function () {
    it('projects placements by tier and side rather than input order', function () {
        const bottomRight = createItem('alphabetically-first', 4, 'right');
        const topLeft = createItem('alphabetically-last', 1, 'left');

        const projection = projectStackTowerItems([bottomRight, topLeft]);

        assert.equal(projection.tiers.length, 5);
        assert.equal(projection.tiers[0]?.slots.left, topLeft);
        assert.equal(projection.tiers[3]?.slots.right, bottomRight);
        assert.isUndefined(projection.tiers[4]?.slots.left);
        assert.isUndefined(projection.tiers[4]?.slots.right);
    });

    it('keeps duplicate, invalid, and unplaced records in the fallback', function () {
        const placed = createItem('placed', 1, 'left');
        const duplicate = createItem('duplicate', 1, 'left');
        const invalid = createItem('invalid', 8, 'right');
        const unplaced = createItem('unplaced');

        const projection = projectStackTowerItems([placed, duplicate, invalid, unplaced]);

        assert.equal(projection.tiers[0]?.slots.left, placed);
        assert.deepEqual(projection.fallbackItems, [duplicate, invalid, unplaced]);
    });

    it('projects declarative fixture children by slot and preserves rejected placements', function () {
        const layout = {
            modelId: 'grid-layout-v1',
            columns: 2,
            rows: 3,
            cells: [
                { slotId: 'drawer-1', label: 'Top drawer', row: 1, column: 1, kind: 'storage' as const },
                { slotId: 'false-front', label: 'False front', row: 1, column: 2, kind: 'non-storage' as const },
                {
                    slotId: 'cabinet',
                    label: 'Under-sink cabinet',
                    row: 2,
                    column: 2,
                    rowSpan: 2,
                    kind: 'storage' as const,
                },
            ],
        };
        const cabinet = {
            ...createItem('cabinet'),
            properties: { storagePlacement: { position: 'below sink', slotId: 'cabinet' } },
        };
        const drawer = {
            ...createItem('drawer'),
            properties: { storagePlacement: { position: 'left', slotId: 'drawer-1' } },
        };
        const duplicate = {
            ...createItem('duplicate'),
            properties: { storagePlacement: { position: 'left', slotId: 'drawer-1' } },
        };
        const assignedToNonStorage = {
            ...createItem('assigned-to-false-front'),
            properties: { storagePlacement: { position: 'right', slotId: 'false-front' } },
        };
        const unplaced = createItem('unplaced');

        const projection = projectDeclarativeStorageItems(layout, [
            cabinet,
            drawer,
            duplicate,
            assignedToNonStorage,
            unplaced,
        ]);

        assert.exists(projection);
        assert.equal(projection?.itemsBySlot.get('drawer-1'), drawer);
        assert.equal(projection?.itemsBySlot.get('cabinet'), cabinet);
        assert.deepEqual(projection?.fallbackItems, [duplicate, assignedToNonStorage, unplaced]);
    });

    it('rejects malformed or overlapping declarative layouts and keeps the ordinary list renderer', function () {
        const overlappingLayout = {
            modelId: 'grid-layout-v1',
            columns: 1,
            rows: 2,
            cells: [
                { slotId: 'first', label: 'First', row: 1, column: 1, rowSpan: 2, kind: 'storage' as const },
                { slotId: 'second', label: 'Second', row: 2, column: 1, kind: 'storage' as const },
            ],
        };
        const container = { ...createItem('fixture'), properties: { storageLayout: overlappingLayout } };

        assert.isFalse(isDeclarativeStorageLayout(overlappingLayout));
        assert.isUndefined(projectDeclarativeStorageItems(overlappingLayout, []));
        assert.isUndefined(getStructuredStorageLayoutKind(container, []));
    });
});
