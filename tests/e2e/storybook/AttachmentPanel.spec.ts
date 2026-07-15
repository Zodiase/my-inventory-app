import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('AttachmentPanel (Storybook)', () => {
    test('shows the empty and failed-preview states', async ({ page }) => {
        await gotoStory(page, 'ui-attachmentpanel', 'empty');
        await expect(page.getByText('No attachments yet.')).toBeVisible();

        await gotoStory(page, 'ui-attachmentpanel', 'missing-thumbnail');
        await expect(page.getByText('Preview unavailable')).toBeVisible();
    });

    test('uploads and deletes through the confirmation flow', async ({ page }) => {
        await gotoStory(page, 'ui-attachmentpanel', 'interactive');
        await expect(page.getByTestId('attachment-story-count')).toHaveText('1');

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'warranty.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.7\n%%EOF'),
        });
        await page.getByRole('button', { name: 'Upload attachment' }).click();

        await expect(page.getByTestId('attachment-story-count')).toHaveText('2');
        await expect(page.getByTestId('attachment-story-action')).toHaveText('Uploaded warranty.pdf');

        const uploadedRow = page.getByTestId('attachment-row').filter({ hasText: 'warranty.pdf' });
        await uploadedRow.getByRole('button', { name: 'Delete' }).click();
        await uploadedRow.getByRole('button', { name: 'Delete attachment' }).click();

        await expect(page.getByTestId('attachment-story-count')).toHaveText('1');
        await expect(page.getByTestId('attachment-story-action')).toHaveText('Deleted warranty.pdf');
    });

    test('rejects files larger than 20 MiB before upload', async ({ page }) => {
        await gotoStory(page, 'ui-attachmentpanel', 'interactive');

        await page.getByTestId('attachment-file-input').setInputFiles({
            name: 'too-large.png',
            mimeType: 'image/png',
            buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
        });

        await expect(page.getByTestId('attachment-selection-error')).toHaveText(
            'Choose a file that is 20 MiB or smaller.'
        );
        await expect(page.getByRole('button', { name: 'Upload attachment' })).toBeDisabled();
        await expect(page.getByTestId('attachment-story-count')).toHaveText('1');
    });
});
