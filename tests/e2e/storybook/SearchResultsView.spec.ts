/** Browser coverage for isolated inventory search-result presentation states. */
import { test, expect } from '@playwright/test';

test('metadata search result shows the matched record and current location context', async ({ page }, testInfo) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/?path=/story/ui-searchresultsview--metadata-match');
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByText('Drinkware box')).toBeVisible();
    await expect(preview.getByText('Insulated metal water bottles and tumblers')).toBeVisible();
    await expect(preview.getByText('Fictional home')).toBeVisible();
    await expect(preview.getByText('Garage')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('metadata-match.png') });
    expect(browserErrors).toEqual([]);
});
