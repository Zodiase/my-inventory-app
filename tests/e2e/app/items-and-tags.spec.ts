import { expect, test, type Page } from '@playwright/test';
import { resetDatabase, waitForMeteorReady, callMeteorMethod } from '../helpers/database';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
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

const expectItemNameToBeTruncated = async (page: Page, name: string): Promise<void> => {
    const rowLink = page.getByRole('link', { name: `View item ${name}` });
    await expect(rowLink).toBeVisible();

    const nameText = rowLink.getByText(name, { exact: true });
    const metrics = await nameText.evaluate((element) => {
        const textElement = element as HTMLElement;
        const rowElement = textElement.closest('a') as HTMLElement | null;
        const textStyle = window.getComputedStyle(textElement);
        const textRect = textElement.getBoundingClientRect();
        const rowRect = rowElement?.getBoundingClientRect();

        return {
            bodyClientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.documentElement.scrollWidth,
            rowRight: rowRect?.right ?? 0,
            textClientWidth: textElement.clientWidth,
            textOverflow: textStyle.textOverflow,
            textRight: textRect.right,
            textScrollWidth: textElement.scrollWidth,
            whiteSpace: textStyle.whiteSpace,
        };
    });

    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth);
    expect(metrics.textRight).toBeLessThanOrEqual(metrics.rowRight + 1);
    expect(metrics.textScrollWidth).toBeGreaterThan(metrics.textClientWidth);
    expect(metrics.textOverflow).toBe('ellipsis');
    expect(metrics.whiteSpace).toBe('nowrap');
};

test.describe('Items view', () => {
    test('sorts containers and items naturally by number', async ({ page }) => {
        await callMeteorMethod<string>(page, 'createItem', {
            name: 'Cable 10',
        });
        await callMeteorMethod<string>(page, 'createItem', {
            name: 'Box 10',
            isContainer: true,
        });
        await callMeteorMethod<string>(page, 'createItem', {
            name: 'Cable 2',
        });
        await callMeteorMethod<string>(page, 'createItem', {
            name: 'Box 2',
            isContainer: true,
        });

        await reloadAndWait(page);

        const inventoryLinks = page.getByTestId('items-list').getByRole('link');
        await expect(inventoryLinks).toHaveCount(4);
        const sortedAccessibleNames = await inventoryLinks.evaluateAll((links) =>
            links.map((link) => link.getAttribute('aria-label'))
        );
        expect(sortedAccessibleNames).toEqual([
            'Open container Box 2',
            'Open container Box 10',
            'View item Cable 2',
            'View item Cable 10',
        ]);
    });

    test('truncates very long item names at desktop and mobile widths', async ({ page }) => {
        const longItemName =
            'A very long item name that exceeds typical lengths and should be truncated by the UI to verify that text overflow behavior is working correctly across item list viewports, desktop screenshots, and narrow mobile screens without creating horizontal scrolling';

        await callMeteorMethod<string>(page, 'createItem', {
            name: longItemName,
        });

        for (const viewport of [
            { width: 1280, height: 720 },
            { width: 390, height: 844 },
        ]) {
            await page.setViewportSize(viewport);
            await reloadAndWait(page);
            await expectItemNameToBeTruncated(page, longItemName);
        }
    });

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

    test('creates new items inside the current container via the UI', async ({ page }) => {
        const containerName = `Garage Shelf ${Date.now()}`;
        const nestedItemName = `Power Drill ${Date.now()}`;

        await page.getByRole('button', { name: 'Create Item' }).first().click();
        await page.locator('input[name="name"]').fill(containerName);
        const containerForm = page.locator('form');
        await containerForm.locator('input[name="isContainer"]').scrollIntoViewIfNeeded();
        await containerForm.getByText('This item is a container (can hold other items)').click();
        await containerForm.evaluate((form: HTMLFormElement) => {
            form.requestSubmit();
        });
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible({ timeout: 10000 });

        await getListItemLocator(page, containerName).click();
        await expect(page.getByText('No items at this level')).toBeVisible();

        await page.getByRole('button', { name: 'Create Item' }).first().click();
        await page.locator('input[name="name"]').fill(nestedItemName);
        const nestedItemForm = page.locator('form');
        await nestedItemForm.evaluate((form: HTMLFormElement) => {
            form.requestSubmit();
        });
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible({ timeout: 10000 });

        await expect(getListItemLocator(page, nestedItemName)).toBeVisible();
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
        await expect(page).toHaveURL(new RegExp(`/container/${rootContainerId}$`));
        await expect(getListItemLocator(page, childContainerName)).toBeVisible();

        await getListItemLocator(page, childContainerName).click();
        await expect(page).toHaveURL(new RegExp(`/container/${childContainerId}$`));
        await expect(getListItemLocator(page, leafItemName)).toBeVisible();

        const breadcrumbButton = page.getByRole('button', { name: `Navigate to ${rootContainerName}` });
        await expect(breadcrumbButton).toBeVisible();
        await breadcrumbButton.click();

        await expect(page).toHaveURL(new RegExp(`/container/${rootContainerId}$`));
        await expect(getListItemLocator(page, childContainerName)).toBeVisible();
    });
});

test.describe('Tags view', () => {
    test('supports creating, renaming, and deleting tags', async ({ page }) => {
        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Tags' })
            .click();

        const tagName = `Tag ${Date.now()}`;
        await page
            .getByRole('button', { name: /new tag/i })
            .first()
            .click();
        await page.locator('input[name="name"]').fill(tagName);
        await page.getByRole('button', { name: /create tag/i }).click();
        await expect(page.locator('input[name="name"]')).not.toBeVisible({ timeout: 10000 });
        const tagRow = page.locator('.tag-body', { hasText: tagName }).first();
        await expect(tagRow).toBeVisible();

        const renamedTag = `${tagName} Updated`;
        await tagRow.hover();
        await tagRow.locator('.rename-tag-action').click();
        await page.locator('input[name="name"]').fill(renamedTag);
        await page.getByRole('button', { name: 'Rename' }).click();
        await expect(page.locator('.tag-body', { hasText: renamedTag }).first()).toBeVisible({ timeout: 10000 });

        await page.locator('.tag-body', { hasText: renamedTag }).first().hover();
        await page.locator('.tag-body', { hasText: renamedTag }).first().locator('.remove-tag-action').click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
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

        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Tags' })
            .click();
        await expect(page.locator('.tag-body', { hasText: tagName }).filter({ hasText: '1 item' })).toBeVisible({
            timeout: 10000,
        });
    });

    test('shows parent container location for tagged nested items', async ({ page }) => {
        const tagName = `Nested ${Date.now()}`;
        const containerName = `Nested Bin ${Date.now()}`;
        const itemName = `Tagged Nested Item ${Date.now()}`;

        const tagId = await callMeteorMethod<string>(page, 'createTag', { name: tagName });
        const containerId = await callMeteorMethod<string>(page, 'createItem', {
            name: containerName,
            isContainer: true,
        });
        const itemId = await callMeteorMethod<string>(page, 'createItem', {
            name: itemName,
            containerId,
            tagIds: [tagId],
        });

        await page.goto(`/tags/${tagId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: `Items tagged with: ${tagName}` })).toBeVisible();
        await expect(page.locator(`[data-item-id="${itemId}"]`)).toContainText(`Location: ${containerName}`);
    });
});
