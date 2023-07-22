import { Meteor } from 'meteor/meteor';

import InventoryItemsCollection from '/imports/api/items';
import TagsCollection from '/imports/api/tags';
import createLogger from '/imports/utility/Logger';

const logger = createLogger(module);

Meteor.startup(async () => {
    Meteor.settings.fixPath = true;

    if ((await InventoryItemsCollection.find().countAsync()) === 0) {
        for (let i = 0; i < 100; i++) {
            await InventoryItemsCollection.createItem({ name: `Sample item ${i + 1}` });
        }
    }

    if ((await TagsCollection.find().countAsync()) === 0) {
        const tag1Id = await TagsCollection.createTag({ name: 'Sample tag 1' });
        const tag2Id = await TagsCollection.createTag({ name: 'Sample tag 2' });
        await TagsCollection.createTag({ name: 'Sample child tag 1-1', parentTagId: tag1Id });
        await TagsCollection.createTag({ name: 'Sample child tag 1-2', parentTagId: tag1Id });
        await TagsCollection.createTag({ name: 'Sample child tag 2-1', parentTagId: tag2Id });
        await TagsCollection.createTag({ name: 'Sample child tag 2-2', parentTagId: tag2Id });
    }

    TagsCollection.watchAndFixMissingPath().catch((reason) => {
        logger.warn('Error starting watching for tags without path.', reason);
    });
});
