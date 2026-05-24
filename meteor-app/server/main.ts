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

    watchAndFixMissingPath().catch((reason: unknown) => {
        logger.warn('Error starting watching for tags without path.', reason);
    });
});
