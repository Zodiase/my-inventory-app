import type { Attachment } from '/imports/model/Attachment';
import { NamedCollection } from '/imports/utility/NamedCollection';

/**
 * Attachments collection for photos and PDF documents
 *
 * Stores metadata for files uploaded to GridFS
 * Supports photos (JPEG, PNG, HEIC) and PDFs (documents)
 * Max file size: 20MB per file
 */
export const Attachments = new NamedCollection<Attachment>('attachments');
