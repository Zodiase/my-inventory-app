import { assert } from 'chai';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { projectStackTowerItems, STACK_TOWER_MODEL_ID } from '/imports/model/StructuredStorageLayout';

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
});
