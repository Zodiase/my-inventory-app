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

test('ranked search result explains why it matched', async ({ page }, testInfo) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/?path=/story/ui-searchresultsview--ranked-description-match');
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByText('Gaming Laptop')).toBeVisible();
    await expect(preview.getByText('Office')).toBeVisible();
    await expect(preview.getByText('Desk')).toBeVisible();
    await expect(preview.getByText('Matched description, English keywords · relevance 93%')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('ranked-description-match.png') });
    expect(browserErrors).toEqual([]);
});

test('search dependency failure is distinct from an empty result', async ({ page }, testInfo) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/?path=/story/ui-searchresultsview--service-unavailable');
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByRole('alert')).toContainText('Search unavailable');
    await expect(preview.getByText('No results found')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('service-unavailable.png') });
    expect(browserErrors).toEqual([]);
});
