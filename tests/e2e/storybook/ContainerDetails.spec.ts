import { expect, test } from '@playwright/test';
import { STORYBOOK_BASE_URL } from '../helpers/storybook-helpers';

const viewports = [
    { width: 1280, height: 720 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
    { width: 390, height: 480 },
];
for (const story of [
    'populated',
    'empty',
    'filtered-empty',
    'structured',
    'minimal',
    'long-title',
    'global',
    'loading',
    'missing',
]) {
    for (const viewport of viewports) {
        test(`${story} own details at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto(
                `${STORYBOOK_BASE_URL}/iframe.html?id=integration-containerdetails--${story}&viewMode=story`
            );
            const details = page.getByRole('button', { name: 'Container details', exact: true });
            if (['global', 'loading', 'missing'].includes(story)) {
                await expect(details).toHaveCount(0);
                await expect(page.getByRole('banner')).toBeVisible();
                await page.screenshot({
                    path: testInfo.outputPath(`contents-${story}-${viewport.width}-${viewport.height}.png`),
                });
                return;
            }
            await expect(details).toBeVisible();
            const bounds = await details.boundingBox();
            expect(bounds?.height).toBeGreaterThanOrEqual(44);
            expect(bounds?.width).toBeGreaterThanOrEqual(44);
            const heading = await page.getByRole('heading', { level: 2 }).boundingBox();
            if (bounds!.y < heading!.y + heading!.height)
                expect(
                    Math.abs(bounds!.y + bounds!.height / 2 - (heading!.y + heading!.height / 2))
                ).toBeLessThanOrEqual(1);
            else expect(bounds!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.getByRole('button', { name: /Add Filters/ }).click();
            await expect(page.getByText('Active contents filter')).toBeVisible();
            await page.screenshot({
                path: testInfo.outputPath(`contents-${story}-${viewport.width}-${viewport.height}.png`),
            });
            await details.press('Enter');
            await expect(page.getByRole('button', { name: 'Back to contents' })).toBeVisible();
            if (story === 'minimal') {
                await expect(page.getByRole('heading', { name: 'Properties', exact: true })).toHaveCount(0);
                await expect(page.getByText('Description:', { exact: true })).toHaveCount(0);
            } else {
                await expect(
                    page.getByText('Rack specifications and purchase history.', { exact: false })
                ).toBeVisible();
                const terms = await page.locator('dt').allTextContents();
                expect(terms).toEqual([
                    'Manufacturer',
                    'Model',
                    'Serial number',
                    'Purchase date',
                    'Purchased from',
                    'Purchase price',
                    'Market value',
                    'Warranty',
                    'Condition',
                    'Search aliases',
                    'English search vocabulary',
                    'Chinese search vocabulary',
                    'Japanese search vocabulary',
                    'Contents presentation',
                    'Fixture type',
                    'Structural section count',
                    'Structural section',
                    'Observed empty',
                    'False front below sink',
                    'Storage layout model',
                    'Storage tiers',
                    'Storage positions',
                    'Storage columns',
                    'Storage rows',
                    'Storage axis label',
                    'Slot top',
                    'Placement model',
                    'Placement tier',
                    'Placement position',
                    'Placement slot',
                ]);
                await expect(page.getByText('$129.99', { exact: true })).toHaveCount(1);
                await expect(page.getByText('2026-10-04', { exact: true })).toHaveCount(1);
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({
                path: testInfo.outputPath(`details-${story}-${viewport.width}-${viewport.height}.png`),
            });
            await page.getByRole('button', { name: 'Back to contents' }).click();
            await expect(details).toBeVisible();
            await expect(page.getByText('Active contents filter')).toBeVisible();
        });
    }
}
