import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('AllItemsView Component (Storybook)', () => {
    test('integrates a hoisted logical container into the full inventory list', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'hoisted-logical-container');

        const list = page.getByTestId('items-list');
        const group = list.getByRole('group', { name: 'Third floor contents' });
        await expect(group).toBeVisible();
        await expect(group.getByRole('link', { name: 'Open container Third floor' })).toHaveAttribute(
            'href',
            '/container/third-floor'
        );
        await expect(group.getByRole('link', { name: 'Open container Laundry room' })).toBeVisible();
        await expect(group.getByRole('link', { name: 'Open container Main bedroom' })).toBeVisible();
        await expect(group.getByRole('link', { name: 'Open container Secondary bedroom' })).toBeVisible();
        await expect(list.getByRole('link', { name: 'Open container Garage' })).toBeVisible();
        await expect(list.getByRole('link', { name: 'View item Mountain Bike' })).toBeVisible();
        await expect(list.getByRole('link', { name: 'Open container Third floor' })).toHaveCount(1);

        for (const name of ['Open container Garage', 'View item Mountain Bike']) {
            const row = list.getByRole('link', { name }).locator('> div');
            await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        }
    });

    test('renders structured stack placement instead of alphabetical flat rows', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'structured-bedside-stack');

        const layout = page.getByRole('region', { name: 'Bedside stack physical layout' });
        await expect(layout).toBeVisible();
        await expect(layout.getByRole('row')).toHaveCount(5);

        const tierOne = layout.getByRole('row', { name: 'Tier 1' });
        await expect(tierOne.getByRole('link', { name: /Zulu supplies/ })).toHaveAttribute(
            'href',
            '/container/zulu-left-top'
        );
        await expect(tierOne.getByText('Empty right slot')).toBeVisible();

        const tierFour = layout.getByRole('row', { name: 'Tier 4' });
        await expect(tierFour.getByText('Empty left slot')).toBeVisible();
        await expect(tierFour.getByRole('link', { name: /Alpha supplies/ })).toBeVisible();

        const tierFive = layout.getByRole('row', { name: 'Tier 5' });
        await expect(tierFive.getByText('Empty left slot')).toBeVisible();
        await expect(tierFive.getByText('Empty right slot')).toBeVisible();

        await expect(page.getByRole('region', { name: 'Placement issues' })).toContainText('Duplicate top placement');
        await expect(page.getByRole('region', { name: 'Placement issues' })).toContainText('Invalid tier item');
        await expect(page.getByRole('region', { name: 'Placement issues' })).toContainText('Unplaced item');

        const compactId = page.getByTestId('stack-id-zulu-left-top');
        await expect(compactId).toHaveText('ID: 箱-10000001');
        expect(await compactId.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('nowrap');
    });

    for (const viewport of [
        { name: 'desktop', width: 1100, height: 850 },
        { name: 'phone', width: 390, height: 844 },
    ]) {
        test(`keeps all five tiers readable without horizontal overflow on ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await gotoStory(page, 'ui-allitemsview', 'structured-bedside-stack');

            const layout = page.getByRole('region', { name: 'Bedside stack physical layout' });
            const metrics = await layout.evaluate((element) => {
                const rows = [...element.querySelectorAll('[role="row"]')];
                const firstCells = [...rows[0]!.querySelectorAll('[role="cell"]')];
                const longName = element.querySelector('[aria-label*="Zulu supplies"] span');

                return {
                    viewportWidth: document.documentElement.clientWidth,
                    documentWidth: document.documentElement.scrollWidth,
                    layoutWidth: element.getBoundingClientRect().width,
                    rowTops: rows.map((row) => row.getBoundingClientRect().top),
                    firstCellLefts: firstCells.map((cell) => cell.getBoundingClientRect().left),
                    longNameWidth: longName?.getBoundingClientRect().width ?? 0,
                    firstCellWidth: firstCells[0]?.getBoundingClientRect().width ?? 0,
                };
            });

            expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
            expect(metrics.layoutWidth).toBeLessThanOrEqual(metrics.viewportWidth);
            expect(metrics.rowTops).toEqual([...metrics.rowTops].sort((first, second) => first - second));
            expect(metrics.firstCellLefts[1]).toBeGreaterThan(metrics.firstCellLefts[0]!);
            expect(metrics.longNameWidth).toBeLessThanOrEqual(metrics.firstCellWidth);
            // Font rendering differs across CI's Linux host and the checked-in macOS baselines.
            // Keep the cross-platform geometry assertions above, and compare pixels where the
            // matching reference images were captured.
            if (process.platform === 'darwin') {
                await expect(layout).toHaveScreenshot(`structured-stack-${viewport.name}.png`);
            }
        });
    }

    test('supports keyboard navigation from an occupied slot', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'structured-bedside-stack');

        const topLeft = page.getByRole('link', { name: /Zulu supplies/ });
        await topLeft.focus();
        await expect(topLeft).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/container\/zulu-left-top$/);
    });

    test('renders a declarative vanity without turning its false front into storage', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'declarative-vanity');

        const layout = page.getByRole('region', { name: 'Test vanity physical layout' });
        await expect(layout).toContainText('False drawer front · non-storage');
        await expect(layout.getByRole('link', { name: /Open container Top drawer, Top-left drawer/ })).toBeVisible();
        await expect(
            layout.getByRole('link', { name: /Open container Cabinet below sink, Under-sink cabinet/ })
        ).toBeVisible();
        await expect(layout.getByText('Empty', { exact: false })).toHaveCount(0);
    });

    test('orders a declarative rack from top to bottom and exposes empty shelves', async ({ page }) => {
        await gotoStory(page, 'ui-allitemsview', 'declarative-over-toilet-rack');

        const layout = page.getByRole('region', { name: 'Test over-toilet rack physical layout' });
        await expect(layout).toContainText('Top to bottom');
        await expect(layout.getByRole('link', { name: /Shelf 1 container, Shelf 1/ })).toBeVisible();
        await expect(layout.getByText('Empty Shelf 3', { exact: true })).toBeVisible();
        await expect(layout.getByRole('link', { name: /Shelf 4 container, Shelf 4/ })).toBeVisible();

        const verticalOrder = await layout
            .locator('a')
            .evaluateAll((links) =>
                links.map((link) => ({ text: link.textContent ?? '', top: link.getBoundingClientRect().top }))
            );
        expect(verticalOrder.map(({ top }) => top)).toEqual(
            verticalOrder.map(({ top }) => top).sort((first, second) => first - second)
        );
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
