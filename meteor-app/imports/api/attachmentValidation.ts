/**
 * Pure validation and response-header helpers for the attachment boundary.
 * Kept free of Meteor and storage I/O so untrusted request inputs can be tested
 * consistently before the server allocates metadata or GridFS blobs.
 */

// File-size and protocol constants are intentionally exact external-boundary values.
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const ATTACHMENT_HTTP_STATUS = {
    ok: 200,
    created: 201,
    noContent: 204,
    badRequest: 400,
    notFound: 404,
    methodNotAllowed: 405,
    conflict: 409,
    contentTooLarge: 413,
    internalServerError: 500,
} as const;

const MAX_FILENAME_CODE_POINTS = 255;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- standardized file signatures
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- standardized file signatures
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- standardized file signatures
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const HEX_RADIX = 16;

export interface ValidatedAttachmentType {
    type: 'photo' | 'pdf';
    mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
}

export class AttachmentRequestError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
        super(message);
        this.name = 'AttachmentRequestError';
    }
}

const beginsWith = (bytes: Uint8Array, signature: readonly number[]): boolean => {
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
};

export const detectAttachmentType = (bytes: Uint8Array): ValidatedAttachmentType => {
    if (beginsWith(bytes, JPEG_SIGNATURE)) {
        return { type: 'photo', mimeType: 'image/jpeg' };
    }

    if (beginsWith(bytes, PNG_SIGNATURE)) {
        return { type: 'photo', mimeType: 'image/png' };
    }

    if (beginsWith(bytes, PDF_SIGNATURE)) {
        return { type: 'pdf', mimeType: 'application/pdf' };
    }

    throw new AttachmentRequestError(
        ATTACHMENT_HTTP_STATUS.badRequest,
        'unsupported-file',
        'Choose a valid JPEG, PNG, or PDF file.'
    );
};

export const decodeAndSanitizeFilename = (encodedFilename: string | undefined): string => {
    if (encodedFilename === undefined || encodedFilename === '') {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            'A filename is required.'
        );
    }

    const decoded = (() => {
        try {
            return decodeURIComponent(encodedFilename);
        } catch {
            throw new AttachmentRequestError(
                ATTACHMENT_HTTP_STATUS.badRequest,
                'invalid-request',
                'The filename encoding is invalid.'
            );
        }
    })();

    const sanitized = Array.from(
        decoded
            .normalize('NFC')
            // eslint-disable-next-line no-control-regex -- removing HTTP header/path hazards is intentional
            .replace(/[\u0000-\u001f\u007f/\\]/gu, '')
            .trim()
    )
        .slice(0, MAX_FILENAME_CODE_POINTS)
        .join('');

    return sanitized === '' ? 'attachment' : sanitized;
};

export const assertAttachmentId = (value: string, label: 'item' | 'attachment'): string => {
    if (!ID_PATTERN.test(value)) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            `The ${label} ID is invalid.`
        );
    }

    return value;
};

const encodeRfc5987Value = (value: string): string => {
    return encodeURIComponent(value).replace(/[!'()*]/gu, (character) => {
        return `%${character.charCodeAt(0).toString(HEX_RADIX).toUpperCase()}`;
    });
};

export const buildAttachmentContentDisposition = (filename: string): string => {
    const replacedFallback = filename.replace(/[^\x20-\x7e]|["\\]/gu, '_');
    const asciiFallback = replacedFallback === '' ? 'attachment' : replacedFallback;
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987Value(filename)}`;
};
