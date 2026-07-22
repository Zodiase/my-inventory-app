/**
 * Recoverable metadata-and-blob lifecycle for item attachments.
 * Coordinates staged MongoDB records with reserved GridFS IDs; HTTP parsing and
 * UI concerns stay outside this module so cleanup invariants remain testable.
 */
import { Random } from 'meteor/random';

import { Attachments } from '/imports/api/attachments';
import {
    ATTACHMENT_HTTP_STATUS,
    AttachmentRequestError,
    decodeAndSanitizeFilename,
    detectAttachmentType,
    MAX_ATTACHMENT_BYTES,
} from '/imports/api/attachmentValidation';
import { InventoryItemsCollection } from '/imports/api/items';
import type { Attachment } from '/imports/model/Attachment';
import createLogger from '/imports/utility/Logger';

import {
    clearGridFSBucket,
    createGridFSFileId,
    deleteFromGridFSIfExists,
    getGridFSFileLength,
    uploadToGridFS,
} from './gridfs';
import { generateThumbnail, getImageMetadata } from './imageProcessing';

const logger = createLogger(module);

const cleanupAttachmentBlobs = async (attachment: Attachment): Promise<void> => {
    await deleteFromGridFSIfExists(attachment.fileId);

    if (attachment.thumbnailId !== undefined) {
        await deleteFromGridFSIfExists(attachment.thumbnailId);
    }
};

const getNextAttachmentOrder = async (itemId: string): Promise<number> => {
    const latest = await Attachments.findOneAsync({ itemId, storageState: 'ready' }, { sort: { order: -1 } });
    return latest === undefined ? 0 : latest.order + 1;
};

const hasPrimaryPhoto = async (itemId: string): Promise<boolean> => {
    return (await Attachments.find({ itemId, type: 'photo', isPrimary: true, storageState: 'ready' }).countAsync()) > 0;
};

export const createAttachment = async (
    itemId: string,
    encodedFilename: string | undefined,
    bytes: Buffer
): Promise<Attachment> => {
    if (bytes.length === 0) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            'The attachment file is empty.'
        );
    }

    if (bytes.length > MAX_ATTACHMENT_BYTES) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.contentTooLarge,
            'file-too-large',
            'Attachments must be 20 MiB or smaller.'
        );
    }

    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
    if (item === undefined) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.notFound,
            'not-found',
            'The inventory item was not found.'
        );
    }

    const filename = decodeAndSanitizeFilename(encodedFilename);
    const validatedType = detectAttachmentType(bytes);

    let thumbnail: Buffer | undefined = undefined;
    let width: number | undefined = undefined;
    let height: number | undefined = undefined;
    let exifOrientation: number | undefined = undefined;

    if (validatedType.type === 'photo') {
        try {
            const metadata = await getImageMetadata(bytes);
            thumbnail = await generateThumbnail(bytes);
            width = metadata.width;
            height = metadata.height;
            exifOrientation = metadata.orientation;
        } catch {
            throw new AttachmentRequestError(
                ATTACHMENT_HTTP_STATUS.badRequest,
                'unsupported-file',
                'Choose a valid JPEG or PNG image.'
            );
        }
    }

    const now = new Date();
    const attachmentId = Random.id();
    const fileId = createGridFSFileId();
    const thumbnailId = thumbnail === undefined ? undefined : createGridFSFileId();
    const attachment: Attachment = {
        _id: attachmentId,
        itemId,
        type: validatedType.type,
        fileId,
        thumbnailId,
        storageState: 'uploading',
        label: filename,
        originalFilename: filename,
        mimeType: validatedType.mimeType,
        fileSize: bytes.length,
        order: await getNextAttachmentOrder(itemId),
        isPrimary: validatedType.type === 'photo' && !(await hasPrimaryPhoto(itemId)),
        width,
        height,
        exifOrientation,
        createdAt: now,
        modifiedAt: now,
    };

    await Attachments.insertAsync(attachment);

    try {
        await uploadToGridFS(
            bytes,
            filename,
            { attachmentId, itemId, role: 'original', mimeType: validatedType.mimeType },
            fileId
        );

        if (thumbnail !== undefined && thumbnailId !== undefined) {
            await uploadToGridFS(
                thumbnail,
                `${filename}.thumbnail.jpg`,
                { attachmentId, itemId, role: 'thumbnail', mimeType: 'image/jpeg' },
                thumbnailId
            );
        }

        const readyAt = new Date();
        const updated = await Attachments.updateAsync(
            { _id: attachmentId, storageState: 'uploading' },
            { $set: { storageState: 'ready', modifiedAt: readyAt } }
        );

        if (updated !== 1) {
            throw new Error('Attachment metadata did not enter the ready state.');
        }

        return { ...attachment, storageState: 'ready', modifiedAt: readyAt };
    } catch (error) {
        try {
            await cleanupAttachmentBlobs(attachment);
            await Attachments.removeAsync({ _id: attachmentId, storageState: 'uploading' });
        } catch (cleanupError) {
            logger.warn('Attachment upload compensation failed', {
                attachmentId,
                itemId,
                error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            });
        }

        logger.warn('Attachment upload failed', {
            attachmentId,
            itemId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.internalServerError,
            'storage-error',
            'The attachment could not be stored.'
        );
    }
};

