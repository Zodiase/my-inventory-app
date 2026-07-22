/**
 * Persistent metadata for item-owned attachment blobs.
 * The storage state coordinates recoverable GridFS writes and deletes; raw
 * bytes and transport behavior belong to server attachment modules.
 */
import type { CollectionItem } from '/imports/model/CollectionItem';

/**
 * Attachment model for photos and PDF documents attached to items
 *
 * The first shipping slice supports JPEG/PNG photos with generated thumbnails
 * and PDF documents. Additional formats and richer ordering/primary controls
 * remain represented for planned follow-up work.
 *
 * File storage: GridFS
 * Max file size: 20MB per file
 */
export interface Attachment extends CollectionItem {
    /** Reference to the parent item */
    itemId: string;

    /** Type of attachment */
    type: 'photo' | 'pdf';

    /** GridFS file ID for the original file */
    fileId: string;

    /** GridFS file ID for thumbnail (photos only) */
    thumbnailId?: string;

    /** Recoverable state spanning MongoDB metadata and GridFS blob operations */
    storageState: 'uploading' | 'ready' | 'deleting';

    /** User-customizable label, defaults to original filename */
    label: string;

    /** Original filename preserved for export */
    originalFilename: string;

    /** MIME type (e.g., 'image/jpeg', 'application/pdf') */
    mimeType: string;

    /** File size in bytes, max 20MB (20971520 bytes) */
    fileSize: number;

    /** Display order for photos (0-indexed), unique per item */
    order: number;

    /** True if this is the primary thumbnail photo for the item */
    isPrimary: boolean;

    /** Image width in pixels (photos only) */
    width?: number;

    /** Image height in pixels (photos only) */
    height?: number;

    /** EXIF orientation value (1-8), handled during processing (photos only) */
    exifOrientation?: number;
}
