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
    test('renders one primary navigation without wrapping or overflow', async ({ page }, testInfo) => {
        test.setTimeout(60_000);

        for (const viewport of navigationViewports) {
            await page.setViewportSize(viewport);
            await page.goto('/items');
            await waitForMeteorReady(page);

            const desktopNav = page.getByRole('navigation', { name: 'Desktop primary navigation' });
            const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
            const expectMobileNavigation = viewport.width <= 640;

            await page.screenshot({
                path: testInfo.outputPath(`navigation-${viewport.width}px.png`),
            });

            expect
                .soft(await desktopNav.isVisible(), `${viewport.width}px desktop navigation visibility`)
                .toBe(!expectMobileNavigation);
            expect
                .soft(await mobileNav.isVisible(), `${viewport.width}px mobile navigation visibility`)
                .toBe(expectMobileNavigation);

            const hasHorizontalOverflow = await page.evaluate(() => {
                const root = document.scrollingElement ?? document.documentElement;
                return root.scrollWidth > root.clientWidth;
            });
            expect.soft(hasHorizontalOverflow, `${viewport.width}px horizontal overflow`).toBe(false);

            if (!expectMobileNavigation) {
                const desktopLinks = desktopNav.locator('a');
                await expect.soft(desktopLinks, `${viewport.width}px desktop tab count`).toHaveCount(4);
                await expect.soft(desktopLinks.nth(1)).toHaveAttribute('href', '/tags');
                await desktopLinks.nth(1).click();
                await expect(page).toHaveURL(/\/tags$/);
                await expect(desktopLinks.nth(1)).toHaveAttribute('aria-current', 'page');
                continue;
            }

            const navBox = await mobileNav.boundingBox();
            if (navBox === null) throw new Error(`${viewport.width}px mobile navigation has no bounding box`);

            const tabNames = ['Items', 'Tags', 'Search', 'Data'];
            const mobileLinks = mobileNav.locator('a');
            await expect.soft(mobileLinks, `${viewport.width}px mobile tab count`).toHaveCount(tabNames.length);
            const tabBoxes = await Promise.all(
                tabNames.map(async (name, index) => {
                    const link = mobileLinks.nth(index);
                    await expect.soft(link, `${viewport.width}px ${name} tab`).toBeVisible();
                    await expect.soft(link, `${viewport.width}px ${name} accessible name`).toHaveAccessibleName(name);
                    const box = await link.boundingBox();
                    if (box === null) throw new Error(`${viewport.width}px ${name} tab has no bounding box`);
                    return box;
                })
            );

            expect.soft(navBox.x, `${viewport.width}px navigation left edge`).toBeGreaterThanOrEqual(0);
            expect
                .soft(navBox.x + navBox.width, `${viewport.width}px navigation right edge`)
                .toBeLessThanOrEqual(viewport.width);
            expect
                .soft(navBox.y + navBox.height, `${viewport.width}px navigation bottom edge`)
                .toBeLessThanOrEqual(viewport.height);
            expect.soft(new Set(tabBoxes.map(({ y }) => Math.round(y))).size, `${viewport.width}px tab rows`).toBe(1);

            for (const [index, box] of tabBoxes.entries()) {
                expect.soft(box.width, `${viewport.width}px tab ${index + 1} width`).toBeGreaterThanOrEqual(44);
                expect.soft(box.height, `${viewport.width}px tab ${index + 1} height`).toBeGreaterThanOrEqual(44);
                expect.soft(box.x, `${viewport.width}px tab ${index + 1} left edge`).toBeGreaterThanOrEqual(0);
                expect
                    .soft(box.x + box.width, `${viewport.width}px tab ${index + 1} right edge`)
                    .toBeLessThanOrEqual(viewport.width);
            }

            await expect.soft(mobileLinks.nth(0)).toHaveAttribute('aria-current', 'page');

            const contentBottomPadding = await page
                .locator('main.app-shell-main')
                .evaluate((main) => Number.parseFloat(getComputedStyle(main).paddingBottom));
            expect
                .soft(contentBottomPadding, `${viewport.width}px content clearance for fixed navigation`)
                .toBeGreaterThanOrEqual(navBox.height);

            await mobileLinks.nth(1).click();
            await expect(page).toHaveURL(/\/tags$/);
            await expect(mobileLinks.nth(1)).toHaveAttribute('aria-current', 'page');
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

    test('the Edit Item close control dismisses without saving', async ({ page }, testInfo) => {
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
        if (testInfo.project.name === 'iPhone') {
            await closeControl.tap();
        } else {
            await closeControl.click();
        }

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
