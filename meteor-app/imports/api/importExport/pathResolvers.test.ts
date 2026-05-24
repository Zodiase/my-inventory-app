import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import sinon from 'sinon';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';

import { createResolverSession } from './pathResolvers';

describe('pathResolvers', function () {
    const bindEnvironment = Meteor.bindEnvironment.bind(Meteor);
    const TracerKey = '_testing';
    const tracer = {
        [TracerKey]: {
            session: Random.id(),
        },
    };

    let itemInsertStub: sinon.SinonStub | undefined = undefined;
    let tagInsertStub: sinon.SinonStub | undefined = undefined;

    const tryStubInsert = (collection: {
        insertAsync: (doc: never) => Promise<string>;
    }): sinon.SinonStub | undefined => {
        const original = collection.insertAsync.bind(collection);
        try {
            return sinon.stub(collection, 'insertAsync').callsFake(
                bindEnvironment(async (doc: Record<string, unknown>): Promise<string> => {
                    const spiced = { ...doc, ...tracer };
                    return await original(spiced as never);
                })
            );
        } catch (err) {
            // Another test file already wrapped insertAsync (e.g. tags.test.ts
            // installs a module-level stub). That stub also adds a tracer,
            // which is enough for our cleanup via `{ [TracerKey]: { $exists: true } }`.
            if (err instanceof Error && err.message.includes('already wrapped')) {
                return undefined;
            }
            throw err;
        }
    };

    this.beforeAll(
        bindEnvironment(async () => {
            itemInsertStub = tryStubInsert(InventoryItemsCollection);
            tagInsertStub = tryStubInsert(TagsCollection);
            await InventoryItemsCollection.removeAsync({ [TracerKey]: { $exists: true } });
            await TagsCollection.removeAsync({ [TracerKey]: { $exists: true } });
        })
    );

    this.afterEach(
        bindEnvironment(async () => {
            itemInsertStub?.resetHistory();
            tagInsertStub?.resetHistory();
            await InventoryItemsCollection.removeAsync({ [TracerKey]: { $exists: true } });
            await TagsCollection.removeAsync({ [TracerKey]: { $exists: true } });
        })
    );

    this.afterAll(
        bindEnvironment(() => {
            itemInsertStub?.restore();
            tagInsertStub?.restore();
        })
    );

    describe('resolveContainerPath', function () {
        it('returns undefined for empty path', async function () {
            const session = createResolverSession();
            const result = await session.resolveContainerPath('', { autoCreate: true });
            assert.strictEqual(result, undefined);
        });

        it('returns undefined for whitespace-only path', async function () {
            const session = createResolverSession();
            const result = await session.resolveContainerPath('   →  ', { autoCreate: true });
            assert.strictEqual(result, undefined);
        });

        it('creates a single container at root when autoCreate is true', async function () {
            const session = createResolverSession();
            const id = await session.resolveContainerPath('Garage', { autoCreate: true });
            assert.ok(id);
            const container = await InventoryItemsCollection.findOneAsync({ _id: id });
            assert.ok(container);
            assert.strictEqual(container.name, 'Garage');
            assert.strictEqual(container.isContainer, true);
            assert.strictEqual(container.containerId, undefined);
            assert.ok(container.createdAt instanceof Date);
            assert.ok(container.modifiedAt instanceof Date);
        });

        it('creates intermediate containers along a nested path', async function () {
            const session = createResolverSession();
            const leafId = await session.resolveContainerPath('Bedroom 2 → XH Bedroom', { autoCreate: true });
            assert.ok(leafId);
            const leaf = await InventoryItemsCollection.findOneAsync({ _id: leafId });
            assert.ok(leaf);
            assert.strictEqual(leaf.name, 'XH Bedroom');
            assert.ok(leaf.containerId);

            const parent = await InventoryItemsCollection.findOneAsync({ _id: leaf.containerId });
            assert.ok(parent);
            assert.strictEqual(parent.name, 'Bedroom 2');
            assert.strictEqual(parent.isContainer, true);
            assert.strictEqual(parent.containerId, undefined);
        });

        it('is idempotent across two sessions', async function () {
            const sessionA = createResolverSession();
            const sessionB = createResolverSession();
            const idA = await sessionA.resolveContainerPath('A → B → C', { autoCreate: true });
            const idB = await sessionB.resolveContainerPath('A → B → C', { autoCreate: true });
            assert.strictEqual(idA, idB);

            // Only three containers were ever inserted.
            const count = await InventoryItemsCollection.find({
                [TracerKey]: { $exists: true },
                isContainer: true,
            }).countAsync();
            assert.strictEqual(count, 3);
        });

        it('reuses an existing container if a matching one is already in the DB', async function () {
            const existing = await InventoryItemsCollection.insertAsync({
                name: 'Pre-existing',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            });

            const session = createResolverSession();
            const resolved = await session.resolveContainerPath('Pre-existing', { autoCreate: true });
            assert.strictEqual(resolved, existing);
        });

        it('supports a custom separator', async function () {
            const session = createResolverSession();
            const id = await session.resolveContainerPath('Room/Shelf', { autoCreate: true, separator: '/' });
            assert.ok(id);
            const leaf = await InventoryItemsCollection.findOneAsync({ _id: id });
            assert.ok(leaf);
            assert.strictEqual(leaf.name, 'Shelf');
        });

        it('throws when autoCreate is false and a segment is missing', async function () {
            const session = createResolverSession();
            await assert.rejects(
                async () => await session.resolveContainerPath('Nope', { autoCreate: false }),
                /cannot be resolved/
            );
        });

        it('does not write to the DB in dryRun mode', async function () {
            const countBefore = await InventoryItemsCollection.find({}).countAsync();
            const session = createResolverSession({ dryRun: true });
            const id = await session.resolveContainerPath('Virtual → Path', { autoCreate: true });
            assert.ok(id);
            assert.match(id, /^virtual:/);
            const countAfter = await InventoryItemsCollection.find({}).countAsync();
            assert.strictEqual(countAfter, countBefore);
            const planned = session.getPlannedWrites();
            assert.strictEqual(planned.containers.length, 2);
        });

        it('returns the same virtual ID for repeated dryRun resolutions', async function () {
            const session = createResolverSession({ dryRun: true });
            const idA = await session.resolveContainerPath('X → Y', { autoCreate: true });
            const idB = await session.resolveContainerPath('X → Y', { autoCreate: true });
            assert.strictEqual(idA, idB);
        });
    });

    describe('resolveTagByName', function () {
        it('creates a root tag with correct path when autoCreate is true', async function () {
            const session = createResolverSession();
            const id = await session.resolveTagByName('Electronics', { autoCreate: true });
            const tag = await TagsCollection.findOneAsync({ _id: id });
            assert.ok(tag);
            assert.strictEqual(tag.name, 'Electronics');
            assert.strictEqual(tag.parentTagId, '');
            assert.deepStrictEqual(tag.path, [{ _id: id, name: 'Electronics' }]);
        });

        it('creates a group root tag and a child under it', async function () {
            const session = createResolverSession();
            const id = await session.resolveTagByName('Books', { groupName: 'Category', autoCreate: true });

            const child = await TagsCollection.findOneAsync({ _id: id });
            assert.ok(child);
            assert.strictEqual(child.name, 'Books');
            assert.notStrictEqual(child.parentTagId, '');

            const root = await TagsCollection.findOneAsync({ _id: child.parentTagId });
            assert.ok(root);
            assert.strictEqual(root.name, 'Category');
            assert.strictEqual(root.parentTagId, '');

            assert.deepStrictEqual(child.path, [
                { _id: root._id, name: 'Category' },
                { _id: child._id, name: 'Books' },
            ]);
        });

        it('reuses the same group root for multiple children', async function () {
            const session = createResolverSession();
            const a = await session.resolveTagByName('Books', { groupName: 'Category', autoCreate: true });
            const b = await session.resolveTagByName('Tools', { groupName: 'Category', autoCreate: true });
            const tagA = await TagsCollection.findOneAsync({ _id: a });
            const tagB = await TagsCollection.findOneAsync({ _id: b });
            assert.ok(tagA && tagB);
            assert.strictEqual(tagA.parentTagId, tagB.parentTagId);

            const rootCount = await TagsCollection.find({
                name: 'Category',
                parentTagId: '',
                [TracerKey]: { $exists: true },
            }).countAsync();
            assert.strictEqual(rootCount, 1);
        });

        it('is idempotent across two sessions (same IDs returned)', async function () {
            const sessionA = createResolverSession();
            const sessionB = createResolverSession();
            const idA = await sessionA.resolveTagByName('Wireless', { groupName: 'Collection', autoCreate: true });
            const idB = await sessionB.resolveTagByName('Wireless', { groupName: 'Collection', autoCreate: true });
            assert.strictEqual(idA, idB);
        });

        it('matches existing tags case-insensitively', async function () {
            const session = createResolverSession();
            const first = await session.resolveTagByName('CampingGear', { autoCreate: true });
            const second = await createResolverSession().resolveTagByName('campinggear', { autoCreate: true });
            assert.strictEqual(first, second);
        });

        it('throws when autoCreate is false and the tag does not exist', async function () {
            const session = createResolverSession();
            await assert.rejects(
                async () => await session.resolveTagByName('Missing', { autoCreate: false }),
                /not found/i
            );
        });

        it('does not write in dryRun mode and records planned writes', async function () {
            const countBefore = await TagsCollection.find({}).countAsync();
            const session = createResolverSession({ dryRun: true });
            const id = await session.resolveTagByName('Cameras', { groupName: 'Category', autoCreate: true });
            assert.match(id, /^virtual:/);
            const countAfter = await TagsCollection.find({}).countAsync();
            assert.strictEqual(countAfter, countBefore);

            const planned = session.getPlannedWrites();
            // Two tags planned: the group root and the child.
            assert.strictEqual(planned.tags.length, 2);
            const child = planned.tags.find((t) => t.name === 'Cameras');
            assert.ok(child);
            assert.strictEqual(child.path[child.path.length - 1]._id, child.virtualId);
            assert.strictEqual(child.path[0].name, 'Category');
        });
    });

    describe('resolveTagList', function () {
        it('resolves a list of plain tag names at root', async function () {
            const session = createResolverSession();
            const ids = await session.resolveTagList(['Red', 'Blue', 'Green'], { autoCreate: true });
            assert.strictEqual(ids.length, 3);
            for (const id of ids) {
                const tag = await TagsCollection.findOneAsync({ _id: id });
                assert.ok(tag);
                assert.strictEqual(tag.parentTagId, '');
            }
        });

        it('skips empty and whitespace-only entries', async function () {
            const session = createResolverSession();
            const ids = await session.resolveTagList(['One', '', '  ', 'Two'], { autoCreate: true });
            assert.strictEqual(ids.length, 2);
        });

        it('deduplicates resolved IDs (case-insensitive)', async function () {
            const session = createResolverSession();
            const ids = await session.resolveTagList(['Foo', 'foo', 'FOO'], { autoCreate: true });
            assert.strictEqual(ids.length, 1);
        });

        it('is idempotent across two sessions', async function () {
            const a = await createResolverSession().resolveTagList(['Alpha', 'Beta'], { autoCreate: true });
            const b = await createResolverSession().resolveTagList(['Alpha', 'Beta'], { autoCreate: true });
            assert.deepStrictEqual(a, b);
        });
    });
});
