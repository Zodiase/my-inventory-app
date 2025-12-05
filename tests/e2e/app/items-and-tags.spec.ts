import { expect, test, type Page } from '@playwright/test';
import { resetDatabase, waitForMeteorReady, callMeteorMethod } from '../helpers/database';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
});

const getListItemLocator = (page: Page, text: string) => {
    // Grommet List doesn't render proper list item roles, use text locator
    return page.locator(`text="${text}"`).first();
};

const reloadAndWait = async (page: Page): Promise<void> => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await page.waitForSelector('text=Inventory App');
};

test.describe('Items view', () => {
    test('creates container and standard items via the UI', async ({ page }) => {
        const containerName = `Container ${Date.now()}`;
        const itemName = `Item ${Date.now()}`;

        await page.getByRole('button', { name: 'Create Item' }).first().click();
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();
        await page.locator('input[name="name"]').fill(containerName);
        const modalForm = page.locator('form');
        await modalForm.locator('input[name="isContainer"]').scrollIntoViewIfNeeded();
        await modalForm.getByText('This item is a container (can hold other items)').click();
        await expect(modalForm.locator('input[name="isContainer"]')).toBeChecked();
        await modalForm.evaluate((form: HTMLFormElement) => {
            form.requestSubmit();
        });
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible({ timeout: 10000 });

        await expect(getListItemLocator(page, containerName)).toBeVisible();

        await page.getByRole('button', { name: 'Create Item' }).first().click();
        await page.locator('input[name="name"]').fill(itemName);
        const secondModalForm = page.locator('form');
        await secondModalForm.evaluate((form: HTMLFormElement) => {
            form.requestSubmit();
        });
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible({ timeout: 10000 });

        await expect(getListItemLocator(page, itemName)).toBeVisible();

        // Verify both items appear (can't rely on order since it may vary)
        await expect(page.locator(`text="${containerName}"`)).toBeVisible();
        await expect(page.locator(`text="${itemName}"`)).toBeVisible();
    });

    test('navigates nested containers with breadcrumb support', async ({ page }) => {
        const rootContainerName = `Storage ${Date.now()}`;
        const childContainerName = `Box ${Date.now()}`;
        const leafItemName = `Tool ${Date.now()}`;

        const rootContainerId = await callMeteorMethod<string>(page, 'createItem', {
            name: rootContainerName,
            isContainer: true,
        });

        const childContainerId = await callMeteorMethod<string>(page, 'createItem', {
            name: childContainerName,
            isContainer: true,
            containerId: rootContainerId,
        });

        await callMeteorMethod<string>(page, 'createItem', {
            name: leafItemName,
            containerId: childContainerId,
        });

        await reloadAndWait(page);

        await expect(getListItemLocator(page, rootContainerName)).toBeVisible();
        await getListItemLocator(page, rootContainerName).click();
        await expect(getListItemLocator(page, childContainerName)).toBeVisible();

        await getListItemLocator(page, childContainerName).click();
        await expect(getListItemLocator(page, leafItemName)).toBeVisible();

        const breadcrumbButton = page.getByRole('button', { name: `Navigate to ${rootContainerName}` });
        await expect(breadcrumbButton).toBeVisible();
        await breadcrumbButton.click();

        await expect(getListItemLocator(page, childContainerName)).toBeVisible();
    });
});

test.describe('Tags view', () => {
    test('supports creating, renaming, and deleting tags', async ({ page }) => {
        await page.getByRole('button', { name: 'Tags' }).click();

        const tagName = `Tag ${Date.now()}`;
        page.once('dialog', async (dialog) => {
            expect(dialog.type()).toBe('prompt');
            await dialog.accept(tagName);
        });
        await page.locator('[data-tag-id=""]').locator('.new-child-action').click();
        const tagRow = page.locator('.tag-body', { hasText: tagName }).first();
        await expect(tagRow).toBeVisible();

        const renamedTag = `${tagName} Updated`;
        page.once('dialog', async (dialog) => {
            expect(dialog.type()).toBe('prompt');
            await dialog.accept(renamedTag);
        });
        await tagRow.hover();
        await tagRow.locator('.rename-tag-action').click();
        await expect(page.locator('.tag-body', { hasText: renamedTag }).first()).toBeVisible({ timeout: 10000 });

        page.once('dialog', async (dialog) => {
            expect(dialog.type()).toBe('confirm');
            await dialog.accept();
        });
        await page.locator('.tag-body', { hasText: renamedTag }).first().hover();
        await page.locator('.tag-body', { hasText: renamedTag }).first().locator('.remove-tag-action').click();
        await expect(page.locator('.tag-body', { hasText: renamedTag })).toHaveCount(0);
    });

    test('displays usage counts for tagged items', async ({ page }) => {
        const tagName = `Usage ${Date.now()}`;
        const tagId = await callMeteorMethod<string>(page, 'createTag', { name: tagName });
        await callMeteorMethod<string>(page, 'createItem', {
            name: `Tagged ${Date.now()}`,
            tagIds: [tagId],
        });

        await reloadAndWait(page);

        await page.getByRole('button', { name: 'Tags' }).click();
        await expect(page.locator('.tag-body', { hasText: `${tagName} (1)` })).toBeVisible({ timeout: 10000 });
    });
});
