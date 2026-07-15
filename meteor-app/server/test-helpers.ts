/**
 * Test helper methods for E2E testing.
 * These methods are only available in development/test mode.
 */

import type { IncomingMessage, ServerResponse } from 'http';

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { Attachments } from '/imports/api/attachments';
import Items from '/imports/api/items';
import Tags from '/imports/api/tags';

import { clearAttachmentStorage } from './attachmentService';
import { countGridFSFiles } from './gridfs';

// HTTP status codes
const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const TEST_RESET_ENABLED = process.env.E2E_RESET_DATABASE === '1';

type TestHttpHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
type WebAppWithHandlers = typeof WebApp & {
    handlers: {
        use: (path: string, handler: TestHttpHandler) => void;
    };
};

const webAppWithHandlers = WebApp as WebAppWithHandlers;

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

const assertTestDatabaseMutationAllowed = (): void => {
    if (Meteor.isProduction) {
        throw new Meteor.Error('not-allowed', 'Cannot mutate test database in production');
    }

    if (!TEST_RESET_ENABLED) {
        throw new Meteor.Error('not-allowed', 'Test database mutation is only enabled for explicit E2E test runs');
    }

    const mongoUrl = process.env.MONGO_URL;
    if (mongoUrl !== undefined && mongoUrl !== '' && !isThrowawayMeteorMongoUrl(mongoUrl)) {
        throw new Meteor.Error('not-allowed', 'Refusing to mutate a non-test Mongo database');
    }
};

/**
 * Reset all collections to empty state.
 * WARNING: This deletes ALL data! Only use in test environments.
 */
async function resetDatabase(): Promise<void> {
    assertTestDatabaseMutationAllowed();

    // Remove blobs before their item records so failed cleanup remains retryable.
    await clearAttachmentStorage();
    await Items.removeAsync({});
    await Tags.removeAsync({});
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

        async 'test.forceItemContainer'(itemId: string, containerId: string): Promise<number> {
            assertTestDatabaseMutationAllowed();

            if (itemId.trim() === '' || containerId.trim() === '') {
                throw new Meteor.Error('invalid-argument', 'itemId and containerId are required');
            }

            return await Items.updateAsync(
                { _id: itemId },
                {
                    $set: {
                        containerId,
                        modifiedAt: new Date(),
                    },
                }
            );
        },
    });

    /**
     * HTTP endpoint for resetting the database in E2E tests.
     * This allows tests to reset without needing Meteor.call().
     * Only available in development mode.
     */
    webAppWithHandlers.handlers.use('/api/test/reset-database', async (req, res) => {
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

    /**
     * Storage-level attachment counts for E2E lifecycle assertions.
     * Kept behind the same explicit throwaway-database guard as reset.
     */
    webAppWithHandlers.handlers.use('/api/test/attachment-storage', async (req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(HTTP_METHOD_NOT_ALLOWED, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }));
            return;
        }

        try {
            assertTestDatabaseMutationAllowed();
            const [metadataCount, fileCount] = await Promise.all([
                Attachments.find({}).countAsync(),
                countGridFSFiles(),
            ]);
            res.writeHead(HTTP_OK, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({ metadataCount, fileCount }));
        } catch (error) {
            res.writeHead(HTTP_INTERNAL_SERVER_ERROR, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
        }
    });
}
