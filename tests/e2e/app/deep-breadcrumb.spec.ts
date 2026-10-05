import { expect, test } from '@playwright/test';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

// This app check separates real route containment from the centered Storybook harness.
test('deep item location stays inside the actual app on a short phone', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 480 });
    await page.goto('/items');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    let parent: string | undefined;
    for (const name of ['Home', 'Garage', 'Storage Shelves', 'Camping Equipment Box']) {
        parent = await createItem(page, { name, isContainer: true, containerId: parent });
    }
    const item = await createItem(page, { name: 'Camping Tent', containerId: parent });
    await page.goto(`/items/${item}`);
    await expect(page.getByRole('heading', { name: 'Camping Tent', exact: true })).toBeVisible();
    const trail = page.locator('nav').filter({ has: page.getByText('Camping Equipment Box', { exact: true }) });
    await expect(trail).toBeVisible();
    await expect(trail.getByText('Camping Equipment Box', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('actual-app-phone.png'), fullPage: true });
});
