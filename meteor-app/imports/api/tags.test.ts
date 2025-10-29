import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import sinon from 'sinon';

import * as items from './items';
import * as tags from './tags';

describe('tags', function () {
    const bindEnvironment = Meteor.bindEnvironment.bind(Meteor);
    const insertAsyncOriginal = tags.TagsCollection.insertAsync;
    const insertAsyncStub = sinon.stub(tags.TagsCollection, 'insertAsync').callsFake(
        bindEnvironment(async (doc): Promise<string> => {
            const spicedDoc = {
                ...doc,
                ...tracer,
            };

            return await insertAsyncOriginal.apply(tags.TagsCollection, [spicedDoc]);
        })
    );
    const TracerKey = '_testing';
    const tracer = {
        [TracerKey]: {
            session: Random.id(),
        },
    };

    this.beforeAll(
        Meteor.bindEnvironment(async () => {
            // Remove all documents from prior tests.
            await tags.TagsCollection.removeAsync({
                [TracerKey]: {
                    $exists: true,
                },
            });
        })
    );

    this.afterEach(
        Meteor.bindEnvironment(() => {
            insertAsyncStub.resetHistory();
        })
    );

    this.afterAll(
        Meteor.bindEnvironment(async () => {
            insertAsyncStub.restore();

            // Remove all documents created during tests.
            await tags.TagsCollection.removeAsync(tracer);
        })
    );

    describe('assertParentTag', function () {
        const findOneAsyncSpy = sinon.spy(tags.TagsCollection, 'findOneAsync');

        this.afterEach(() => {
            findOneAsyncSpy.resetHistory();
        });

        it('throws when parent tag is not found', async function () {
            await assert.rejects(
                async () => await tags.assertParentTag('_not_found_'),
                (error) => {
                    assert(error instanceof Error);
                    assert.equal(error.message, 'Parent Tag not found');

                    return true;
                }
            );
        });

        it('calls findOneAsync', async function () {
            const testTagId = await tags.TagsCollection.insertAsync({
                name: '_test_tag_',
                parentTagId: '',
                createdAt: new Date(),
                modifiedAt: new Date(),
                path: [{ _id: '', name: '_test_tag_' }],
            });

            await assert.doesNotReject(tags.assertParentTag(testTagId));

            assert.strictEqual(true, findOneAsyncSpy.called);
        });

        it('returns parent tag ID if exists', async function () {
            const testTagId = await tags.TagsCollection.insertAsync({
                name: '_test_tag_',
                parentTagId: '',
                createdAt: new Date(),
                modifiedAt: new Date(),
                path: [{ _id: '', name: '_test_tag_' }],
            });

            const foundTag = await tags.assertParentTag(testTagId);

            assert.strictEqual(foundTag._id, testTagId);
        });
    });

    describe('getTagPath', function () {
        //TODO
    });

    describe('createTag', function () {
        it('throws when tag name is undefined', async function () {
            await assert.rejects(
                async () => await tags.createTag({}),
                (error) => {
                    assert(error instanceof Error);
                    assert.equal(error.message, 'Tag must have a name.');

                    return true;
                }
            );
        });

        it('calls insertAsync', async function () {
            await assert.doesNotReject(tags.createTag({ name: '_test_tag_calls_insert' }));

            assert.strictEqual(true, insertAsyncStub.called);
        });

        it('creates a new tag', async function () {
            const testTagId = await tags.createTag({ name: '_test_tag_creates_new' });
            const testTag = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag === 'undefined') {
                assert.fail('Unable to find the newly created tag.');
            }

            assert.equal('_test_tag_creates_new', testTag.name);
        });
    });

    describe('renameTag', function () {
        it('changes the name of a tag', async function () {
            const testTagId = await tags.createTag({ name: '_test_tag_rename' });
            const testTag = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag === 'undefined') {
                assert.fail('Unable to find the newly created tag.');
            }

            const response = await tags.renameTag(testTag, 'new name for rename test');

            assert.equal(true, response);

            const testTag2 = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag2 === 'undefined') {
                assert.fail('Unable to find the renamed tag.');
            }

            assert.equal('new name for rename test', testTag2.name);
        });
    });

    describe('getAllDescendants', function () {
        //TODO
    });

    describe('getAllDescendantsByPath', function () {
        //TODO
    });

    describe('setTagParent', function () {
        //TODO
    });

    describe('removeTag', function () {
        //TODO
    });

    describe('getDetachedTags', function () {
        //TODO
    });

    describe('fixPath', function () {
        //TODO
    });

    describe('watchAndFixMissingPath', function () {
        //TODO
    });

    // T034: Unit tests for tags.create with case-insensitive uniqueness
    describe('createTag (case-insensitive uniqueness)', function () {
        it('prevents creating duplicate tags (case-insensitive)', async function () {
            await tags.createTag({ name: 'CampingGear' });

            await assert.rejects(
                async () => await tags.createTag({ name: 'campinggear' }),
                (error) => {
                    assert(error instanceof Error);
                    assert.match(error.message, /already exists/i);
                    return true;
                }
            );

            await assert.rejects(
                async () => await tags.createTag({ name: 'CAMPINGGEAR' }),
                (error) => {
                    assert(error instanceof Error);
                    assert.match(error.message, /already exists/i);
                    return true;
                }
            );
        });

        it('allows tags with different names', async function () {
            const tag1Id = await tags.createTag({ name: 'Camping' });
            const tag2Id = await tags.createTag({ name: 'Hiking' });

            assert.notStrictEqual(tag1Id, tag2Id);
        });
    });

    // T035: Unit tests for tags.rename
    describe('renameTag (with validation)', function () {
        it('prevents renaming to existing tag name (case-insensitive)', async function () {
            await tags.createTag({ name: 'Electronics' });
            const tag2Id = await tags.createTag({ name: 'Tools' });
            const tag2 = await tags.TagsCollection.findOneAsync({ _id: tag2Id });

            if (typeof tag2 === 'undefined') {
                assert.fail('Unable to find tag2');
            }

            await assert.rejects(
                async () => await tags.renameTag(tag2, 'electronics'),
                (error) => {
                    assert(error instanceof Error);
                    assert.match(error.message, /already exists/i);
                    return true;
                }
            );
        });

        it('renames tag successfully when name is available', async function () {
            const tagId = await tags.createTag({ name: 'OldName' });
            const tag = await tags.TagsCollection.findOneAsync({ _id: tagId });

            if (typeof tag === 'undefined') {
                assert.fail('Unable to find tag');
            }

            const result = await tags.renameTag(tag, 'NewName');

            assert.strictEqual(result, true);

            const updatedTag = await tags.TagsCollection.findOneAsync({ _id: tagId });
            assert.strictEqual(updatedTag?.name, 'NewName');
        });
    });

    // T036: Unit tests for tags.delete with item cleanup
    describe('deleteTag (with item cleanup)', function () {
        it('removes tag from all items that reference it', async function () {
            const tagId = await tags.createTag({ name: 'ToDelete' });
            const item1Id = await items.createInventoryItem({ name: 'Item1', tagIds: [tagId] });
            const item2Id = await items.createInventoryItem({ name: 'Item2', tagIds: [tagId] });

            await tags.deleteTag(tagId);

            const item1 = await items.InventoryItemsCollection.findOneAsync({ _id: item1Id });
            const item2 = await items.InventoryItemsCollection.findOneAsync({ _id: item2Id });

            assert.strictEqual(item1?.tagIds.length, 0, 'Item1 should have no tags');
            assert.strictEqual(item2?.tagIds.length, 0, 'Item2 should have no tags');
        });

        it('deletes the tag record', async function () {
            const tagId = await tags.createTag({ name: 'ToDelete2' });

            await tags.deleteTag(tagId);

            const tag = await tags.TagsCollection.findOneAsync({ _id: tagId });
            assert.strictEqual(tag, undefined, 'Tag should be deleted');
        });

        it('returns true when tag is deleted', async function () {
            const tagId = await tags.createTag({ name: 'ToDelete3' });

            const result = await tags.deleteTag(tagId);

            assert.strictEqual(result, true);
        });

        it('returns false when tag does not exist', async function () {
            const result = await tags.deleteTag('nonexistent-id');

            assert.strictEqual(result, false);
        });
    });

    // T037: Unit tests for tags.addToItem
    describe('addToItem', function () {
        it('throws when item does not exist', async function () {
            const tagId = await tags.createTag({ name: 'TestTag' });

            await assert.rejects(
                async () => await tags.addToItem('nonexistent-item-id', tagId),
                (error) => {
                    assert(error instanceof Error);
                    assert.match(error.message, /item.*not found/i);
                    return true;
                }
            );
        });

        it('throws when tag does not exist', async function () {
            const itemId = await items.createInventoryItem({ name: 'TestItem' });

            await assert.rejects(
                async () => await tags.addToItem(itemId, 'nonexistent-tag-id'),
                (error) => {
                    assert(error instanceof Error);
                    assert.match(error.message, /tag.*not found/i);
                    return true;
                }
            );
        });

        it('adds tag to item successfully', async function () {
            const tagId = await tags.createTag({ name: 'NewTag' });
            const itemId = await items.createInventoryItem({ name: 'NewItem' });

            const result = await tags.addToItem(itemId, tagId);

            assert.strictEqual(result, true);

            const item = await items.InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert(item?.tagIds.includes(tagId), 'Item should have the tag');
        });

        it('is idempotent - does not add tag twice', async function () {
            const tagId = await tags.createTag({ name: 'IdempotentTag' });
            const itemId = await items.createInventoryItem({ name: 'IdempotentItem' });

            await tags.addToItem(itemId, tagId);
            const result2 = await tags.addToItem(itemId, tagId);

            assert.strictEqual(result2, true);

            const item = await items.InventoryItemsCollection.findOneAsync({ _id: itemId });
            const tagCount = item?.tagIds.filter((id) => id === tagId).length;
            assert.strictEqual(tagCount, 1, 'Tag should only appear once');
        });
    });

    // T038: Unit tests for tags.removeFromItem
    describe('removeFromItem', function () {
        it('removes tag from item successfully', async function () {
            const tagId = await tags.createTag({ name: 'TagToRemove' });
            const itemId = await items.createInventoryItem({ name: 'ItemWithTag', tagIds: [tagId] });

            const result = await tags.removeFromItem(itemId, tagId);

            assert.strictEqual(result, true);

            const item = await items.InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert(!item?.tagIds.includes(tagId), 'Item should not have the tag');
        });

        it('returns true even if tag was not on item (idempotent)', async function () {
            const tagId = await tags.createTag({ name: 'NotOnItem' });
            const itemId = await items.createInventoryItem({ name: 'ItemWithoutTag' });

            const result = await tags.removeFromItem(itemId, tagId);

            assert.strictEqual(result, true);
        });

        it('only removes specified tag, leaves others', async function () {
            const tag1Id = await tags.createTag({ name: 'Tag1' });
            const tag2Id = await tags.createTag({ name: 'Tag2' });
            const itemId = await items.createInventoryItem({ name: 'MultiTagItem', tagIds: [tag1Id, tag2Id] });

            await tags.removeFromItem(itemId, tag1Id);

            const item = await items.InventoryItemsCollection.findOneAsync({ _id: itemId });
            assert(!item?.tagIds.includes(tag1Id), 'Tag1 should be removed');
            assert(item?.tagIds.includes(tag2Id), 'Tag2 should remain');
        });
    });
});
