import { MongoInternals } from 'meteor/mongo';
import type { GridFSBucket as GridFSBucketType, GridFSBucketReadStream, ObjectId } from 'mongodb';

import createLogger from '/imports/utility/Logger';

const logger = createLogger(module);

/**
 * GridFS bucket for storing attachment files (photos and PDFs).
 *
 * @remarks
 * GridFS automatically chunks files larger than 255 KB. This is ideal for photos
 * and PDFs which can be several megabytes. The bucket uses default chunk size (255 KB).
 *
 * @see https://www.mongodb.com/docs/manual/core/gridfs/
 */
let gridFSBucket: GridFSBucketType | undefined = undefined;

/**
 * Initialize the GridFS bucket.
 *
 * @remarks
 * This must be called during Meteor.startup() after MongoDB connection is established.
 * The bucket is stored in a module-level variable for reuse throughout the application.
 *
 * @returns The initialized GridFS bucket
 */
export const initializeGridFS = (): GridFSBucketType => {
    if (typeof gridFSBucket !== 'undefined') {
        return gridFSBucket;
    }

    const { mongo } = MongoInternals.defaultRemoteCollectionDriver();
    const { GridFSBucket } = MongoInternals.NpmModules.mongodb.module;

    // Create bucket with default options (255 KB chunk size)
    // Type assertion needed due to Meteor/MongoDB version compatibility
    gridFSBucket = new GridFSBucket(mongo.db, {
        bucketName: 'attachments',
    }) as unknown as GridFSBucketType;

    logger.log('GridFS bucket initialized for attachments');

    return gridFSBucket;
};

/**
 * Get the GridFS bucket instance.
 *
 * @throws Error if GridFS has not been initialized
 * @returns The GridFS bucket
 */
export const getGridFSBucket = (): GridFSBucketType => {
    if (typeof gridFSBucket === 'undefined') {
        throw new Error('GridFS bucket not initialized. Call initializeGridFS() first.');
    }

    return gridFSBucket;
};

/**
 * Convert a string file ID to an ObjectId.
 *
 * @param fileId - GridFS file ID as string
 * @returns MongoDB ObjectId
 */
const toObjectId = (fileId: string): ObjectId => {
    const { ObjectId: ObjectIdConstructor } = MongoInternals.NpmModules.mongodb.module;
    // Type assertion needed due to Meteor/MongoDB version compatibility
    return new ObjectIdConstructor(fileId) as unknown as ObjectId;
};

/**
 * Upload a file to GridFS.
 *
 * @param buffer - File data as a Buffer
 * @param filename - Original filename
 * @param metadata - Additional metadata to store with the file
 * @returns Promise resolving to the GridFS file ID
 *
 * @example
 * ```typescript
 * const fileId = await uploadToGridFS(
 *   buffer,
 *   'photo.jpg',
 *   { mimeType: 'image/jpeg', uploadedBy: userId }
 * );
 * ```
 */
export const uploadToGridFS = async (
    buffer: Buffer,
    filename: string,
    metadata: Record<string, unknown> = {}
): Promise<string> => {
    const bucket = getGridFSBucket();

    return await new Promise<string>((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, { metadata });

        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
            resolve(uploadStream.id.toString());
        });

        uploadStream.write(buffer);
        uploadStream.end();
    });
};

/**
 * Download a file from GridFS.
 *
 * @param fileId - GridFS file ID as string
 * @returns Stream for reading the file
 *
 * @example
 * ```typescript
 * const stream = downloadFromGridFS(attachment.fileId);
 * stream.pipe(response);
 * ```
 */
export const downloadFromGridFS = (fileId: string): GridFSBucketReadStream => {
    const bucket = getGridFSBucket();
    return bucket.openDownloadStream(toObjectId(fileId));
};

/**
 * Delete a file from GridFS.
 *
 * @param fileId - GridFS file ID as string
 * @returns Promise resolving when deletion is complete
 *
 * @remarks
 * This deletes both the file chunks and the file metadata.
 *
 * @example
 * ```typescript
 * await deleteFromGridFS(attachment.fileId);
 * if (attachment.thumbnailId) {
 *   await deleteFromGridFS(attachment.thumbnailId);
 * }
 * ```
 */
export const deleteFromGridFS = async (fileId: string): Promise<void> => {
    const bucket = getGridFSBucket();
    await bucket.delete(toObjectId(fileId));
};
