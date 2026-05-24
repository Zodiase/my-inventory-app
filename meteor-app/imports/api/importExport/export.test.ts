import assert from 'assert';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { parseCsv } from '/imports/model/importExport/csv';
import { parseJson } from '/imports/model/importExport/json';

import { exportJson, exportCsv } from './export';

describe('Server Export Methods', function () {
    beforeEach(async function () {
        await InventoryItemsCollection.removeAsync({});
        await TagsCollection.removeAsync({});
    });

    it('exports JSON and CSV successfully', async function () {
        // Seed tags
        const categoryId = await TagsCollection.insertAsync({
            name: 'Category',
            parentTagId: '',
            path: [{ _id: 'temp1', name: 'Category' }],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });
        const toolsId = await TagsCollection.insertAsync({
            name: 'Tools',
            parentTagId: categoryId,
            path: [
                { _id: categoryId, name: 'Category' },
                { _id: 'temp2', name: 'Tools' },
            ],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });
        const collectionId = await TagsCollection.insertAsync({
            name: 'Collection',
            parentTagId: '',
            path: [{ _id: 'temp3', name: 'Collection' }],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });
        const workshopId = await TagsCollection.insertAsync({
            name: 'Workshop',
            parentTagId: collectionId,
            path: [
                { _id: collectionId, name: 'Collection' },
                { _id: 'temp4', name: 'Workshop' },
            ],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });
        const plainTagId = await TagsCollection.insertAsync({
            name: 'Heavy',
            parentTagId: '',
            path: [{ _id: 'temp5', name: 'Heavy' }],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });

        // Seed containers
        const houseId = await InventoryItemsCollection.insertAsync({
            name: 'House',
            isContainer: true,
            tagIds: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });
        const garageId = await InventoryItemsCollection.insertAsync({
            name: 'Garage',
            containerId: houseId,
            isContainer: true,
            tagIds: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        });

        // Seed items
        await InventoryItemsCollection.insertAsync({
            name: 'Hammer',
            isContainer: false,
            containerId: garageId,
            tagIds: [toolsId, workshopId, plainTagId],
            createdAt: new Date(),
            modifiedAt: new Date(),
            properties: {
                make: 'Stanley',
            },
        });

        const jsonOut = await exportJson();
        const state = parseJson(jsonOut);
        assert.strictEqual(state.items.length, 3); // House, Garage, Hammer
        assert.strictEqual(state.tags.length, 5);

        const csvOut = await exportCsv({ umrCompat: true });
        const rows = parseCsv(csvOut);

        assert.strictEqual(rows.length, 3); // House, Garage, Hammer
        const hammerRow = rows.find((r) => r.name === 'Hammer');
        assert.ok(hammerRow);
        assert.strictEqual(hammerRow.category, 'Tools');
        assert.strictEqual(hammerRow.collection, 'Workshop');
        assert.deepStrictEqual(hammerRow.tags, ['Heavy']);
        assert.strictEqual(hammerRow.location, 'House → Garage');
        assert.strictEqual(hammerRow.make, 'Stanley');
    });
});
