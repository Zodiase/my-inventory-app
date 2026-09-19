import { expect, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
});

test.describe('top navigation layout', () => {
    test('keeps the root view title without a duplicate breadcrumb', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.locator('.app-shell-breadcrumb')).toHaveCount(0);

        const headerMetrics = await page.locator('.app-shell-header').evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
                height: rect.height,
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
            };
        });
        const searchMetrics = await page.getByRole('link', { name: 'Search inventory' }).evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { right: rect.right, viewportWidth: window.innerWidth };
        });

        expect(headerMetrics.height).toBeLessThanOrEqual(72);
        expect(headerMetrics.scrollWidth).toBeLessThanOrEqual(headerMetrics.clientWidth);
        expect(searchMetrics.viewportWidth - searchMetrics.right).toBeLessThanOrEqual(24);
    });

    test('shows one root icon and parent names in nested breadcrumbs', async ({ page }) => {
        const firstFloorId = await callMeteorMethod<string>(page, 'createItem', {
            name: 'First floor',
            isContainer: true,
        });
        const livingRoomId = await callMeteorMethod<string>(page, 'createItem', {
            name: 'Living room',
            isContainer: true,
            containerId: firstFloorId,
        });

        await page.goto(`/container/${livingRoomId}`);
        await waitForMeteorReady(page);

        const breadcrumb = page.locator('.app-shell-breadcrumb');
        await expect(breadcrumb).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Living room', exact: true })).toBeVisible();
        await expect(breadcrumb.getByRole('button', { name: 'Navigate to all items' })).toBeVisible();
        await expect(breadcrumb.getByRole('button', { name: 'Navigate to First floor' })).toBeVisible();
        await expect(breadcrumb.locator('svg[aria-label="Home"]')).toHaveCount(1);

        const iconMetrics = await breadcrumb.locator('svg[aria-label="Home"]').evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height, top: rect.top };
        });
        const labelMetrics = await breadcrumb
            .getByRole('button', { name: 'Navigate to all items' })
            .evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { top: rect.top, height: rect.height };
            });

        expect(iconMetrics.width).toBeGreaterThanOrEqual(20);
        expect(iconMetrics.width).toBeLessThanOrEqual(28);
        expect(iconMetrics.height).toBeGreaterThanOrEqual(20);
        expect(Math.abs(iconMetrics.top - labelMetrics.top)).toBeLessThanOrEqual(8);
    });

    test('keeps secondary navigation available in the hamburger menu', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Search inventory' })).toBeVisible();
        await page.getByRole('link', { name: 'Search inventory' }).click();
        await expect(page).toHaveURL(/\/search$/);

        await page.goto('/');
        await page.getByRole('button', { name: 'Open navigation menu' }).click();
        const menu = page.getByRole('navigation', { name: 'Primary navigation' });
        await expect(menu.getByRole('link', { name: 'Tags' })).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Search' })).toHaveCount(0);
        await expect(menu.getByRole('link', { name: 'Data' })).toBeVisible();
    });
});
