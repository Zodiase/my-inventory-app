/** Browser review fixtures for the complete, mock-data search page. */
import { expect, test } from '@playwright/test';

const states = [
    { name: 'global-idle', scope: 'Search all items', status: 'Search your inventory' },
    { name: 'global-loading', scope: 'Search all items', status: 'Loading results...' },
    { name: 'global-empty', scope: 'Search all items', status: 'No results found' },
    { name: 'global-results', scope: 'Search all items', status: '3 results' },
    { name: 'scoped-results', scope: 'Search in Rack A', status: '3 results' },
] as const;

for (const viewport of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1600, height: 1000 },
]) {
    test(`complete search page states at ${viewport.name} width`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        for (const state of states) {
            await page.goto(`/iframe.html?id=ui-searchpagelayout--${state.name}&viewMode=story`);
            await expect(page.getByRole('heading', { name: 'Search', exact: true })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Search inventory' })).toHaveAttribute('aria-current', 'page');
            await expect(page.getByText(state.scope, { exact: true })).toBeVisible();
            await expect(page.getByText(state.status)).toBeVisible();
            await expect(page.getByRole('region', { name: 'Search results' })).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath(`${state.name}-${viewport.name}.png`) });
        }

        await page.goto('/iframe.html?id=ui-searchpagelayout--long-results&viewMode=story');
        const region = page.getByRole('region', { name: 'Search results' });
        await expect(page.getByText('31 results')).toBeVisible();
        await expect(region.getByRole('link', { name: /Storage item 31/ })).toHaveCount(1);
        await region.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
        });
        await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await page.screenshot({ path: testInfo.outputPath(`long-results-${viewport.name}-scrolled.png`) });

        await page.getByRole('button', { name: 'Filters' }).click();
        await expect(page.getByRole('button', { name: 'Hide Filters' })).toHaveAttribute('aria-expanded', 'true');
        await page.screenshot({ path: testInfo.outputPath(`long-results-${viewport.name}-filters.png`) });
    });
}