export const getReadyAttachment = async (itemId: string, attachmentId: string): Promise<Attachment> => {
    const attachment = await Attachments.findOneAsync({
        _id: attachmentId,
        itemId,
        storageState: 'ready',
    });

    if (attachment === undefined) {
        throw new AttachmentRequestError(ATTACHMENT_HTTP_STATUS.notFound, 'not-found', 'The attachment was not found.');
    }

    return attachment;
};

export const assertAttachmentBlobExists = async (fileId: string): Promise<number> => {
    const length = await getGridFSFileLength(fileId);
    if (length === undefined) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.notFound,
            'not-found',
            'The attachment file was not found.'
        );
    }
    return length;
};

export const deleteAttachment = async (itemId: string, attachmentId: string): Promise<void> => {
    const attachment = await Attachments.findOneAsync({ _id: attachmentId, itemId });

    if (attachment === undefined) {
        throw new AttachmentRequestError(ATTACHMENT_HTTP_STATUS.notFound, 'not-found', 'The attachment was not found.');
    }

    if (attachment.storageState === 'uploading') {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.conflict,
            'storage-conflict',
            'The attachment upload is still being finalized.'
        );
    }

    if (attachment.storageState === 'ready') {
        await Attachments.updateAsync(
            { _id: attachmentId, itemId, storageState: 'ready' },
            { $set: { storageState: 'deleting', modifiedAt: new Date() } }
        );
    }

    try {
        await cleanupAttachmentBlobs(attachment);
        await Attachments.removeAsync({ _id: attachmentId, itemId, storageState: 'deleting' });
    } catch (error) {
        logger.warn('Attachment deletion failed', {
            attachmentId,
            itemId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.internalServerError,
            'storage-error',
            'The attachment could not be deleted.'
        );
    }
};

export const reconcileAttachmentStorage = async (): Promise<{ uploadsRemoved: number; deletesFinished: number }> => {
    const interrupted = await Attachments.find({ storageState: { $in: ['uploading', 'deleting'] } }).fetchAsync();
    let uploadsRemoved = 0;
    let deletesFinished = 0;

    for (const attachment of interrupted) {
        try {
            await cleanupAttachmentBlobs(attachment);
            await Attachments.removeAsync({ _id: attachment._id, storageState: attachment.storageState });
            if (attachment.storageState === 'uploading') uploadsRemoved++;
            else deletesFinished++;
        } catch (error) {
            logger.warn('Attachment startup reconciliation failed', {
                attachmentId: attachment._id,
                itemId: attachment.itemId,
                state: attachment.storageState,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { uploadsRemoved, deletesFinished };
};

export const clearAttachmentStorage = async (): Promise<{ filesRemoved: number; recordsRemoved: number }> => {
    const filesRemoved = await clearGridFSBucket();
    const recordsRemoved = await Attachments.removeAsync({});
    return { filesRemoved, recordsRemoved };
};
