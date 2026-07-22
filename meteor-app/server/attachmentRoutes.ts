/**
 * HTTP transport for item attachment bytes and lifecycle operations.
 * Parses a narrow same-origin API surface and delegates all metadata/GridFS
 * transitions to the attachment service rather than owning storage logic.
 */
import type { IncomingMessage, ServerResponse } from 'http';

import { WebApp } from 'meteor/webapp';

import {
    assertAttachmentId,
    ATTACHMENT_HTTP_STATUS,
    AttachmentRequestError,
    buildAttachmentContentDisposition,
    MAX_ATTACHMENT_BYTES,
} from '/imports/api/attachmentValidation';
import createLogger from '/imports/utility/Logger';

import {
    assertAttachmentBlobExists,
    createAttachment,
    deleteAttachment,
    getReadyAttachment,
} from './attachmentService';
import { downloadFromGridFS } from './gridfs';

const logger = createLogger(module);
const REQUEST_MARKER_HEADER = 'x-inventory-attachment-request';
const FILENAME_HEADER = 'x-inventory-filename';
const COLLECTION_ROUTE_SEGMENT_COUNT = 2;
const MEMBER_ROUTE_SEGMENT_COUNT = 3;
const CONTENT_ROUTE_SEGMENT_COUNT = 4;

type NextFunction = () => void;
type AttachmentHttpHandler = (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction
) => void | Promise<void>;
type WebAppWithHandlers = typeof WebApp & {
    handlers: {
        use: (path: string, handler: AttachmentHttpHandler) => void;
    };
};

const webAppWithHandlers = WebApp as WebAppWithHandlers;

const getSingleHeader = (request: IncomingMessage, name: string): string | undefined => {
    const value = request.headers[name];
    return typeof value === 'string' ? value : undefined;
};

const assertStateChangingRequest = (request: IncomingMessage): void => {
    if (getSingleHeader(request, REQUEST_MARKER_HEADER) !== '1') {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            'The attachment request marker is missing.'
        );
    }

    const fetchSite = getSingleHeader(request, 'sec-fetch-site');
    if (fetchSite !== undefined && fetchSite !== 'same-origin') {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            'Cross-origin attachment requests are not allowed.'
        );
    }

    const origin = getSingleHeader(request, 'origin');
    const host = getSingleHeader(request, 'x-forwarded-host') ?? getSingleHeader(request, 'host');
    if (origin !== undefined && host !== undefined) {
        const originHost = (() => {
            try {
                return new URL(origin).host;
            } catch {
                throw new AttachmentRequestError(
                    ATTACHMENT_HTTP_STATUS.badRequest,
                    'invalid-request',
                    'The request origin is invalid.'
                );
            }
        })();

        if (originHost !== host) {
            throw new AttachmentRequestError(
                ATTACHMENT_HTTP_STATUS.badRequest,
                'invalid-request',
                'Cross-origin attachment requests are not allowed.'
            );
        }
    }
};

const assertContentLength = (request: IncomingMessage): void => {
    const value = getSingleHeader(request, 'content-length');
    if (value === undefined) return;

    const length = Number(value);
    if (!Number.isSafeInteger(length) || length < 0) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.badRequest,
            'invalid-request',
            'The request length is invalid.'
        );
    }

    if (length > MAX_ATTACHMENT_BYTES) {
        throw new AttachmentRequestError(
            ATTACHMENT_HTTP_STATUS.contentTooLarge,
            'file-too-large',
            'Attachments must be 20 MiB or smaller.'
        );
    }
};

const readAttachmentBody = async (request: IncomingMessage): Promise<Buffer> => {
    assertContentLength(request);

    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let length = 0;
        let settled = false;

        const fail = (error: Error): void => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        request.on('data', (chunk: Buffer | string) => {
            if (settled) return;
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            length += buffer.length;

            if (length > MAX_ATTACHMENT_BYTES) {
                request.resume();
                fail(
                    new AttachmentRequestError(
                        ATTACHMENT_HTTP_STATUS.contentTooLarge,
                        'file-too-large',
                        'Attachments must be 20 MiB or smaller.'
                    )
                );
                return;
            }

            chunks.push(buffer);
        });
        request.once('aborted', () => {
            fail(
                new AttachmentRequestError(
                    ATTACHMENT_HTTP_STATUS.badRequest,
                    'invalid-request',
                    'The attachment upload was interrupted.'
                )
            );
        });
        request.once('error', (error) => {
            fail(error);
        });
        request.once('end', () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks, length));
        });
    });
};

const sendJson = (response: ServerResponse, status: number, body: unknown): void => {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify(body));
};

