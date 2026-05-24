import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('AllItemsView Component (Storybook)', () => {
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
