/**
 * Shared reactive metadata boundary for item attachments.
 * Defines the client collection and ready-only publication; byte validation,
 * HTTP transport, and GridFS lifecycle work remain server responsibilities.
 */
import { Meteor } from 'meteor/meteor';

import type { Attachment } from '/imports/model/Attachment';
import { NamedCollection } from '/imports/utility/NamedCollection';

/**
 * Attachments collection for photos and PDF documents
 *
 * Stores metadata for files uploaded to GridFS
 * The ready publication currently supports JPEG, PNG, and PDF metadata.
 * Max file size: 20MB per file
 */
export const Attachments = new NamedCollection<Attachment>('attachments');

if (Meteor.isServer) {
    Meteor.publish('attachments.byItem', function publishAttachmentsByItem(itemId: string) {
        if (typeof itemId !== 'string' || itemId.trim() === '') {
            this.ready();
            return;
        }

        return Attachments.find({ itemId, storageState: 'ready' }, { sort: { order: 1, createdAt: 1, _id: 1 } });
    });
}

export default Attachments;
