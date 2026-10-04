/** Visual-contract checks for the mock Search shell with its Tags picker open. */
import { expect, test } from '@playwright/test';

const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 1100 },
];

for (const viewport of viewports) {
    test(`${viewport.name} Search shell keeps quiet controls and a bounded query`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto('/iframe.html?id=prototypes-direct-selection-tag-picker--one-selected&viewMode=story');

        const shell = page.getByTestId('direct-selection-proof');
        const banner = shell.locator('.direct-banner');
        const buttons = banner.locator(':scope > button, :scope > .direct-anchor > button');
        const query = page.getByRole('textbox', { name: 'Search query' });
        const chip = page.getByRole('button', { name: 'Remove included Needs sorting' });

        await expect(page.getByRole('dialog', { name: 'Tag filters' })).toBeVisible();
        await expect(buttons).toHaveCount(4);
        await expect(chip).toBeVisible();

        const geometry = await banner.evaluate((element) => {
            const controls = [
                ...element.querySelectorAll(':scope > button, :scope > input, :scope > .direct-anchor > button'),
            ].map((control) => control.getBoundingClientRect());
            return {
                rows: Math.max(...controls.map((box) => box.top)) - Math.min(...controls.map((box) => box.top)),
                rightmost: Math.max(...controls.map((box) => box.right)),
                minButtonHeight: Math.min(...controls.filter((box) => box.width > 0).map((box) => box.height)),
            };
        });
        expect(geometry.rows).toBeLessThanOrEqual(2);
        expect(geometry.rightmost).toBeLessThanOrEqual(viewport.width);
        expect(geometry.minButtonHeight).toBeGreaterThanOrEqual(44);

        for (const control of [buttons.first(), buttons.nth(1), buttons.nth(2), buttons.nth(3), chip]) {
            const borderWidth = await control.evaluate((element) => getComputedStyle(element).borderTopWidth);
            expect(borderWidth).toBe('0px');
        }
        expect(await query.evaluate((element) => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(
            0
        );

        await page.screenshot({ path: testInfo.outputPath(`search-shell-${viewport.name}.png`), fullPage: true });

        await buttons.nth(2).focus();
        await expect(buttons.nth(2)).toBeFocused();
        expect(await buttons.nth(2).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
        await page.screenshot({ path: testInfo.outputPath(`search-shell-focus-${viewport.name}.png`), fullPage: true });
    });
}
