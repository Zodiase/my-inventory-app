import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { InventoryItemsCollection } from '/imports/api/items';
import type InventoryItem from '/imports/model/InventoryItem';
import type NoId from '/imports/utility/NoId';

import { detectCircularReference, getAncestorChain } from './circularReference';

describe('circularReference', function () {
    const bindEnvironment = Meteor.bindEnvironment.bind(Meteor);

    // Test session tracer for cleanup
    const TracerKey = '_testing';
    const tracer = {
        [TracerKey]: {
            session: Random.id(),
        },
    };

    // Helper to create test items
    const createTestItem = async (name: string, isContainer: boolean, containerId?: string): Promise<string> => {
        const now = new Date();
        const item: NoId<InventoryItem> & Record<string, unknown> = {
            name,
            isContainer,
            tagIds: [],
            containerId,
            createdAt: now,
            modifiedAt: now,
            ...tracer,
        };

        return await InventoryItemsCollection.insertAsync(item);
    };

    this.beforeAll(
        bindEnvironment(async () => {
            // Clean up any existing test data
            await InventoryItemsCollection.removeAsync({
                [TracerKey]: { $exists: true },
            });
        })
    );

    this.afterAll(
        bindEnvironment(async () => {
            // Clean up all test data
            await InventoryItemsCollection.removeAsync(tracer);
        })
    );

    describe('detectCircularReference', function () {
        it('returns false when target is undefined', async function () {
            const itemId = await createTestItem('Item', false);

            const result = await detectCircularReference(itemId, undefined, InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns false when target is null', async function () {
            const itemId = await createTestItem('Item', false);

            const result = await detectCircularReference(itemId, null, InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns false when target is empty string', async function () {
            const itemId = await createTestItem('Item', false);

            const result = await detectCircularReference(itemId, '', InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns true when item equals target (direct circular reference)', async function () {
            const itemId = await createTestItem('Container', true);

            const result = await detectCircularReference(itemId, itemId, InventoryItemsCollection);

            assert.strictEqual(result, true);
        });

        it('returns false when moving to unrelated container', async function () {
            const container1Id = await createTestItem('Container 1', true);
            const container2Id = await createTestItem('Container 2', true);
            const itemId = await createTestItem('Item', false, container1Id);

            const result = await detectCircularReference(itemId, container2Id, InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns true when moving container into its direct child', async function () {
            const parentId = await createTestItem('Parent Container', true);
            const childId = await createTestItem('Child Container', true, parentId);

            const result = await detectCircularReference(parentId, childId, InventoryItemsCollection);

            assert.strictEqual(result, true);
        });

        it('returns true when moving container into its descendant (nested)', async function () {
            // Garage > Shelf > Box
            const garageId = await createTestItem('Garage', true);
            const shelfId = await createTestItem('Shelf', true, garageId);
            const boxId = await createTestItem('Box', true, shelfId);

            // Try to move Garage into Box (would create cycle)
            const result = await detectCircularReference(garageId, boxId, InventoryItemsCollection);

            assert.strictEqual(result, true);
        });

        it('returns false when moving child container to sibling', async function () {
            // Parent > Child1, Child2
            const parentId = await createTestItem('Parent', true);
            const child1Id = await createTestItem('Child 1', true, parentId);
            const child2Id = await createTestItem('Child 2', true, parentId);

            // Move Child1 into Child2 (no cycle)
            const result = await detectCircularReference(child1Id, child2Id, InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns false when target container does not exist', async function () {
            const itemId = await createTestItem('Item', false);
            const nonExistentId = 'nonexistent123';

            const result = await detectCircularReference(itemId, nonExistentId, InventoryItemsCollection);

            assert.strictEqual(result, false);
        });

        it('returns true when database already has circular reference', async function () {
            // Create containers with circular reference (bypass validation)
            const container1Id = await createTestItem('Container 1', true);
            const container2Id = await createTestItem('Container 2', true, container1Id);

            // Manually create circular reference
            await InventoryItemsCollection.updateAsync({ _id: container1Id }, { $set: { containerId: container2Id } });

            // Detection should find the existing cycle
            const result = await detectCircularReference(container1Id, container2Id, InventoryItemsCollection);

            assert.strictEqual(result, true);
        });
    });

    describe('getAncestorChain', function () {
        it('returns empty array for item at root', async function () {
            const itemId = await createTestItem('Root Item', false);

            const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

            assert.strictEqual(ancestors.length, 0);
        });

        it('returns empty array for non-existent item', async function () {
            const ancestors = await getAncestorChain('nonexistent123', InventoryItemsCollection);

            assert.strictEqual(ancestors.length, 0);
        });

        it('returns single ancestor for item with direct parent', async function () {
            const parentId = await createTestItem('Parent', true);
            const childId = await createTestItem('Child', false, parentId);

            const ancestors = await getAncestorChain(childId, InventoryItemsCollection);

            assert.strictEqual(ancestors.length, 1);
            assert.strictEqual(ancestors[0]._id, parentId);
            assert.strictEqual(ancestors[0].name, 'Parent');
        });

        it('returns full ancestor chain in correct order', async function () {
            // Garage > Shelf > Box > Item
            const garageId = await createTestItem('Garage', true);
            const shelfId = await createTestItem('Shelf', true, garageId);
            const boxId = await createTestItem('Box', true, shelfId);
            const itemId = await createTestItem('Item', false, boxId);

            const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

            // Should return: [Box, Shelf, Garage] (parent first, root last)
            assert.strictEqual(ancestors.length, 3);
            assert.strictEqual(ancestors[0]._id, boxId);
            assert.strictEqual(ancestors[0].name, 'Box');
            assert.strictEqual(ancestors[1]._id, shelfId);
            assert.strictEqual(ancestors[1].name, 'Shelf');
            assert.strictEqual(ancestors[2]._id, garageId);
            assert.strictEqual(ancestors[2].name, 'Garage');
        });

        it('handles broken reference in chain', async function () {
            // Create item with containerId that doesn't exist
            const itemId = await createTestItem('Item', false, 'nonexistent123');

            const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

            // Should return empty array (can't follow broken reference)
            assert.strictEqual(ancestors.length, 0);
        });

        it('stops at circular reference in existing data', async function () {
            // Create containers with circular reference
            const container1Id = await createTestItem('Container 1', true);
            const container2Id = await createTestItem('Container 2', true, container1Id);

            // Manually create circular reference
            await InventoryItemsCollection.updateAsync({ _id: container1Id }, { $set: { containerId: container2Id } });

            const itemId = await createTestItem('Item', false, container2Id);

            const ancestors = await getAncestorChain(itemId, InventoryItemsCollection);

            // Should detect cycle and stop (prevents infinite loop)
            assert.ok(ancestors.length > 0);
            assert.ok(ancestors.length < 100); // Sanity check - not infinite
        });
    });
});
