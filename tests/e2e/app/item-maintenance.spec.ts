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

    test('filters descendant containers out of move targets', async ({ page }) => {
        const parentId = await createItem(page, { name: 'Parent Container', isContainer: true });
        const childId = await createItem(page, {
            name: 'Child Container',
            isContainer: true,
            containerId: parentId,
        });
        await createItem(page, {
            name: 'Grandchild Container',
            isContainer: true,
            containerId: childId,
        });
        await createItem(page, { name: 'Other Container', isContainer: true });

        await page.goto(`/items/${parentId}`);
        await page.getByRole('button', { name: /Move$/ }).click();

        await expect(page.getByText('Root (No Container)', { exact: true })).toBeVisible();
        await expect(page.getByText('Other Container', { exact: true })).toBeVisible();
        await expect(page.getByText('Child Container', { exact: true })).not.toBeVisible();
        await expect(page.getByText('Grandchild Container', { exact: true })).not.toBeVisible();
    });

    test('confirms item deletion before removing an item', async ({ page }) => {
        const itemId = await createItem(page, { name: 'Disposable Item' });

        await page.goto(`/items/${itemId}`);
        await page.getByRole('button', { name: /Delete$/ }).click();

        await expect(page.getByText('Delete "Disposable Item"? This cannot be undone.')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('heading', { name: 'Disposable Item' })).toBeVisible();

        await page.getByRole('button', { name: /Delete$/ }).click();
        await page.getByRole('button', { name: 'Delete Item' }).click();

        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByText('Disposable Item', { exact: true })).not.toBeVisible();
    });

    test('surfaces delete errors for non-empty containers', async ({ page }) => {
        const parentId = await createItem(page, { name: 'Full Container', isContainer: true });
        await createItem(page, { name: 'Contained Item', containerId: parentId });

        await page.goto(`/items/${parentId}`);
        await page.getByRole('button', { name: /Delete$/ }).click();
        await page.getByRole('button', { name: 'Delete Item' }).click();

        await expect(page.getByText(/Cannot delete container with 1 child item/)).toBeVisible();
        await expect(page.getByText('Delete "Full Container"? This cannot be undone.')).toBeVisible();
    });
});
