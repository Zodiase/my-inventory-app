import assert from 'assert';
import { Meteor } from 'meteor/meteor';

import { loadFixture } from '/imports/api/importExport/fixtureLoader';
import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { serializeJson } from '/imports/model/importExport/json';

import { importCsv, importJson } from './import';

describe('importExport/import', function () {
    beforeEach(async function () {
        await InventoryItemsCollection.removeAsync({});
        await TagsCollection.removeAsync({});
    });

    describe('importCsv', function () {
        it('imports UMR sample and matches exact expectations', async function () {
            const csvText = loadFixture('under-my-roof-sample.csv');

            // dry run
            const dryReport = await importCsv(csvText, { dryRun: true, umrCompat: true });
            assert.strictEqual(dryReport.toCreate >= 130, true, 'dryRun finds >=130 to create');
            assert.strictEqual(
                await InventoryItemsCollection.find({ isContainer: false }).countAsync(),
                0,
                'dry-run never writes to db'
            );

            // real run
            const report = await importCsv(csvText, { dryRun: false, umrCompat: true });
            assert.strictEqual(
                report.toCreate,
                dryReport.toCreate,
                'real run produces exactly the number of new records the dry-run predicted'
            );
            assert.strictEqual(
                await InventoryItemsCollection.find({ isContainer: false }).countAsync(),
                report.toCreate,
                'records created in DB match report'
            );

            // UMR sentinels become empty
            const items = await InventoryItemsCollection.find({ isContainer: false }).fetchAsync();
            const hasSentinels = items.some(
                (i) => i.properties?.make === '(unspecified)' || i.properties?.condition === '(unspecified)'
            );
            assert.strictEqual(hasSentinels, false, 'UMR sentinels become empty');

            // Category tags check
            const catRoot = await TagsCollection.findOneAsync({ name: 'Category' });
            assert.ok(catRoot, 'Category root tag exists');
            const categories = await TagsCollection.find({ parentTagId: catRoot._id }).fetchAsync();
            assert.strictEqual(categories.length >= 10, true, '>= 10 unique categories');

            // Collection tags check
            const colRoot = await TagsCollection.findOneAsync({ name: 'Collection' });
            assert.ok(colRoot, 'Collection root tag exists');
            const collections = await TagsCollection.find({ parentTagId: colRoot._id }).fetchAsync();
            assert.strictEqual(collections.length >= 1, true, '>= 1 unique collections');
        });
    });

    describe('importJson', function () {
        it('timestamp preservation and round-trip no-op', async function () {
            const exactDate = new Date('2017-11-02T10:00:00.000Z');
            await InventoryItemsCollection.insertAsync({
                name: 'Test Timestamp',
                createdAt: exactDate,
                modifiedAt: exactDate,
                isContainer: false,
                tagIds: [],
            });

            const items = await InventoryItemsCollection.find().fetchAsync();
            const jsonStr = serializeJson({ items, tags: [] });

            const dryReport = await importJson(jsonStr, { dryRun: true });
            assert.strictEqual(dryReport.exactDuplicates, 1, 'reports 1 exact duplicate');
            assert.strictEqual(dryReport.toCreate, 0, 'creates nothing');

            const report = await importJson(jsonStr, { dryRun: false });
            assert.strictEqual(report.exactDuplicates, 1, 'reports 1 exact duplicate');
            assert.strictEqual(report.toCreate, 0, 'creates nothing');

            await InventoryItemsCollection.removeAsync(items[0]._id);
            const report2 = await importJson(jsonStr, { dryRun: false });
            assert.strictEqual(report2.toCreate, 1);

            const newlyCreated = await InventoryItemsCollection.findOneAsync({ name: 'Test Timestamp' });
            assert.ok(newlyCreated);
            assert.strictEqual(newlyCreated.createdAt.toISOString(), exactDate.toISOString(), 'timestamp preserved');
        });

        it('exercises the inventory.export.json method wrapper', async function () {
            const exactDate = new Date('2024-01-01T10:00:00.000Z');
            await InventoryItemsCollection.insertAsync({
                name: 'Method Wrapper Test',
                createdAt: exactDate,
                modifiedAt: exactDate,
                isContainer: false,
                tagIds: [],
            });

            // Call the Meteor method
            const jsonStr = (await Meteor.callAsync('inventory.export.json')) as string;

            // Pass the result into importJson
            const report = await importJson(jsonStr, { dryRun: true });
            assert.strictEqual(report.exactDuplicates, 1, 'reports 1 exact duplicate');
            assert.strictEqual(report.toCreate, 0, 'creates nothing');
        });
    });
});
