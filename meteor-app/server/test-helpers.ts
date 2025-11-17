/**
 * Test helper methods for E2E testing.
 * These methods are only available in development/test mode.
 */

import { Meteor } from 'meteor/meteor';
import Items from '/imports/api/items';
import Tags from '/imports/api/tags';
import { Attachments } from '/imports/api/attachments';

/**
 * Reset all collections to empty state.
 * WARNING: This deletes ALL data! Only use in test environments.
 */
async function resetDatabase(): Promise<void> {
    // Only allow in development mode
    if (Meteor.isProduction) {
        throw new Meteor.Error('not-allowed', 'Cannot reset database in production');
    }

    // Remove all documents from all collections
    await Items.removeAsync({});
    await Tags.removeAsync({});
    await Attachments.removeAsync({});

    // TODO: Also clear GridFS files when attachments are implemented
}

// Export methods only in development
if (!Meteor.isProduction) {
    Meteor.methods({
        /**
         * Reset the database for testing.
         * Only available in development mode.
         */
        async 'test.resetDatabase'(): Promise<void> {
            await resetDatabase();
        },
    });
}
