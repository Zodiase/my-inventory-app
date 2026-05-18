import assert from 'assert';

import type InventoryItem from '/imports/model/InventoryItem';

import strictSelector from './strictSelector';

describe('strictSelector', function () {
    const createdAt = new Date('2026-05-18T01:02:03.000Z');
    const modifiedAt = new Date('2026-05-18T04:05:06.000Z');

    const testItem: InventoryItem = {
        _id: 'item-1',
        createdAt,
        modifiedAt,
        name: 'Cordless Drill',
        description: undefined,
        containerId: 'container-1',
        isContainer: false,
        tagIds: ['tag-1', 'tag-2'],
    };

    it('includes only base collection fields by default', function () {
        const selector = strictSelector(testItem);

        assert.deepStrictEqual(selector, {
            _id: 'item-1',
            createdAt,
            modifiedAt,
        });
        assert.strictEqual(Object.prototype.hasOwnProperty.call(selector, 'name'), false);
    });

    it('includes requested extra fields from the source document', function () {
        const selector = strictSelector(testItem, ['name', 'containerId', 'isContainer', 'tagIds']);

        assert.deepStrictEqual(selector, {
            _id: 'item-1',
            createdAt,
            modifiedAt,
            name: 'Cordless Drill',
            containerId: 'container-1',
            isContainer: false,
            tagIds: ['tag-1', 'tag-2'],
        });
    });

    it('preserves requested optional fields with undefined values', function () {
        const selector = strictSelector(testItem, ['description']);

        assert.deepStrictEqual(selector, {
            _id: 'item-1',
            createdAt,
            modifiedAt,
            description: undefined,
        });
        assert.strictEqual(Object.prototype.hasOwnProperty.call(selector, 'description'), true);
    });
});
