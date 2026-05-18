import sharp from 'sharp';

import createLogger from '/imports/utility/Logger';

const logger = createLogger(module);

/**
 * Target width for thumbnail images in pixels.
 *
 * @remarks
 * Thumbnails are resized to this width while maintaining aspect ratio.
 * This size is optimized for mobile displays and fast loading.
 */
const THUMBNAIL_WIDTH = 300;

/**
 * JPEG quality setting for thumbnails (0-100).
 *
 * @remarks
 * Higher values mean better quality but larger file sizes.
 * 80 provides a good balance between quality and file size.
 */
const THUMBNAIL_QUALITY = 80;

/**
 * Supported image MIME types for processing.
 *
 * @remarks
 * These formats are supported by sharp and can be uploaded and processed by the app.
 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'] as const;

/**
 * Check if a MIME type is a supported image format.
 *
 * @param mimeType - MIME type to check
 * @returns True if the MIME type is supported for image processing
 */
export const isSupportedImageType = (mimeType: string): boolean => {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType as (typeof SUPPORTED_IMAGE_TYPES)[number]);
};

/**
 * Generate a thumbnail from an image buffer.
 *
 * @param imageBuffer - Original image data as Buffer
 * @returns Promise resolving to thumbnail image data as Buffer (JPEG format)
 *
 * @remarks
 * The thumbnail is:
 * - Resized to THUMBNAIL_WIDTH (300px) width, height adjusted to maintain aspect ratio
 * - Converted to JPEG format with THUMBNAIL_QUALITY (80) quality
 * - EXIF orientation automatically corrected (rotated/flipped as needed)
 *
 * @example
 * ```typescript
 * const originalImage = await fs.promises.readFile('photo.jpg');
 * const thumbnail = await generateThumbnail(originalImage);
 * await fs.promises.writeFile('thumbnail.jpg', thumbnail);
 * ```
 */
export const generateThumbnail = async (imageBuffer: Buffer): Promise<Buffer> => {
    logger.log('Generating thumbnail', { size: imageBuffer.length });

    try {
        const thumbnail = await sharp(imageBuffer)
            // Auto-rotate based on EXIF orientation tag
            .rotate()
            // Resize to target width, maintain aspect ratio
            .resize(THUMBNAIL_WIDTH, undefined, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            // Convert to JPEG with quality setting
            .jpeg({
                quality: THUMBNAIL_QUALITY,
                mozjpeg: true, // Use mozjpeg for better compression
            })
            .toBuffer();

        logger.log('Thumbnail generated', { originalSize: imageBuffer.length, thumbnailSize: thumbnail.length });

        return thumbnail;
    } catch (error) {
        logger.warn('Failed to generate thumbnail', error);
        throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Correct EXIF orientation in an image.
 *
 * @param imageBuffer - Original image data as Buffer
 * @returns Promise resolving to corrected image data as Buffer (same format as input)
 *
 * @remarks
 * Many cameras and phones store rotation information in EXIF metadata rather than
 * physically rotating the pixels. This function reads the EXIF orientation tag and
 * rotates/flips the image data accordingly, then removes the orientation tag.
 *
 * This ensures the image displays correctly in all viewers, even those that don't
 * support EXIF orientation.
 *
 * @example
 * ```typescript
 * const rotatedImage = await fs.promises.readFile('IMG_1234.jpg');
 * const corrected = await correctOrientation(rotatedImage);
 * await fs.promises.writeFile('corrected.jpg', corrected);
 * ```
 */
export const correctOrientation = async (imageBuffer: Buffer): Promise<Buffer> => {
    logger.log('Correcting image orientation', { size: imageBuffer.length });

    try {
        const corrected = await sharp(imageBuffer)
            // Auto-rotate based on EXIF orientation tag
            .rotate()
            // Preserve original format and quality
            .toBuffer();

        logger.log('Orientation corrected', { originalSize: imageBuffer.length, correctedSize: corrected.length });

        return corrected;
    } catch (error) {
        logger.warn('Failed to correct orientation', error);
        throw new Error(`Failed to correct orientation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Get image metadata (dimensions, format, orientation).
 *
 * @param imageBuffer - Image data as Buffer
 * @returns Promise resolving to image metadata
 *
 * @example
 * ```typescript
 * const image = await fs.promises.readFile('photo.jpg');
 * const metadata = await getImageMetadata(image);
 * console.log(`Image is ${metadata.width}x${metadata.height} ${metadata.format}`);
 * ```
 */
export const getImageMetadata = async (
    imageBuffer: Buffer
): Promise<{
    width: number | undefined;
    height: number | undefined;
    format: string | undefined;
    orientation: number | undefined;
}> => {
    try {
        const metadata = await sharp(imageBuffer).metadata();

        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            orientation: metadata.orientation,
        };
    } catch (error) {
        logger.warn('Failed to get image metadata', error);
        throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
