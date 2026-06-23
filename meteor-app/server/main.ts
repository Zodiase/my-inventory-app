import { Meteor } from 'meteor/meteor';

import { Attachments } from '/imports/api/attachments';
// Import specific exports AND register methods via side-effect imports
import {
    InventoryItemsCollection,
    createInventoryItem,
    // Side-effect: registers createItem, updateItem, deleteItem, etc.
} from '/imports/api/items';
import {
    TagsCollection,
    createTag,
    watchAndFixMissingPath,
    // Side-effect: registers createTag, updateTag, deleteTag, etc.
} from '/imports/api/tags';
import createLogger from '/imports/utility/Logger';

import { initializeGridFS } from './gridfs';
import '/imports/api/importExport/export';
import '/imports/api/importExport/import';

import './test-helpers'; // Test helper methods for E2E testing

const logger = createLogger(module);

Meteor.startup(async () => {
    Meteor.settings.fixPath = true;

    // Initialize GridFS bucket for file storage (T009)
    initializeGridFS();

    // Create database indexes for performance
    logger.log('Creating database indexes...');

    // Items collection indexes (T006)
    await InventoryItemsCollection.createIndexAsync({ name: 1 }); // Text search
    await InventoryItemsCollection.createIndexAsync({ tagIds: 1 }); // Tag filtering
    await InventoryItemsCollection.createIndexAsync({ containerId: 1 }); // Hierarchy queries
    await InventoryItemsCollection.createIndexAsync({ isContainer: 1 }); // Filter containers vs items
    await InventoryItemsCollection.createIndexAsync({ 'properties.make': 1 }); // Property search
    await InventoryItemsCollection.createIndexAsync({ 'properties.model': 1 }); // Property search
    await InventoryItemsCollection.createIndexAsync({ modifiedAt: -1 }); // Recently modified

    // Tags collection indexes (T007)
    await TagsCollection.createIndexAsync({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }); // Case-insensitive unique
    await TagsCollection.createIndexAsync({ path: 1 }); // Hierarchy queries

    // Attachments collection indexes (T008)
    await Attachments.createIndexAsync({ itemId: 1, order: 1 }); // Ordered list per item
    await Attachments.createIndexAsync({ itemId: 1, type: 1 }); // Filter by type
    await Attachments.createIndexAsync({ fileId: 1 }); // GridFS lookup

    logger.log('Database indexes created successfully');

    // Sample data creation
    const SAMPLE_ITEMS_COUNT = 100;
    if ((await InventoryItemsCollection.find().countAsync()) === 0) {
        for (let i = 1; i <= SAMPLE_ITEMS_COUNT; i++) {
            await createInventoryItem({ name: `Sample item ${i}` });
        }
    }

    if ((await TagsCollection.find().countAsync()) === 0) {
        const tag1Id = await createTag({ name: 'Sample tag 1' });
        const tag2Id = await createTag({ name: 'Sample tag 2' });
        await createTag({ name: 'Sample child tag 1-1', parentTagId: tag1Id });
        await createTag({ name: 'Sample child tag 1-2', parentTagId: tag1Id });
        await createTag({ name: 'Sample child tag 2-1', parentTagId: tag2Id });
        await createTag({ name: 'Sample child tag 2-2', parentTagId: tag2Id });
    }

    if (Meteor.isDevelopment && (await InventoryItemsCollection.find({ isContainer: true }).countAsync()) === 0) {
        let createdRecordsCount = 0;

        const tag1 = await TagsCollection.findOneAsync({ name: 'Sample tag 1' });
        const childTag = await TagsCollection.findOneAsync({ name: 'Sample child tag 1-1' });

        const tagIds: string[] = [];
        if (typeof tag1 !== 'undefined') {
            tagIds.push(tag1._id);
        }
        if (typeof childTag !== 'undefined') {
            tagIds.push(childTag._id);
        }

        const garageId = await createInventoryItem({ name: 'Garage', isContainer: true });
        createdRecordsCount++;
        const officeId = await createInventoryItem({ name: 'Office', isContainer: true });
        createdRecordsCount++;
        const kitchenId = await createInventoryItem({ name: 'Kitchen', isContainer: true });
        createdRecordsCount++;
        await createInventoryItem({ name: 'Spare Room', isContainer: true });
        createdRecordsCount++;

        const toolboxId = await createInventoryItem({ name: 'Toolbox', isContainer: true, containerId: garageId });
        createdRecordsCount++;

        await createInventoryItem({
            name: 'Lawnmower',
            description: 'Gas powered lawnmower',
            containerId: garageId,
            properties: { make: 'Honda', model: 'HRX217' },
        });
        createdRecordsCount++;
        await createInventoryItem({ name: 'Snow Shovel', containerId: garageId });
        createdRecordsCount++;

        await createInventoryItem({ name: 'Hammer', containerId: toolboxId });
        createdRecordsCount++;
        await createInventoryItem({
            name: 'Screwdriver Set',
            description: 'Phillips and Flathead',
            containerId: toolboxId,
        });
        createdRecordsCount++;
        await createInventoryItem({ name: 'Wrench', containerId: toolboxId, tagIds });
        createdRecordsCount++;

        await createInventoryItem({ name: 'Desk Chair', description: 'Ergonomic office chair', containerId: officeId });
        createdRecordsCount++;
        await createInventoryItem({
            name: 'A very long item name that exceeds typical lengths and should be truncated by the UI to verify that our CSS text-overflow properties are working correctly across all views',
            containerId: officeId,
            properties: { make: 'Generic', model: 'Long Name Edition' },
        });
        createdRecordsCount++;

        await createInventoryItem({
            name: 'Blender',
            description: 'High speed blender',
            containerId: kitchenId,
            properties: { make: 'Vitamix', model: '5200' },
        });
        createdRecordsCount++;
        await createInventoryItem({ name: 'Toaster', containerId: kitchenId });
        createdRecordsCount++;
        await createInventoryItem({ name: 'Coffee Maker', containerId: kitchenId, tagIds });
        createdRecordsCount++;

        logger.log(`Seeded ${createdRecordsCount} rich fixture items for development audit.`);
    }

    watchAndFixMissingPath().catch((reason: unknown) => {
        logger.warn('Error starting watching for tags without path.', reason);
    });
});
