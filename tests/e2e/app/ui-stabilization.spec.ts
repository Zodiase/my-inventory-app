import { expect, test } from '@playwright/test';

import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

const navigationViewports = [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 430, height: 900 },
    { width: 768, height: 1024 },
] as const;

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('Milestone 1 UI stabilization', () => {
    test('renders one responsive application header without overflow', async ({ page }, testInfo) => {
        test.setTimeout(60_000);

        for (const viewport of navigationViewports) {
            await page.setViewportSize(viewport);
            await page.goto('/items');
            await waitForMeteorReady(page);

            const header = page.getByRole('banner');
            const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
            const searchLink = page.getByRole('link', { name: 'Search inventory' });

            await page.screenshot({
                path: testInfo.outputPath(`navigation-${viewport.width}px.png`),
            });

            await expect.soft(header, `${viewport.width}px application header`).toHaveCount(1);
            await expect.soft(header.getByText('Inventory', { exact: true })).toBeVisible();
            await expect.soft(menuButton).toBeVisible();
            await expect.soft(searchLink).toBeVisible();

            const hasHorizontalOverflow = await page.evaluate(() => {
                const root = document.scrollingElement ?? document.documentElement;
                return root.scrollWidth > root.clientWidth;
            });
            expect.soft(hasHorizontalOverflow, `${viewport.width}px horizontal overflow`).toBe(false);

            for (const [name, control] of [
                ['menu', menuButton],
                ['search', searchLink],
            ] as const) {
                const box = await control.boundingBox();
                if (box === null) throw new Error(`${viewport.width}px ${name} control has no bounding box`);
                expect.soft(box.width, `${viewport.width}px ${name} control width`).toBeGreaterThanOrEqual(44);
                expect.soft(box.height, `${viewport.width}px ${name} control height`).toBeGreaterThanOrEqual(44);
                expect.soft(box.x, `${viewport.width}px ${name} control left edge`).toBeGreaterThanOrEqual(0);
                expect
                    .soft(box.x + box.width, `${viewport.width}px ${name} control right edge`)
                    .toBeLessThanOrEqual(viewport.width);
            }
        }
    });

    test('tagged item results expose semantic item routes', async ({ page }, testInfo) => {
        const tagId = await createTag(page, { name: 'Route Tag' });
        const firstItemId = await createItem(page, { name: 'Tagged Lamp', tagIds: [tagId] });
        const secondItemId = await createItem(page, { name: 'Tagged Wrench', tagIds: [tagId] });

        await page.goto(`/tags/${tagId}`);
        await waitForMeteorReady(page);

        const firstItemLink = page.getByRole('link', { name: 'View item Tagged Lamp' });
        const secondItemLink = page.getByRole('link', { name: 'View item Tagged Wrench' });

        await expect(firstItemLink).toHaveAttribute('href', `/items/${firstItemId}`);
        await expect(secondItemLink).toHaveAttribute('href', `/items/${secondItemId}`);

        if (testInfo.project.name === 'iPhone') {
            await firstItemLink.tap();
        } else {
            await firstItemLink.click();
        }
        await expect(page).toHaveURL(new RegExp(`/items/${firstItemId}$`));
        await expect(page.getByRole('heading', { name: 'Tagged Lamp' })).toBeVisible();

        await page.goBack();
        if (testInfo.project.name === 'iPhone') {
            await secondItemLink.tap();
        } else {
            await secondItemLink.focus();
            await expect(secondItemLink).toBeFocused();
            await page.keyboard.press('Enter');
        }
        await expect(page).toHaveURL(new RegExp(`/items/${secondItemId}$`));
        await expect(page.getByRole('heading', { name: 'Tagged Wrench' })).toBeVisible();
    });

    test('Clear Selection returns to the Tags overview', async ({ page }, testInfo) => {
        const tagId = await createTag(page, { name: 'Clearable Tag' });

        await page.goto(`/tags/${tagId}`);
        await waitForMeteorReady(page);

        const clearSelectionLink = page.getByRole('link', { name: 'Clear Selection' });
        await expect(clearSelectionLink).toHaveAttribute('href', '/tags');
        if (testInfo.project.name === 'iPhone') {
            await clearSelectionLink.tap();
        } else {
            await clearSelectionLink.click();
        }

        await expect(page).toHaveURL(/\/tags$/);
        await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible();
    });

    test('the Edit Item close control dismisses without saving', async ({ page }) => {
        const itemId = await createItem(page, {
            name: 'Unchanged Item',
            description: 'The close action must not save this draft.',
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);
        await page.getByRole('button', { name: 'Edit' }).click();

        const editHeading = page.getByRole('heading', { name: 'Edit Item' });
        const closeControl = page.getByRole('button', { name: 'Close Edit Item dialog' });
        await page.locator('input[name="name"]').fill('Unsaved Draft');
        await closeControl.dispatchEvent('click');

        await expect(editHeading).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Unchanged Item' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Unsaved Draft' })).toHaveCount(0);
    });

    test('item dialogs expose explicit close-control names', async ({ page }) => {
        const itemId = await createItem(page, { name: 'Dialog Item' });
        await page.setViewportSize({ width: 320, height: 700 });

        await page.goto('/items');
        await waitForMeteorReady(page);
        await page.getByRole('button', { name: 'Create Item' }).click();
        await expect(page.getByRole('button', { name: 'Close Create New Item dialog', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        for (const dialog of [
            { trigger: 'Edit', title: 'Edit Item' },
            { trigger: 'Move', title: 'Move Item' },
            { trigger: 'Delete', title: 'Delete Item' },
        ]) {
            await page.getByRole('button', { name: new RegExp(`${dialog.trigger}$`) }).click();
            await expect(page.getByRole('button', { name: `Close ${dialog.title} dialog`, exact: true })).toBeVisible();
            await page.keyboard.press('Escape');
        }
    });
});
