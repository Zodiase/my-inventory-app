import { expect, test } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

const longTagName = 'Emergency communication and navigation equipment with rechargeable backup power';
const responsiveWidths = [320, 390, 430, 768, 1280] as const;

test.describe('AllTagsView hierarchy stress state (Storybook)', () => {
    for (const width of responsiveWidths) {
        test(`keeps hierarchy and actions usable at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await gotoStory(page, 'ui-alltagsview', 'hierarchy-stress');

            const rows = page.locator('.tag-body');
            const deepestRow = rows.filter({ hasText: longTagName });

            await expect(rows).toHaveCount(6);
            await expect(deepestRow.locator('.tag-name')).toHaveText(longTagName);
            await expect(deepestRow.locator('.tag-item-count')).toHaveText('37 items');

            const layout = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                rowRects: [...document.querySelectorAll('.tag-body')].map((row) => {
                    const rect = row.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, height: rect.height };
                }),
            }));

            expect(layout.scrollWidth).toBe(layout.clientWidth);
            for (const row of layout.rowRects) {
                expect(row.left).toBeGreaterThanOrEqual(0);
                expect(row.right).toBeLessThanOrEqual(width);
            }

            const overflowAction = deepestRow.getByRole('button', { name: `Actions for ${longTagName}` });
            const directActions = deepestRow.locator('.tag-desktop-actions button');

            if (width <= 600) {
                await expect(overflowAction).toBeVisible();
                await expect(directActions).toHaveCount(3);
                await expect(directActions.first()).toBeHidden();
                await expect(deepestRow.locator('.tag-mobile-hierarchy')).toContainText('Level 6');
                await expect(deepestRow.locator('.tag-mobile-hierarchy')).toContainText('under Safety systems');
                await expect(deepestRow.locator('.tag-path')).toBeHidden();

                const actionBox = await overflowAction.boundingBox();
                const rowBox = await deepestRow.boundingBox();
                expect(actionBox).not.toBeNull();
                expect(actionBox?.width).toBeGreaterThanOrEqual(44);
                expect(actionBox?.height).toBeGreaterThanOrEqual(44);
                expect(rowBox).not.toBeNull();
                expect(rowBox?.height).toBeLessThanOrEqual(88);
            } else {
                await expect(overflowAction).toBeHidden();
                await expect(directActions).toHaveCount(3);
                await expect(directActions.first()).toBeVisible();
                await expect(deepestRow.locator('.tag-mobile-hierarchy')).toBeHidden();
                await expect(deepestRow.locator('.tag-path')).toBeVisible();
            }
        });
    }

    test('offers add, rename, and deliberate delete through the mobile action menu', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoStory(page, 'ui-alltagsview', 'hierarchy-stress');

        const row = page.locator('.tag-body').filter({ hasText: longTagName });
        const actionsButton = row.getByRole('button', { name: `Actions for ${longTagName}` });

        await actionsButton.click();
        let menu = page.getByRole('menu', { name: `Actions for ${longTagName}` });
        await menu.getByRole('menuitem').filter({ hasText: 'Add child' }).click();
        await expect(page.getByRole('heading', { name: 'Create New Tag' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        await actionsButton.click();
        menu = page.getByRole('menu', { name: `Actions for ${longTagName}` });
        await menu.getByRole('menuitem').filter({ hasText: 'Rename' }).click();
        await expect(page.getByRole('heading', { name: 'Rename Tag' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        await actionsButton.click();
        menu = page.getByRole('menu', { name: `Actions for ${longTagName}` });
        await menu.getByRole('menuitem').filter({ hasText: 'Delete' }).click();
        await expect(page.getByRole('heading', { name: 'Delete Tag' })).toBeVisible();
        await expect(page.getByText(`Delete "${longTagName}"? Items will keep their other tags.`)).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(row).toBeVisible();
    });
});
