import { expect, test } from '@playwright/test';

import { createItem, createTag } from '../helpers/factories';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('Item maintenance happy paths', () => {
    test('edits item details, applies a tag, and moves the item to a container', async ({ page }) => {
        const itemId = await createItem(page, {
            name: 'Maintenance Tent',
            description: 'Original description',
        });
        await createTag(page, { name: 'Camping Gear' });
        await createItem(page, { name: 'Gear Closet', isContainer: true });

        await page.goto(`/items/${itemId}`);
        await expect(page.getByRole('heading', { name: 'Maintenance Tent' })).toBeVisible();

        await page.getByRole('button', { name: 'Edit' }).click();
        await page.locator('input[name="name"]').fill('Updated Tent');
        await page.locator('textarea[name="description"]').fill('Ready for summer camping');
        await page.getByText('Camping Gear', { exact: true }).click();
        await page.getByRole('button', { name: 'Save Changes' }).click();

        await expect(page.locator('textarea[name="description"]')).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'Updated Tent' })).toBeVisible();
        await expect(page.getByText('Ready for summer camping')).toBeVisible();
        await expect(page.getByText('Camping Gear', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: /Move$/ }).click();
        await page.getByText('Gear Closet', { exact: true }).click();
        await page.getByRole('button', { name: 'Move Item' }).click();

        await page.goto('/');
        await page.getByText('Gear Closet', { exact: true }).click();
        await expect(page.getByText('Updated Tent', { exact: true })).toBeVisible();
    });
});
