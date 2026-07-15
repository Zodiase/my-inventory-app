/**
 * Browser-level attachment lifecycle coverage for item details and runtime routes.
 * Verifies UI behavior, content safety, ownership boundaries, and physical blob cleanup.
 */
import { expect, test, type APIResponse, type Page } from '@playwright/test';

import { getAttachmentStorageStats, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

const PDF_BYTES = Buffer.from('%PDF-1.7\nattachment e2e fixture\n%%EOF');
const PNG_BYTES = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

interface AttachmentResponse {
    _id: string;
    itemId: string;
    originalFilename: string;
    mimeType: string;
}

const attachmentCollectionUrl = (itemId: string): string => `/api/items/${itemId}/attachments`;
const attachmentMemberUrl = (itemId: string, attachmentId: string): string =>
    `${attachmentCollectionUrl(itemId)}/${attachmentId}`;
const attachmentContentUrl = (itemId: string, attachmentId: string, target = 'content'): string =>
    `${attachmentMemberUrl(itemId, attachmentId)}/${target}`;

async function uploadAttachment(
    page: Page,
    itemId: string,
    filename: string,
    mimeType: string,
    bytes: Buffer
): Promise<{ attachment: AttachmentResponse; response: APIResponse }> {
    const response = await page.request.post(attachmentCollectionUrl(itemId), {
        headers: {
            'Content-Type': mimeType,
            'X-Inventory-Attachment-Request': '1',
            'X-Inventory-Filename': encodeURIComponent(filename),
        },
        data: bytes,
    });
    const attachment = (await response.json()) as AttachmentResponse;
    return { attachment, response };
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await expect.poll(async () => await getAttachmentStorageStats(page)).toEqual({ metadataCount: 0, fileCount: 0 });
});

test.describe('Item attachments', () => {
    test('uploads, downloads, and deletes a PDF through item details', async ({ page }) => {
        const itemId = await createItem(page, { name: 'Attachment Manual' });
        await page.goto(`/items/${itemId}`);
        await expect(page.getByRole('heading', { name: 'Attachment Manual' })).toBeVisible();

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'warranty manual.pdf',
            mimeType: 'application/pdf',
            buffer: PDF_BYTES,
        });
        await page.getByRole('button', { name: 'Upload attachment' }).click();

        const attachmentRow = page.getByTestId('attachment-row').filter({ hasText: 'warranty manual.pdf' });
        await expect(attachmentRow).toBeVisible();
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 1, fileCount: 1 });

        const contentUrl = await attachmentRow.getByRole('link', { name: 'Download' }).getAttribute('href');
        expect(contentUrl).not.toBeNull();
        const downloadResponse = await page.request.get(contentUrl ?? '');
        expect(downloadResponse.status()).toBe(200);
        expect(downloadResponse.headers()['content-type']).toContain('application/pdf');
        expect(downloadResponse.headers()['content-disposition']).toContain('filename="warranty manual.pdf"');
        expect(downloadResponse.headers()['content-disposition']).toContain("filename*=UTF-8''warranty%20manual.pdf");
        expect(await downloadResponse.body()).toEqual(PDF_BYTES);

        await attachmentRow.getByRole('button', { name: 'Delete' }).click();
        await expect(attachmentRow.getByText(/cannot be undone/)).toBeVisible();
        await attachmentRow.getByRole('button', { name: 'Delete attachment' }).click();

        await expect(attachmentRow).toHaveCount(0);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 0, fileCount: 0 });
    });

    test('renders an image thumbnail and reset removes both image blobs', async ({ page }) => {
        const itemId = await createItem(page, { name: 'Attachment Photo' });
        await page.goto(`/items/${itemId}`);

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'shelf.png',
            mimeType: 'image/png',
            buffer: PNG_BYTES,
        });
        await page.getByRole('button', { name: 'Upload attachment' }).click();

        const attachmentRow = page.getByTestId('attachment-row').filter({ hasText: 'shelf.png' });
        const preview = attachmentRow.getByRole('img', { name: 'Preview of shelf.png' });
        await expect(preview).toBeVisible();
        await expect.poll(async () => await preview.evaluate((image: HTMLImageElement) => image.complete)).toBe(true);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 1, fileCount: 2 });

        await resetDatabase(page);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 0, fileCount: 0 });
    });

    test('rejects forged and oversized files without allocating storage', async ({ page }) => {
        const itemId = await createItem(page, { name: 'Attachment Validation' });
        await page.goto(`/items/${itemId}`);

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'forged.png',
            mimeType: 'image/png',
            buffer: Buffer.from('not actually an image'),
        });
        await page.getByRole('button', { name: 'Upload attachment' }).click();
        await expect(page.getByTestId('attachment-error')).toContainText('valid JPEG, PNG, or PDF');
        await expect(page.getByTestId('attachment-row')).toHaveCount(0);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 0, fileCount: 0 });

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'too-large.png',
            mimeType: 'image/png',
            buffer: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1),
        });
        await expect(page.getByTestId('attachment-selection-error')).toContainText('20 MiB or smaller');
        await expect(page.getByRole('button', { name: 'Upload attachment' })).toBeDisabled();

        const oversizedResponse = await page.request.post(attachmentCollectionUrl(itemId), {
            headers: {
                'Content-Type': 'image/png',
                'X-Inventory-Attachment-Request': '1',
                'X-Inventory-Filename': encodeURIComponent('too-large.png'),
            },
            data: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1),
        });
        expect(oversizedResponse.status()).toBe(413);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 0, fileCount: 0 });
    });

    test('enforces item ownership on runtime download and delete routes', async ({ page }) => {
        const ownerItemId = await createItem(page, { name: 'Attachment Owner' });
        const otherItemId = await createItem(page, { name: 'Other Item' });
        const { attachment, response } = await uploadAttachment(
            page,
            ownerItemId,
            'owner.pdf',
            'application/pdf',
            PDF_BYTES
        );
        expect(response.status()).toBe(201);

        const mismatchedDownload = await page.request.get(attachmentContentUrl(otherItemId, attachment._id));
        expect(mismatchedDownload.status()).toBe(404);
        const mismatchedDelete = await page.request.delete(attachmentMemberUrl(otherItemId, attachment._id), {
            headers: { 'X-Inventory-Attachment-Request': '1' },
        });
        expect(mismatchedDelete.status()).toBe(404);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 1, fileCount: 1 });

        const ownerDelete = await page.request.delete(attachmentMemberUrl(ownerItemId, attachment._id), {
            headers: { 'X-Inventory-Attachment-Request': '1' },
        });
        expect(ownerDelete.status()).toBe(204);
        await expect
            .poll(async () => await getAttachmentStorageStats(page))
            .toEqual({ metadataCount: 0, fileCount: 0 });
    });
});
