/** Component and composed-manager checks for the app's shared tag catalog. */
import { expect, test } from '@playwright/test';

test('grouped catalog keeps independent tag states, Find, and selected-only in one list', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-searchtagcatalog--full&viewMode=story');
    const catalog = page.getByRole('region', { name: 'Tag catalog' });
    await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
    await catalog.getByRole('radio', { name: 'Include Camera equipment' }).click();
    await expect(catalog.getByRole('radiogroup', { name: 'Filter Camera equipment' })).toHaveAttribute(
        'data-state',
        'include'
    );
    await expect(catalog.getByRole('radiogroup', { name: 'Filter Needs repair' })).toHaveAttribute(
        'data-state',
        'exclude'
    );
    await page.getByRole('switch', { name: 'Show selected only (3)' }).check();
    await expect(catalog.getByRole('radiogroup')).toHaveCount(3);
    await page.getByRole('searchbox', { name: 'Find a tag' }).fill('Workflow / Needs repair');
    await expect(catalog.getByRole('radiogroup')).toHaveCount(1);
    await page.getByRole('switch', { name: 'Show selected only (3)' }).uncheck();
    await expect(catalog.getByRole('radiogroup')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Find a tag' }).fill('');
    await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
});

for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 900 },
]) {
    test(`catalog and switch stay compact at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto('/?path=/story/ui-searchtagcatalog--full');
        const preview = page.frameLocator('#storybook-preview-iframe');
        const catalog = preview.getByRole('region', { name: 'Tag catalog' });
        await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
        const geometry = await catalog.evaluate((element) => {
            const pill = element.querySelector('.tri-state-rail-compact')?.getBoundingClientRect();
            const row = element.querySelector('.search-tag-row')?.getBoundingClientRect();
            const track = element.parentElement?.querySelector('.selected-tags-switch-track')?.getBoundingClientRect();
            return {
                pill: { width: pill?.width, height: pill?.height },
                rowHeight: row?.height,
                track: { width: track?.width, height: track?.height },
            };
        });
        expect(geometry.pill).toEqual({ width: 162, height: 29 });
        expect(geometry.rowHeight).toBeGreaterThanOrEqual(48);
        expect(geometry.track).toEqual({ width: 35, height: 22 });
        await page.screenshot({ path: testInfo.outputPath(`catalog-${viewport.width}.png`) });
    });
}
