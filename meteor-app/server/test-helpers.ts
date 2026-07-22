/**
 * Test helper methods for E2E testing.
 * These methods are only available in development/test mode.
 */

import type { IncomingMessage, ServerResponse } from 'http';

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { Attachments } from '/imports/api/attachments';
import Items, { InventoryItemsCollection } from '/imports/api/items';
import Tags, { createTag } from '/imports/api/tags';

// HTTP status codes
const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const MAX_SCANNING_FIXTURE_ITEMS = 500;
const SCANNING_FIXTURE_CONTAINER_COUNT = 2;
const SCANNING_FIXTURE_DESCRIPTION_INTERVAL = 3;
const SCANNING_FIXTURE_MULTI_TAG_INTERVAL = 5;
const SCANNING_FIXTURE_SINGLE_TAG_INTERVAL = 2;
const SCANNING_FIXTURE_YEAR = 2026;
const SCANNING_FIXTURE_MONTH = 0;
const SCANNING_FIXTURE_DAY_RANGE = 28;

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

        async 'test.seedInventoryScanningFixture'(standardItemCount: number): Promise<{
            totalCount: number;
            containerCount: number;
            itemCount: number;
        }> {
            assertTestDatabaseMutationAllowed();

            if (
                !Number.isInteger(standardItemCount) ||
                standardItemCount < 1 ||
                standardItemCount > MAX_SCANNING_FIXTURE_ITEMS
            ) {
                throw new Meteor.Error('invalid-argument', 'standardItemCount must be an integer from 1 to 500');
            }

            const toolsTagId = await createTag({ name: 'Tools' });
            const storageTagId = await createTag({ name: 'Storage' });
            const now = new Date('2026-01-01T00:00:00.000Z');
            const containerCount = SCANNING_FIXTURE_CONTAINER_COUNT;

            await Promise.all([
                InventoryItemsCollection.insertAsync({
                    name: 'Garage',
                    description: 'Workshop and storage area',
                    isContainer: true,
                    tagIds: [storageTagId],
                    createdAt: now,
                    modifiedAt: now,
                }),
                InventoryItemsCollection.insertAsync({
                    name: 'Utility Closet',
                    description: 'Household supplies and tools',
                    isContainer: true,
                    tagIds: [storageTagId, toolsTagId],
                    createdAt: now,
                    modifiedAt: now,
                }),
            ]);

            await Promise.all(
                Array.from({ length: standardItemCount }, async (_, index) => {
                    const itemNumber = index + 1;
                    return await InventoryItemsCollection.insertAsync({
                        name:
                            itemNumber === 1
                                ? 'A very long inventory name that must truncate predictably at desktop tablet and phone widths'
                                : `Inventory item ${itemNumber}`,
                        description:
                            itemNumber % SCANNING_FIXTURE_DESCRIPTION_INTERVAL === 0
                                ? `Comparison description for item ${itemNumber}`
                                : undefined,
                        isContainer: false,
                        tagIds:
                            itemNumber % SCANNING_FIXTURE_MULTI_TAG_INTERVAL === 0
                                ? [toolsTagId, storageTagId]
                                : itemNumber % SCANNING_FIXTURE_SINGLE_TAG_INTERVAL === 0
                                ? [storageTagId]
                                : [],
                        createdAt: now,
                        modifiedAt: new Date(
                            Date.UTC(
                                SCANNING_FIXTURE_YEAR,
                                SCANNING_FIXTURE_MONTH,
                                (itemNumber % SCANNING_FIXTURE_DAY_RANGE) + 1
                            )
                        ),
                    });
                })
            );

            return {
                totalCount: standardItemCount + containerCount,
                containerCount,
                itemCount: standardItemCount,
            };
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
}
