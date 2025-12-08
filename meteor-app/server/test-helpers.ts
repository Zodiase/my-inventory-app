/**
 * Test helper methods for E2E testing.
 * These methods are only available in development/test mode.
 */

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { Attachments } from '/imports/api/attachments';
import Items from '/imports/api/items';
import Tags from '/imports/api/tags';

// HTTP status codes
const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_SERVER_ERROR = 500;

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

    /**
     * HTTP endpoint for resetting the database in E2E tests.
     * This allows tests to reset without needing Meteor.call().
     * Only available in development mode.
     */
    WebApp.connectHandlers.use('/api/test/reset-database', async (req, res) => {
        // Only allow POST requests
        if (req.method !== 'POST') {
            res.writeHead(HTTP_METHOD_NOT_ALLOWED, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
            return;
        }

        try {
            await resetDatabase();
            res.writeHead(HTTP_OK, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(HTTP_INTERNAL_SERVER_ERROR, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
        }
    });
}
