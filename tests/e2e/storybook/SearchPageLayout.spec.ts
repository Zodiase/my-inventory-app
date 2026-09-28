/** Mock layout and interaction checks; Meteor routing is covered by app specs. */
import { expect, test } from '@playwright/test';

const viewports = [
    { name: 'minimum-phone', width: 320, height: 700, mode: 'narrow' },
    { name: 'phone', width: 390, height: 844, mode: 'narrow' },
    { name: 'below-medium', width: 459, height: 900, mode: 'narrow' },
    { name: 'medium', width: 460, height: 900, mode: 'narrow' },
    { name: 'below-roomy', width: 619, height: 900, mode: 'medium' },
    { name: 'roomy', width: 620, height: 900, mode: 'medium' },
    { name: 'desktop', width: 1280, height: 720, mode: 'roomy' },
] as const;

const stories = [
    'global-idle',
    'global-loading',
    'global-empty',
    'global-error',
    'global-results',
    'scoped-results',
    'scoped-active-filters',
    'contradictory-restored-filters',
    'legacy-saved-filters',
    'long-results',
];

for (const story of stories) {
    test(`${story} keeps a single usable banner row at every review width`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.goto(`/iframe.html?id=ui-searchpagelayout--${story}&viewMode=story`);
            const banner = page.getByRole('search', { name: 'Inventory search' });
            await expect(banner).toBeVisible();
            await expect(banner.getByRole('textbox', { name: 'Search query' })).toBeVisible();
            await expect(banner.getByRole('link', { name: /Return to|Exit search to/u })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveCount(0);
            await expect(page.getByText('Inventory', { exact: true })).toHaveCount(0);
            await expect(banner.getByRole('button', { name: 'Submit search' })).toHaveCount(0);
            await expect(page.locator('.app-shell-main').getByRole('heading', { name: 'Search' })).toHaveCount(0);

            const geometry = await banner.evaluate((element) => {
                const box = element.getBoundingClientRect();
                const query = element.querySelector('form')?.getBoundingClientRect();
                const controls = [...element.querySelectorAll('button, a, form')]
                    .filter((control) => control.parentElement === element)
                    .map((control) => control.getBoundingClientRect());
                const input = element.querySelector('input')?.getBoundingClientRect();
                return {
                    width: box.width,
                    queryWidth: query?.width ?? 0,
                    inputWidth: input?.width ?? 0,
                    rows: controls.every((control) => Math.abs(control.y - controls[0].y) <= 1),
                };
            });
            expect(geometry.rows, `${story} ${viewport.name} wrapped`).toBe(true);
            expect(geometry.queryWidth, `${story} ${viewport.name} query too narrow`).toBeGreaterThanOrEqual(160);
            expect(geometry.inputWidth, `${story} ${viewport.name} text entry too narrow`).toBeGreaterThanOrEqual(160);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${story}-${viewport.name}.png`), fullPage: true });
        }
        expect(errors).toEqual([]);
    });
}

test('scope, tags, type, combined menu and keyboard focus work', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/iframe.html?id=ui-searchpagelayout--scoped-active-filters&viewMode=story');
    const exit = page.getByRole('link', { name: 'Return to Rack A' });
    await expect(exit).toHaveAttribute('href', '/container/storybook-rack');
    await exit.focus();
    await expect(exit).toBeFocused();
    await page.getByRole('button', { name: 'Tags: 1 selected' }).click();
    await expect(page.getByRole('dialog', { name: 'Search controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tools/u }).first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search controls' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tags: 1 selected' })).toBeFocused();

    await page.setViewportSize({ width: 320, height: 700 });
    const combined = page.getByRole('button', { name: /Scope: Rack A; 2 active filters/u });
    await expect(combined).toBeVisible();
    await combined.click();
    const menu = page.getByRole('dialog', { name: 'Search controls' });
    await expect(menu.locator('section').first()).toHaveAttribute('aria-label', 'Scope');
    await expect(menu.locator('section').nth(1)).toHaveAttribute('aria-label', 'Tags');
    await expect(menu.locator('section').nth(2)).toHaveAttribute('aria-label', 'Type');
    await menu.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByRole('button', { name: /Scope: All Items; 0 active filters/u })).toBeVisible();
});

test('contradictory restored tags warn without silently changing either selection', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/iframe.html?id=ui-searchpagelayout--contradictory-restored-filters&viewMode=story');
    await page.getByRole('button', { name: 'Tags: 2 selected' }).click();
    await expect(page.getByRole('alert')).toContainText('both includes and excludes');
    await expect(page.getByRole('button', { name: /Tools/u })).toHaveCount(2);
});

test('older saved filters are counted and Reset removes them without clearing the query', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/iframe.html?id=ui-searchpagelayout--legacy-saved-filters&viewMode=story');
    await page.getByRole('button', { name: 'Filters: 1 active' }).click();
    const menu = page.getByRole('dialog', { name: 'Search controls' });
    await expect(menu.getByRole('heading', { name: 'Older saved filters · 1' })).toBeVisible();
    await menu.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByRole('button', { name: 'Type: Any' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search query' })).toHaveValue('storage');
});

test('long results scroll without moving the banner', async ({ page }) => {
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

test('Storybook manager renders the complete story without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/ui-searchpagelayout--scoped-results');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('search', { name: 'Inventory search' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
