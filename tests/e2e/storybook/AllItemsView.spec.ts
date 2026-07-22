import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('AllItemsView Component (Storybook)', () => {
    test('covers loading, empty, short, and 100-plus inventory fixtures', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'loading-inventory');
        await expect(page.getByTestId('inventory-count')).toContainText('Loading inventory…');
        await expect(page.getByRole('status', { name: 'Loading inventory entries' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Sort inventory' })).toBeDisabled();

        await gotoStory(page, 'ui-allitemsview', 'empty-inventory');
        await expect(page.getByTestId('inventory-count')).toContainText('0 entries');
        await expect(page.getByText('No items at this level')).toBeVisible();

        await gotoStory(page, 'ui-allitemsview', 'short-inventory');
        await expect(page.getByTestId('inventory-count')).toContainText('3 entries');
        await expect(page.getByTestId('inventory-count')).toContainText('1 container • 2 items');
        await expect(page.getByText('Tools', { exact: true })).toBeVisible();
        await page.getByRole('combobox', { name: 'Sort inventory' }).selectOption('name-desc');
        const sortedAccessibleNames = await page
            .getByTestId('items-list')
            .getByRole('link')
            .evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')));
        expect(sortedAccessibleNames).toEqual(['Open container Garage', 'View item Mountain Bike', 'View item Hammer']);

        await gotoStory(page, 'ui-allitemsview', 'hundred-plus-inventory');
        await expect(page.getByTestId('inventory-count')).toContainText('106 entries');
        await expect(page.getByTestId('items-list').getByRole('link')).toHaveCount(106);
    });

    test('uses the responsive density model at 1440, 768, and 390px', async ({ page }) => {
        const viewports = [
            { width: 1440, height: 900, desktopColumns: true },
            { width: 768, height: 1024, desktopColumns: false },
            { width: 390, height: 844, desktopColumns: false },
        ];

        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await gotoStory(page, 'ui-allitemsview', 'hundred-plus-inventory');

            const firstRow = page.getByTestId('inventory-row').first();
            const longName = page.getByText(/A deliberately long inventory item name/);
            const metrics = await longName.evaluate((element) => {
                const style = getComputedStyle(element);
                return {
                    clientWidth: element.clientWidth,
                    scrollWidth: element.scrollWidth,
                    textOverflow: style.textOverflow,
                    whiteSpace: style.whiteSpace,
                };
            });

            expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
            expect(metrics.textOverflow).toBe('ellipsis');
            expect(metrics.whiteSpace).toBe('nowrap');
            await expect(page.getByText('Type', { exact: true })).toBeVisible({ visible: viewport.desktopColumns });

            const hasHorizontalOverflow = await page.evaluate(() => {
                const root = document.scrollingElement ?? document.documentElement;
                return root.scrollWidth > root.clientWidth;
            });
            expect(hasHorizontalOverflow, `${viewport.width}px horizontal overflow`).toBe(false);

            if (viewport.width === 390) {
                const rowBox = await firstRow.boundingBox();
                if (rowBox === null) throw new Error('Phone inventory row is not visible');
                expect(rowBox.height).toBeGreaterThanOrEqual(64);
                await expect(firstRow).toContainText(/Container|Item/);
            }
        }
    });

    test('keeps scrolling isolated to the items list in the app-shell regression story', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'app-shell-scroll-regression');

        const metrics = await page.evaluate(() => {
            const itemList = document.querySelector('[data-testid="items-list"]');
            if (!(itemList instanceof HTMLElement)) {
                throw new Error('items-list not found');
            }

            const overflowingAncestors = [] as Array<{
                tag: string;
                testId?: string;
                overflowY: string;
                overflowX: string;
            }>;

            let ancestor = itemList.parentElement;
            while (ancestor !== null) {
                const style = getComputedStyle(ancestor);
                const hasYOverflow =
                    ['auto', 'scroll'].includes(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1;
                const hasXOverflow =
                    ['auto', 'scroll'].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1;

                if (hasYOverflow || hasXOverflow) {
                    overflowingAncestors.push({
                        tag: ancestor.tagName.toLowerCase(),
                        testId: ancestor instanceof HTMLElement ? ancestor.dataset.testid : undefined,
                        overflowY: style.overflowY,
                        overflowX: style.overflowX,
                    });
                }

                ancestor = ancestor.parentElement;
            }

            return {
                pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                pageOverflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
                itemListOverflowY: itemList.scrollHeight - itemList.clientHeight,
                overflowingAncestors,
            };
        });

        expect(metrics.itemListOverflowY).toBeGreaterThan(0);
        expect(metrics.pageOverflowX).toBeLessThanOrEqual(1);
        expect(metrics.pageOverflowY).toBeLessThanOrEqual(1);
        expect(metrics.overflowingAncestors).toEqual([]);
    });
});
