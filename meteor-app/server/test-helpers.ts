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

const TEST_RESET_ENABLED = process.env.E2E_RESET_DATABASE === '1';

const isThrowawayMeteorMongoUrl = (mongoUrl: string): boolean => {
    try {
        const { hostname, pathname, port } = new URL(mongoUrl);
        const isLocalHost =
            hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
        return isLocalHost && port !== '' && pathname === '/meteor';
    } catch {
        return false;
    }
};

/**
 * Reset all collections to empty state.
 * WARNING: This deletes ALL data! Only use in test environments.
 */
async function resetDatabase(): Promise<void> {
    // Only allow in development mode
    if (Meteor.isProduction) {
        throw new Meteor.Error('not-allowed', 'Cannot reset database in production');
    }

    if (!TEST_RESET_ENABLED) {
        throw new Meteor.Error('not-allowed', 'Database reset is only enabled for explicit E2E test runs');
    }

    const mongoUrl = process.env.MONGO_URL;
    if (mongoUrl !== undefined && mongoUrl !== '' && !isThrowawayMeteorMongoUrl(mongoUrl)) {
        throw new Meteor.Error('not-allowed', 'Refusing to reset a non-test Mongo database');
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
