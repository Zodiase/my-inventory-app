import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import sinon from 'sinon';

import * as tags from './tags';

describe('tags', function () {
    const insertAsyncOriginal = tags.TagsCollection.insertAsync;
    const insertAsyncStub = sinon.stub(tags.TagsCollection, 'insertAsync').callsFake(
        Meteor.bindEnvironment(async (doc): Promise<string> => {
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
            await assert.doesNotReject(tags.createTag({ name: '_test_tag' }));

            assert.strictEqual(true, insertAsyncStub.called);
        });

        it('creates a new tag', async function () {
            const testTagId = await tags.createTag({ name: '_test_tag' });
            const testTag = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag === 'undefined') {
                assert.fail('Unable to find the newly created tag.');
            }

            assert.equal('_test_tag', testTag.name);
        });
    });

    describe('renameTag', function () {
        it('changes the name of a tag', async function () {
            const testTagId = await tags.createTag({ name: '_test_tag' });
            const testTag = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag === 'undefined') {
                assert.fail('Unable to find the newly created tag.');
            }

            const response = await tags.renameTag(testTag, 'new name');

            assert.equal(true, response);

            const testTag2 = await tags.TagsCollection.findOneAsync({ _id: testTagId });

            if (typeof testTag2 === 'undefined') {
                assert.fail('Unable to find the renamed tag.');
            }

            assert.equal('new name', testTag2.name);
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
});
