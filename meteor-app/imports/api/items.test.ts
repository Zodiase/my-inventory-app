import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import {
    InventoryItemsCollection,
    createInventoryItem,
    updateInventoryItem,
    moveItem,
    deleteInventoryItem,
    getItemPath,
} from './items';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import type InventoryItem from '/imports/model/InventoryItem';
import type NoId from '/imports/utility/NoId';

describe('items', function () {
    const bindEnvironment = Meteor.bindEnvironment.bind(Meteor);

    // Test session tracer for cleanup
    const TracerKey = '_testing';
    const tracer = {
        [TracerKey]: {
            session: Random.id(),
        },
    };

    // Helper to create test items directly in DB
    const createTestItemDirect = async (name: string, isContainer: boolean, containerId?: string): Promise<string> => {
        const now = new Date();
        const item: NoId<InventoryItem> & { [key: string]: unknown } = {
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

    this.afterEach(
        bindEnvironment(async () => {
            // Clean up test data after each test
            await InventoryItemsCollection.removeAsync(tracer);
        })
    );

    describe('createInventoryItem', function () {
        it('creates a simple item with only name', async function () {
            const itemId = await createInventoryItem({ name: 'Test Item' });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.name, 'Test Item');
            assert.strictEqual(item.isContainer, false);
            assert.deepStrictEqual(item.tagIds, []);
            assert.strictEqual(item.containerId, undefined);
        });

        it('creates a container item', async function () {
            const itemId = await createInventoryItem({ name: 'Box', isContainer: true });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.isContainer, true);
        });

        it('creates an item with description', async function () {
            const itemId = await createInventoryItem({
                name: 'Test Item',
                description: 'This is a test description',
            });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.description, 'This is a test description');
        });

        it('creates an item inside a container', async function () {
            const containerId = await createTestItemDirect('Container', true);

            const itemId = await createInventoryItem({
                name: 'Item',
                containerId,
            });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.containerId, containerId);
        });

        it('creates an item with tags', async function () {
            const itemId = await createInventoryItem({
                name: 'Test Item',
                tagIds: ['tag1', 'tag2'],
            });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.deepStrictEqual(item.tagIds, ['tag1', 'tag2']);
        });

        it('creates an item with properties', async function () {
            const itemId = await createInventoryItem({
                name: 'Laptop',
                properties: {
                    make: 'Apple',
                    model: 'MacBook Pro',
                    serialNumber: '123456',
                },
            });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.properties?.make, 'Apple');
            assert.strictEqual(item.properties?.model, 'MacBook Pro');
            assert.strictEqual(item.properties?.serialNumber, '123456');
        });

        it('trims whitespace from name', async function () {
            const itemId = await createInventoryItem({ name: '  Test Item  ' });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.name, 'Test Item');
        });

        it('trims whitespace from description', async function () {
            const itemId = await createInventoryItem({
                name: 'Test Item',
                description: '  Test description  ',
            });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.description, 'Test description');
        });

        it('throws error when name is undefined', async function () {
            await assert.rejects(
                async () => await createInventoryItem({ name: undefined as unknown as string }),
                /must have a name/
            );
        });

        it('throws error when name is empty string', async function () {
            await assert.rejects(async () => await createInventoryItem({ name: '' }), /must have a name/);
        });

        it('throws error when name is too long', async function () {
            const longName = 'a'.repeat(501);
            await assert.rejects(
                async () => await createInventoryItem({ name: longName }),
                /must be 500 characters or less/
            );
        });

        it('throws error when description is too long', async function () {
            const longDescription = 'a'.repeat(5001);
            await assert.rejects(
                async () => await createInventoryItem({ name: 'Item', description: longDescription }),
                /must be 5000 characters or less/
            );
        });

        it('throws error when parent container does not exist', async function () {
            await assert.rejects(
                async () => await createInventoryItem({ name: 'Item', containerId: 'nonexistent123' }),
                /Parent container not found/
            );
        });

        it('throws error when parent is not a container', async function () {
            const nonContainerId = await createTestItemDirect('Not a container', false);

            await assert.rejects(
                async () => await createInventoryItem({ name: 'Item', containerId: nonContainerId }),
                /Parent must be a container/
            );
        });
    });

    describe('updateInventoryItem', function () {
        it('updates item name', async function () {
            const itemId = await createTestItemDirect('Old Name', false);

            const result = await updateInventoryItem(itemId, { name: 'New Name' });

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.name, 'New Name');
        });

        it('updates item description', async function () {
            const itemId = await createTestItemDirect('Item', false);

            const result = await updateInventoryItem(itemId, { description: 'New description' });

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.description, 'New description');
        });

        it('updates isContainer flag', async function () {
            const itemId = await createTestItemDirect('Item', false);

            const result = await updateInventoryItem(itemId, { isContainer: true });

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.isContainer, true);
        });

        it('updates tagIds', async function () {
            const itemId = await createTestItemDirect('Item', false);

            const result = await updateInventoryItem(itemId, { tagIds: ['tag1', 'tag2'] });

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.deepStrictEqual(item.tagIds, ['tag1', 'tag2']);
        });

        it('updates properties', async function () {
            const itemId = await createTestItemDirect('Item', false);

            const result = await updateInventoryItem(itemId, {
                properties: { make: 'Apple', model: 'iPad' },
            });

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.properties?.make, 'Apple');
            assert.strictEqual(item.properties?.model, 'iPad');
        });

        it('updates modifiedAt timestamp', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const originalItem = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(originalItem);

            // Wait a bit to ensure timestamp difference
            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });

            await updateInventoryItem(itemId, { name: 'Updated' });

            const updatedItem = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(updatedItem);
            assert.ok(updatedItem.modifiedAt > originalItem.modifiedAt);
        });

        it('trims whitespace from name', async function () {
            const itemId = await createTestItemDirect('Item', false);

            await updateInventoryItem(itemId, { name: '  Updated Name  ' });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.name, 'Updated Name');
        });

        it('trims whitespace from description', async function () {
            const itemId = await createTestItemDirect('Item', false);

            await updateInventoryItem(itemId, { description: '  Updated Description  ' });

            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.description, 'Updated Description');
        });

        it('throws RecordNotFoundException when item does not exist', async function () {
            await assert.rejects(
                async () => await updateInventoryItem('nonexistent123', { name: 'New Name' }),
                RecordNotFoundException
            );
        });

        it('throws error when name is empty', async function () {
            const itemId = await createTestItemDirect('Item', false);

            await assert.rejects(async () => await updateInventoryItem(itemId, { name: '' }), /cannot be empty/);
        });

        it('throws error when name is too long', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const longName = 'a'.repeat(501);

            await assert.rejects(
                async () => await updateInventoryItem(itemId, { name: longName }),
                /must be 500 characters or less/
            );
        });

        it('throws error when description is too long', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const longDescription = 'a'.repeat(5001);

            await assert.rejects(
                async () => await updateInventoryItem(itemId, { description: longDescription }),
                /must be 5000 characters or less/
            );
        });
    });

    describe('moveItem', function () {
        it('moves item to a container', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const containerId = await createTestItemDirect('Container', true);

            const result = await moveItem(itemId, containerId);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.containerId, containerId);
        });

        it('moves item to root (undefined)', async function () {
            const containerId = await createTestItemDirect('Container', true);
            const itemId = await createTestItemDirect('Item', false, containerId);

            const result = await moveItem(itemId, undefined);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.containerId, undefined);
        });

        it('moves item to root (null)', async function () {
            const containerId = await createTestItemDirect('Container', true);
            const itemId = await createTestItemDirect('Item', false, containerId);

            const result = await moveItem(itemId, null);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.containerId, undefined);
        });

        it('moves item to root (empty string)', async function () {
            const containerId = await createTestItemDirect('Container', true);
            const itemId = await createTestItemDirect('Item', false, containerId);

            const result = await moveItem(itemId, '');

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(item);
            assert.strictEqual(item.containerId, undefined);
        });

        it('throws RecordNotFoundException when item does not exist', async function () {
            const containerId = await createTestItemDirect('Container', true);

            await assert.rejects(async () => await moveItem('nonexistent123', containerId), RecordNotFoundException);
        });

        it('throws RecordNotFoundException when target container does not exist', async function () {
            const itemId = await createTestItemDirect('Item', false);

            await assert.rejects(async () => await moveItem(itemId, 'nonexistent123'), RecordNotFoundException);
        });

        it('throws error when target is not a container', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const nonContainerId = await createTestItemDirect('Not a container', false);

            await assert.rejects(async () => await moveItem(itemId, nonContainerId), /must be a container/);
        });

        it('throws error when move would create direct circular reference', async function () {
            const containerId = await createTestItemDirect('Container', true);

            await assert.rejects(async () => await moveItem(containerId, containerId), /circular reference/);
        });

        it('throws error when move would create indirect circular reference', async function () {
            // Parent > Child
            const parentId = await createTestItemDirect('Parent', true);
            const childId = await createTestItemDirect('Child', true, parentId);

            // Try to move Parent into Child (would create cycle)
            await assert.rejects(async () => await moveItem(parentId, childId), /circular reference/);
        });

        it('throws error when move would create nested circular reference', async function () {
            // Garage > Shelf > Box
            const garageId = await createTestItemDirect('Garage', true);
            const shelfId = await createTestItemDirect('Shelf', true, garageId);
            const boxId = await createTestItemDirect('Box', true, shelfId);

            // Try to move Garage into Box (would create cycle)
            await assert.rejects(async () => await moveItem(garageId, boxId), /circular reference/);
        });

        it('allows moving child to sibling', async function () {
            // Parent > Child1, Child2
            const parentId = await createTestItemDirect('Parent', true);
            const child1Id = await createTestItemDirect('Child 1', true, parentId);
            const child2Id = await createTestItemDirect('Child 2', true, parentId);

            // Move Child1 into Child2 (no cycle)
            const result = await moveItem(child1Id, child2Id);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: child1Id });
            assert.ok(item);
            assert.strictEqual(item.containerId, child2Id);
        });

        it('updates modifiedAt timestamp', async function () {
            const itemId = await createTestItemDirect('Item', false);
            const containerId = await createTestItemDirect('Container', true);
            const originalItem = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(originalItem);

            // Wait a bit to ensure timestamp difference
            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });

            await moveItem(itemId, containerId);

            const updatedItem = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.ok(updatedItem);
            assert.ok(updatedItem.modifiedAt > originalItem.modifiedAt);
        });
    });

    describe('deleteInventoryItem', function () {
        it('deletes a simple item', async function () {
            const itemId = await createTestItemDirect('Item', false);

            const result = await deleteInventoryItem(itemId);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert.strictEqual(item, undefined);
        });

        it('deletes an empty container', async function () {
            const containerId = await createTestItemDirect('Empty Container', true);

            const result = await deleteInventoryItem(containerId);

            assert.strictEqual(result, 1);
            const item = await InventoryItemsCollection.findOneAsync({ _id: containerId });
            assert.strictEqual(item, undefined);
        });

        it('throws error when deleting container with children', async function () {
            const containerId = await createTestItemDirect('Container', true);
            await createTestItemDirect('Child Item', false, containerId);

            await assert.rejects(
                async () => await deleteInventoryItem(containerId),
                /Cannot delete container with \d+ child items/
            );
        });

        it('throws RecordNotFoundException when item does not exist', async function () {
            await assert.rejects(async () => await deleteInventoryItem('nonexistent123'), RecordNotFoundException);
        });
    });

    describe('getItemPath', function () {
        it('returns path with single item at root', async function () {
            const itemId = await createTestItemDirect('Root Item', false);

            const path = await getItemPath(itemId);

            assert.strictEqual(path.length, 1);
            assert.strictEqual(path[0]._id, itemId);
            assert.strictEqual(path[0].name, 'Root Item');
        });

        it('returns path with item and parent', async function () {
            const parentId = await createTestItemDirect('Parent', true);
            const itemId = await createTestItemDirect('Item', false, parentId);

            const path = await getItemPath(itemId);

            // [Parent, Item]
            assert.strictEqual(path.length, 2);
            assert.strictEqual(path[0]._id, parentId);
            assert.strictEqual(path[0].name, 'Parent');
            assert.strictEqual(path[1]._id, itemId);
            assert.strictEqual(path[1].name, 'Item');
        });

        it('returns full path for nested hierarchy', async function () {
            // Garage > Shelf > Box > Item
            const garageId = await createTestItemDirect('Garage', true);
            const shelfId = await createTestItemDirect('Shelf', true, garageId);
            const boxId = await createTestItemDirect('Box', true, shelfId);
            const itemId = await createTestItemDirect('Item', false, boxId);

            const path = await getItemPath(itemId);

            // [Garage, Shelf, Box, Item]
            assert.strictEqual(path.length, 4);
            assert.strictEqual(path[0]._id, garageId);
            assert.strictEqual(path[0].name, 'Garage');
            assert.strictEqual(path[1]._id, shelfId);
            assert.strictEqual(path[1].name, 'Shelf');
            assert.strictEqual(path[2]._id, boxId);
            assert.strictEqual(path[2].name, 'Box');
            assert.strictEqual(path[3]._id, itemId);
            assert.strictEqual(path[3].name, 'Item');
        });

        it('throws RecordNotFoundException when item does not exist', async function () {
            await assert.rejects(async () => await getItemPath('nonexistent123'), RecordNotFoundException);
        });
    });
});
