import { Meteor } from 'meteor/meteor';

import { InventoryItemsCollection, createInventoryItem } from '/imports/api/items';
import { TagsCollection, createTag, watchAndFixMissingPath } from '/imports/api/tags';
import { Attachments } from '/imports/api/attachments';
import createLogger from '/imports/utility/Logger';

import { initializeGridFS } from './gridfs';

const logger = createLogger(module);

Meteor.startup(async () => {
    Meteor.settings.fixPath = true;

    // Initialize GridFS bucket for file storage (T009)
    initializeGridFS();

    // Create database indexes for performance
    logger.log('Creating database indexes...');

    // Items collection indexes (T006)
    await InventoryItemsCollection._ensureIndex({ name: 1 }); // Text search
    await InventoryItemsCollection._ensureIndex({ tagIds: 1 }); // Tag filtering
    await InventoryItemsCollection._ensureIndex({ containerId: 1 }); // Hierarchy queries
    await InventoryItemsCollection._ensureIndex({ isContainer: 1 }); // Filter containers vs items
    await InventoryItemsCollection._ensureIndex({ 'properties.make': 1 }); // Property search
    await InventoryItemsCollection._ensureIndex({ 'properties.model': 1 }); // Property search
    await InventoryItemsCollection._ensureIndex({ modifiedAt: -1 }); // Recently modified

    // Tags collection indexes (T007)
    await TagsCollection._ensureIndex({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }); // Case-insensitive unique
    await TagsCollection._ensureIndex({ path: 1 }); // Hierarchy queries

    // Attachments collection indexes (T008)
    await Attachments._ensureIndex({ itemId: 1, order: 1 }); // Ordered list per item
    await Attachments._ensureIndex({ itemId: 1, type: 1 }); // Filter by type
    await Attachments._ensureIndex({ fileId: 1 }); // GridFS lookup

    logger.log('Database indexes created successfully');

    // Sample data creation
    if ((await InventoryItemsCollection.find().countAsync()) === 0) {
        await createInventoryItem({ name: 'Sample item 1' });
        await createInventoryItem({ name: 'Sample item 2' });
        await createInventoryItem({ name: 'Sample item 3' });
        await createInventoryItem({ name: 'Sample item 4' });
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
