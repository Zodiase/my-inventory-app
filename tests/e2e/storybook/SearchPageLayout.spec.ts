/** Mock search-page checks; live Meteor routing is covered by the narrow app spec. */
import { expect, test } from '@playwright/test';

const viewports = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'compact-boundary', width: 640, height: 900 },
    { name: 'expanded-boundary', width: 641, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1600, height: 1000 },
];

const stories = [
    'global-idle',
    'global-loading',
    'global-empty',
    'global-error',
    'global-results',
    'scoped-results',
    'scoped-active-filters',
    'long-results',
];

for (const story of stories) {
    test(`${story} keeps search controls in the blue banner at every review width`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.goto(`/iframe.html?id=ui-searchpagelayout--${story}&viewMode=story`);
            const banner = page.getByRole('search', { name: 'Inventory search' });
            await expect(banner).toBeVisible();
            await expect(
                page.locator('.app-shell-header').getByRole('link', { name: /Return to|Exit search/u })
            ).toBeVisible();
            await expect(banner.getByRole('textbox', { name: 'Search query' })).toBeVisible();
            await expect(banner.getByRole('button', { name: 'Submit search' })).toBeVisible();
            await expect(banner.getByRole('button', { name: 'Global search' })).toBeVisible();
            await expect(banner.getByRole('button', { name: /Scoped search/u })).toBeVisible();
            await expect(banner.getByRole('button', { name: /Filters/u })).toBeVisible();
            await expect(page.locator('.app-shell-main').getByRole('heading', { name: 'Search' })).toHaveCount(0);
            const horizontalOverflow = await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth
            );
            expect(horizontalOverflow, `${story} at ${viewport.name} overflows horizontally`).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${story}-${viewport.name}.png`), fullPage: true });
        }
        expect(errors).toEqual([]);
    });
}

test('menu, filter disclosure, focus and long-results scrolling retain their semantics', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-searchpagelayout--scoped-active-filters&viewMode=story');
    await expect(page.getByRole('button', { name: 'Scoped search' })).toHaveAttribute('aria-pressed', 'true');
    const exit = page.getByRole('link', { name: 'Return to Rack A' });
    await expect(exit).toHaveAttribute('href', '/container/storybook-rack');
    await exit.focus();
    await expect(exit).toBeFocused();
    await expect.poll(async () => exit.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const menu = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(menu.locator('[aria-current="page"]').filter({ hasText: 'Search' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Search' })).toHaveCount(0);
    const filters = page.getByRole('button', { name: 'Filters (1)' });
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await filters.click();
    await expect(filters).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.app-shell-main').getByText('"storage"').first()).toBeVisible();
    await page.getByRole('button', { name: 'Remove Name filter' }).click();
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveAttribute('aria-expanded', 'false');

    await page.goto('/iframe.html?id=ui-searchpagelayout--global-results&viewMode=story');
    const firstResult = page.getByRole('region', { name: 'Search results', exact: true }).getByRole('link').first();
    await firstResult.focus();
    await expect(firstResult).toBeFocused();

    await page.goto('/iframe.html?id=ui-searchpagelayout--long-results&viewMode=story');
    const region = page.getByRole('region', { name: 'Search results', exact: true });
    const before = await page.locator('.app-shell-header').boundingBox();
    await region.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    await expect.poll(async () => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const after = await page.locator('.app-shell-header').boundingBox();
    expect(after?.y).toBe(before?.y);
    expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0);
});

test('Storybook manager renders the complete search story without an error overlay', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?path=/story/ui-searchpagelayout--scoped-results');
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByRole('search', { name: 'Inventory search' })).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('storybook-manager-desktop.png'), fullPage: true });
    expect(errors).toEqual([]);
});