const sendError = (response: ServerResponse, error: unknown): void => {
    if (error instanceof AttachmentRequestError) {
        sendJson(response, error.status, { error: error.code, message: error.message });
        return;
    }

    logger.warn('Unexpected attachment route error', error);
    sendJson(response, ATTACHMENT_HTTP_STATUS.internalServerError, {
        error: 'storage-error',
        message: 'The attachment operation failed.',
    });
};

const decodeId = (encodedValue: string, label: 'item' | 'attachment'): string => {
    try {
        return assertAttachmentId(decodeURIComponent(encodedValue), label);
    } catch (error) {
        if (error instanceof URIError) {
            throw new AttachmentRequestError(
                ATTACHMENT_HTTP_STATUS.badRequest,
                'invalid-request',
                `The ${label} ID encoding is invalid.`
            );
        }
        throw error;
    }
};

const streamAttachment = async (
    response: ServerResponse,
    fileId: string,
    mimeType: string,
    contentDisposition: string
): Promise<void> => {
    const contentLength = await assertAttachmentBlobExists(fileId);
    const stream = downloadFromGridFS(fileId);

    response.writeHead(ATTACHMENT_HTTP_STATUS.ok, {
        'Content-Type': mimeType,
        'Content-Length': contentLength,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    stream.once('error', (error) => {
        logger.warn('Attachment download stream failed', error);
        response.destroy();
    });
    stream.pipe(response);
};

const handleAttachmentRequest: AttachmentHttpHandler = async (request, response, next) => {
    const requestUrl = new URL(request.url ?? '/', 'http://inventory.local');
    const segments = requestUrl.pathname.split('/').filter((segment) => segment !== '');
    const [encodedItemId, collectionSegment, encodedAttachmentId, contentSegment] = segments;

    const isCollectionRoute = segments.length === COLLECTION_ROUTE_SEGMENT_COUNT && collectionSegment === 'attachments';
    const isMemberRoute = segments.length === MEMBER_ROUTE_SEGMENT_COUNT && collectionSegment === 'attachments';
    const isContentRoute =
        segments.length === CONTENT_ROUTE_SEGMENT_COUNT &&
        collectionSegment === 'attachments' &&
        (contentSegment === 'content' || contentSegment === 'thumbnail');

    if (!isCollectionRoute && !isMemberRoute && !isContentRoute) {
        next();
        return;
    }

    try {
        const itemId = decodeId(encodedItemId, 'item');

        if (isCollectionRoute) {
            if (request.method !== 'POST') {
                sendJson(response, ATTACHMENT_HTTP_STATUS.methodNotAllowed, {
                    error: 'method-not-allowed',
                    message: 'Use POST to upload an attachment.',
                });
                return;
            }

            assertStateChangingRequest(request);
            const bytes = await readAttachmentBody(request);
            const attachment = await createAttachment(itemId, getSingleHeader(request, FILENAME_HEADER), bytes);
            sendJson(response, ATTACHMENT_HTTP_STATUS.created, attachment);
            return;
        }

        const attachmentId = decodeId(encodedAttachmentId, 'attachment');

        if (isMemberRoute) {
            if (request.method !== 'DELETE') {
                sendJson(response, ATTACHMENT_HTTP_STATUS.methodNotAllowed, {
                    error: 'method-not-allowed',
                    message: 'Use DELETE to remove an attachment.',
                });
                return;
            }

            assertStateChangingRequest(request);
            await deleteAttachment(itemId, attachmentId);
            response.writeHead(ATTACHMENT_HTTP_STATUS.noContent, { 'Cache-Control': 'private, no-store' });
            response.end();
            return;
        }

        if (request.method !== 'GET') {
            sendJson(response, ATTACHMENT_HTTP_STATUS.methodNotAllowed, {
                error: 'method-not-allowed',
                message: 'Use GET to download an attachment.',
            });
            return;
        }

        const attachment = await getReadyAttachment(itemId, attachmentId);
        if (contentSegment === 'thumbnail') {
            if (attachment.thumbnailId === undefined) {
                throw new AttachmentRequestError(
                    ATTACHMENT_HTTP_STATUS.notFound,
                    'not-found',
                    'The attachment thumbnail was not found.'
                );
            }
            await streamAttachment(response, attachment.thumbnailId, 'image/jpeg', 'inline');
        } else {
            await streamAttachment(
                response,
                attachment.fileId,
                attachment.mimeType,
                buildAttachmentContentDisposition(attachment.originalFilename)
            );
        }
    } catch (error) {
        if (!response.headersSent) {
            sendError(response, error);
        } else {
            logger.warn('Attachment request failed after headers were sent', error);
            response.destroy();
        }
    }
};

export const registerAttachmentRoutes = (): void => {
    webAppWithHandlers.handlers.use('/api/items', handleAttachmentRequest);
};
