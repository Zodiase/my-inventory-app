import assert from 'assert';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import sharp from 'sharp';

import { Attachments } from '/imports/api/attachments';
import { AttachmentRequestError } from '/imports/api/attachmentValidation';
import { InventoryItemsCollection } from '/imports/api/items';
import type { Attachment } from '/imports/model/Attachment';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type NoId from '/imports/utility/NoId';

import {
    clearAttachmentStorage,
    createAttachment,
    deleteAttachment,
    reconcileAttachmentStorage,
} from './attachmentService';
import { countGridFSFiles, getGridFSFileLength, initializeGridFS } from './gridfs';

describe('attachmentService', function () {
    const bindEnvironment = Meteor.bindEnvironment.bind(Meteor);
    const tracerKey = '_attachmentTesting';
    const tracer = { [tracerKey]: true };

    const createTestItem = async (name = 'Attachment test item'): Promise<string> => {
        const now = new Date();
        const item: NoId<InventoryItem> & Record<string, unknown> = {
            name,
            isContainer: false,
            tagIds: [],
            createdAt: now,
            modifiedAt: now,
            ...tracer,
        };
        return await InventoryItemsCollection.insertAsync(item);
    };

    this.beforeAll(
        bindEnvironment(async () => {
            initializeGridFS();
            await clearAttachmentStorage();
            await InventoryItemsCollection.removeAsync({ [tracerKey]: { $exists: true } });
        })
    );

    this.afterEach(
        bindEnvironment(async () => {
            await clearAttachmentStorage();
            await InventoryItemsCollection.removeAsync({ [tracerKey]: { $exists: true } });
        })
    );

    it('stores a validated image, thumbnail, and ready metadata', async function () {
        const itemId = await createTestItem();
        const image = await sharp({
            create: { width: 8, height: 6, channels: 3, background: { r: 20, g: 40, b: 60 } },
        })
            .png()
            .toBuffer();

        const attachment = await createAttachment(itemId, encodeURIComponent('photo.png'), image);

        assert.strictEqual(attachment.storageState, 'ready');
        assert.strictEqual(attachment.type, 'photo');
        assert.strictEqual(attachment.mimeType, 'image/png');
        assert.strictEqual(attachment.width, 8);
        assert.strictEqual(attachment.height, 6);
        assert.ok(attachment.thumbnailId);
        assert.strictEqual(await getGridFSFileLength(attachment.fileId), image.length);
        assert.ok((await getGridFSFileLength(attachment.thumbnailId)) !== undefined);
        assert.strictEqual(await countGridFSFiles(), 2);

        const stored = await Attachments.findOneAsync({ _id: attachment._id });
        assert.strictEqual(stored?.storageState, 'ready');
    });

    it('stores a PDF without a thumbnail', async function () {
        const itemId = await createTestItem();
        const pdf = Buffer.from('%PDF-1.4\nminimal fixture\n%%EOF');

        const attachment = await createAttachment(itemId, encodeURIComponent('receipt.pdf'), pdf);

        assert.strictEqual(attachment.type, 'pdf');
        assert.strictEqual(attachment.thumbnailId, undefined);
        assert.strictEqual(await countGridFSFiles(), 1);
    });

    it('rejects unsupported bytes without allocating storage', async function () {
        const itemId = await createTestItem();

        await assert.rejects(
            async () => await createAttachment(itemId, encodeURIComponent('fake.png'), Buffer.from('not an image')),
            (error: unknown) =>
                error instanceof AttachmentRequestError && error.status === 400 && error.code === 'unsupported-file'
        );

        assert.strictEqual(await Attachments.find({ itemId }).countAsync(), 0);
        assert.strictEqual(await countGridFSFiles(), 0);
    });

    it('deletes metadata and all owned blobs', async function () {
        const itemId = await createTestItem();
        const image = await sharp({
            create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } },
        })
            .jpeg()
            .toBuffer();
        const attachment = await createAttachment(itemId, encodeURIComponent('photo.jpg'), image);

        await deleteAttachment(itemId, attachment._id);

        assert.strictEqual(await Attachments.find({ _id: attachment._id }).countAsync(), 0);
        assert.strictEqual(await countGridFSFiles(), 0);
    });

    it('does not delete an attachment through a different item ID', async function () {
        const itemId = await createTestItem('Owner');
        const otherItemId = await createTestItem('Other');
        const attachment = await createAttachment(
            itemId,
            encodeURIComponent('receipt.pdf'),
            Buffer.from('%PDF-1.4\nfixture\n%%EOF')
        );

        await assert.rejects(
            async () => {
                await deleteAttachment(otherItemId, attachment._id);
            },
            (error: unknown) =>
                error instanceof AttachmentRequestError && error.status === 404 && error.code === 'not-found'
        );

        assert.strictEqual(await Attachments.find({ _id: attachment._id, storageState: 'ready' }).countAsync(), 1);
        assert.strictEqual(await countGridFSFiles(), 1);
    });

    it('reconciles interrupted uploading and deleting records', async function () {
        const itemId = await createTestItem();
        const ready = await createAttachment(
            itemId,
            encodeURIComponent('receipt.pdf'),
            Buffer.from('%PDF-1.4\nfixture\n%%EOF')
        );
        await Attachments.updateAsync({ _id: ready._id }, { $set: { storageState: 'deleting' } });

        const now = new Date();
        const interruptedUpload: Attachment = {
            _id: Random.id(),
            itemId,
            type: 'pdf',
            fileId: '507f1f77bcf86cd799439011',
            storageState: 'uploading',
            label: 'pending.pdf',
            originalFilename: 'pending.pdf',
            mimeType: 'application/pdf',
            fileSize: 10,
            order: 1,
            isPrimary: false,
            createdAt: now,
            modifiedAt: now,
        };
        await Attachments.insertAsync(interruptedUpload);

        const result = await reconcileAttachmentStorage();

        assert.deepStrictEqual(result, { uploadsRemoved: 1, deletesFinished: 1 });
        assert.strictEqual(await Attachments.find({ itemId }).countAsync(), 0);
        assert.strictEqual(await countGridFSFiles(), 0);
    });
});
