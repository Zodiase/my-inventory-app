import { Meteor } from 'meteor/meteor';

import { InventoryItemsCollection, createInventoryItem } from '/imports/api/items';
import { LinksCollection } from '/imports/api/links';
import { TagsCollection, createTag } from '/imports/api/tags';
import createLogger from '/imports/utility/Logger';

const logger = createLogger(module);

async function insertLink({ title, url }: { title: string; url: string }): Promise<void> {
    await LinksCollection.insertAsync({ title, url, createdAt: new Date() });
}

Meteor.startup(async () => {
    Meteor.settings.fixPath = true;

    // If the Links collection is empty, add some data.
    if ((await LinksCollection.find().countAsync()) === 0) {
        await insertLink({
            title: 'Do the Tutorial',
            url: 'https://www.meteor.com/tutorials/react/creating-an-app',
        });

        await insertLink({
            title: 'Follow the Guide',
            url: 'https://guide.meteor.com',
        });

        await insertLink({
            title: 'Read the Docs',
            url: 'https://docs.meteor.com',
        });

        await insertLink({
            title: 'Discussions',
            url: 'https://forums.meteor.com',
        });
    }

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

    TagsCollection.watchAndFixMissingPath().catch((reason) => {
        logger.warn('Error starting watching for tags without path.', reason);
    });
});
