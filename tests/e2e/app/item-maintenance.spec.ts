import { expect, test } from '@playwright/test';

import { createItem, createTag } from '../helpers/factories';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';

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
        await page.getByRole('button', { name: 'Move Item', exact: true }).click();

        await page.goto('/');
        await page.getByText('Gear Closet', { exact: true }).click();
        await expect(page.getByText('Updated Tent', { exact: true })).toBeVisible();
    });

    test('shows nested item location breadcrumbs on direct item links', async ({ page }) => {
        const rootContainerId = await createItem(page, {
            name: 'Maintenance Room',
            isContainer: true,
        });
        const shelfId = await createItem(page, {
            name: 'Maintenance Shelf',
            isContainer: true,
            containerId: rootContainerId,
        });
        const itemId = await createItem(page, {
            name: 'Nested Maintenance Item',
            containerId: shelfId,
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Nested Maintenance Item' })).toBeVisible();
        await expect(page.getByText('Location:')).toBeVisible();
        await expect(page.getByText('Maintenance Room', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Navigate to Maintenance Room' })).toBeVisible();
        await expect(page.getByText('Maintenance Shelf', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Navigate to Maintenance Shelf' })).toBeVisible();

        await page.getByRole('button', { name: 'Navigate to Maintenance Shelf' }).click();
        await expect(page).toHaveURL(new RegExp(`/container/${shelfId}$`));
        await expect(page.getByText('Nested Maintenance Item', { exact: true })).toBeVisible();
    });

    test('keeps direct item breadcrumbs finite when container ancestry is cyclic', async ({ page }) => {
        const parentId = await createItem(page, {
            name: 'Cycle Parent',
            isContainer: true,
        });
        const childId = await createItem(page, {
            name: 'Cycle Child',
            isContainer: true,
            containerId: parentId,
        });
        const itemId = await createItem(page, {
            name: 'Cycle Guard Item',
            containerId: childId,
        });

        const forcedContainerUpdateCount = await callMeteorMethod<number>(
            page,
            'test.forceItemContainer',
            parentId,
            childId
        );
        expect(forcedContainerUpdateCount).toBe(1);

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Cycle Guard Item' })).toBeVisible();
        await expect(page.getByText('Location:')).toBeVisible();
        await expect(page.getByText('Cycle Parent', { exact: true })).toHaveCount(1);
        await expect(page.getByText('Cycle Child', { exact: true })).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Navigate to Cycle Parent' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Navigate to Cycle Child' })).toBeVisible();

        await page.getByRole('button', { name: 'Navigate to Cycle Child' }).click();
        await expect(page).toHaveURL(new RegExp(`/container/${childId}$`));
        await expect(page.getByText('Cycle Guard Item', { exact: true })).toBeVisible();
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

    test('filters descendant containers out of search result detail move targets', async ({ page }) => {
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

        await page.goto('/search');
        await waitForMeteorReady(page);
        await page.getByRole('textbox', { name: 'Search query' }).fill('Parent Container');
        await page.getByRole('button', { name: 'Submit search' }).click();
        await page.locator('button').filter({ hasText: 'Parent Container' }).first().click();

        await expect(page).toHaveURL(new RegExp(`/items/${parentId}$`));
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
        await page.getByRole('button', { name: 'Delete Item', exact: true }).click();

        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByText('Disposable Item', { exact: true })).not.toBeVisible();
    });

    test('surfaces delete errors for non-empty containers', async ({ page }) => {
        const parentId = await createItem(page, { name: 'Full Container', isContainer: true });
        await createItem(page, { name: 'Contained Item', containerId: parentId });

        await page.goto(`/items/${parentId}`);
        await page.getByRole('button', { name: /Delete$/ }).click();
        await page.getByRole('button', { name: 'Delete Item', exact: true }).click();

        await expect(page.getByText(/Cannot delete container with 1 child item/)).toBeVisible();
        await expect(page.getByText('Delete "Full Container"? This cannot be undone.')).toBeVisible();
    });
});
