import { expect, test } from '@playwright/test';

for (const viewport of [
    { width: 390, height: 480 },
    { width: 820, height: 900 },
]) {
    test.describe(`WebKit direct tag touch ${viewport.width}`, () => {
        test.use({ viewport, hasTouch: true });
        test('touch each choice and reverse without changing other filters or query', async ({ page }) => {
            await page.goto('/iframe.html?id=ui-searchpagelayout--toggle-regression&viewMode=story');
            const banner = page.getByRole('search', { name: 'Inventory search' });
            const opener = banner.getByRole('button', { name: /^(Tags:|Filters:|Scope: Rack A;)/u });
            await opener.tap();
            const menu = page.getByRole('dialog', { name: 'Search controls' });
            const find = menu.getByRole('searchbox', { name: 'Find a tag' });
            await find.fill('Camera equipment');
            const radio = (s: string) =>
                menu.getByRole('radio', {
                    name: `${s === 'neutral' ? 'No filter for' : s === 'include' ? 'Include' : 'Exclude'} Camera equipment with a long descriptive name`,
                    exact: true,
                });
            for (const state of ['include', 'exclude', 'neutral', 'exclude', 'include']) {
                await radio(state).tap();
                await expect(radio(state)).toBeChecked();
            }
            await find.fill('');
            await expect(menu.getByRole('radio', { name: 'Include Tools', exact: true })).toBeChecked();
            await expect(banner.getByRole('textbox', { name: 'Search query' })).toHaveValue('storage');
            expect(await page.locator('html').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            await page.keyboard.press('Escape');
            await expect(menu).toHaveCount(0);
            await expect(opener).toBeFocused();
        });
    });
}
