import assert from 'assert';

import {
    assertAttachmentId,
    AttachmentRequestError,
    buildAttachmentContentDisposition,
    decodeAndSanitizeFilename,
    detectAttachmentType,
    MAX_ATTACHMENT_BYTES,
} from './attachmentValidation';

describe('attachmentValidation', function () {
    it('uses an exact 20 MiB limit', function () {
        assert.strictEqual(MAX_ATTACHMENT_BYTES, 20 * 1024 * 1024);
    });

    it('detects supported types from bytes', function () {
        assert.deepStrictEqual(detectAttachmentType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), {
            type: 'photo',
            mimeType: 'image/jpeg',
        });
        assert.deepStrictEqual(
            detectAttachmentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
            { type: 'photo', mimeType: 'image/png' }
        );
        assert.deepStrictEqual(detectAttachmentType(new TextEncoder().encode('%PDF-1.7')), {
            type: 'pdf',
            mimeType: 'application/pdf',
        });
    });

    it('rejects unsupported and truncated signatures', function () {
        for (const bytes of [new TextEncoder().encode('plain text'), Uint8Array.from([0xff, 0xd8])]) {
            assert.throws(
                () => detectAttachmentType(bytes),
                (error: unknown) =>
                    error instanceof AttachmentRequestError && error.status === 400 && error.code === 'unsupported-file'
            );
        }
    });

    it('decodes, normalizes, and sanitizes filenames', function () {
        assert.strictEqual(decodeAndSanitizeFilename(encodeURIComponent(' café receipt.pdf ')), 'café receipt.pdf');
        assert.strictEqual(
            decodeAndSanitizeFilename(encodeURIComponent('../folder\\receipt\r\n.pdf')),
            '..folderreceipt.pdf'
        );
        assert.strictEqual(decodeAndSanitizeFilename(encodeURIComponent('/\\\r\n')), 'attachment');
        assert.strictEqual(Array.from(decodeAndSanitizeFilename(encodeURIComponent('😀'.repeat(300)))).length, 255);
    });

    it('rejects missing and malformed filename encodings', function () {
        assert.throws(() => decodeAndSanitizeFilename(undefined), /filename is required/u);
        assert.throws(() => decodeAndSanitizeFilename('%E0%A4%A'), /encoding is invalid/u);
    });

    it('validates Meteor-style IDs', function () {
        assert.strictEqual(assertAttachmentId('Abc_123-def', 'item'), 'Abc_123-def');
        assert.throws(() => assertAttachmentId('../item', 'item'), /item ID is invalid/u);
        assert.throws(() => assertAttachmentId('', 'attachment'), /attachment ID is invalid/u);
    });

    it('builds safe ASCII and UTF-8 download filenames', function () {
        assert.strictEqual(
            buildAttachmentContentDisposition('café "receipt".pdf'),
            'attachment; filename="caf_ _receipt_.pdf"; filename*=UTF-8\'\'caf%C3%A9%20%22receipt%22.pdf'
        );
    });
});
