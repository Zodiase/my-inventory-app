import type { CollectionItem } from '/imports/model/CollectionItem';

/**
 * Attachment model for photos and PDF documents attached to items
 *
 * Supports:
 * - Photos: JPEG, PNG, HEIC with thumbnail generation and EXIF correction
 * - PDFs: Documents like receipts, warranties, manuals
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
