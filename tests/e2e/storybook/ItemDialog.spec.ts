import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

const openDialog = async (page: Parameters<typeof gotoStory>[0]): Promise<void> => {
    await page.getByRole('button', { name: 'Open Item Dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Item dialog' })).toBeVisible();
};

test.describe('ItemDialog', () => {
    test.beforeEach(async ({ page }) => {
        await gotoStory(page, 'ui-itemdialog', 'interactive');
    });

    test('dismisses by pointer, Enter, and Space', async ({ page }) => {
        const status = page.getByTestId('dialog-status');

        await openDialog(page);
        await page.getByRole('button', { name: 'Close Edit Item dialog' }).click();
        await expect(status).toHaveText('Closed');

        for (const key of ['Enter', 'Space']) {
            await openDialog(page);
            const closeButton = page.getByRole('button', { name: 'Close Edit Item dialog' });
            await closeButton.focus();
            await page.keyboard.press(key);
            await expect(status).toHaveText('Closed');
        }
    });

    test('dismisses by Escape and outside click', async ({ page }) => {
        const status = page.getByTestId('dialog-status');

        await openDialog(page);
        await page.keyboard.press('Escape');
        await expect(status).toHaveText('Closed');

        await openDialog(page);
        await page.mouse.click(4, 4);
        await expect(status).toHaveText('Closed');
    });

    test('keeps the named close control inside a 320px phone viewport', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 700 });
        await openDialog(page);

        const closeButton = page.getByRole('button', { name: 'Close Edit Item dialog' });
        await expect.poll(async () => (await closeButton.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
        const box = await closeButton.boundingBox();
        if (box === null) throw new Error('Close control has no bounding box');

        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
        expect(box.y + box.height).toBeLessThanOrEqual(700);
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
    });
});
