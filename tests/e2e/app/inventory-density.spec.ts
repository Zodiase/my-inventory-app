import { expect, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';

const highVolumeItemCount = 103;
const highVolumeTotalCount = highVolumeItemCount + 2;
const highVolumeTestTimeoutMs = 60_000;
const longItemName = 'A very long inventory name that must truncate predictably at desktop tablet and phone widths';

const seedHighVolumeInventory = async (page: Parameters<typeof callMeteorMethod>[0]): Promise<void> => {
    await callMeteorMethod(page, 'test.seedInventoryScanningFixture', highVolumeItemCount);
    await page.goto('/items');
    await waitForMeteorReady(page);
    await expect(page.getByTestId('inventory-count')).toContainText(`${highVolumeTotalCount} entries`);
};

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.goto('/items');
    await waitForMeteorReady(page);
});

test.describe('Responsive inventory density', () => {
    test.describe.configure({ timeout: highVolumeTestTimeoutMs });

    test('keeps count and sort context in the empty app state', async ({ page }) => {
        await expect(page.getByTestId('inventory-count')).toContainText('0 entries');
        await expect(page.getByTestId('inventory-count')).toContainText('0 containers • 0 items');
        await expect(page.getByRole('combobox', { name: 'Sort inventory' })).toBeEnabled();
        await expect(page.getByText('No items at this level')).toBeVisible();
    });

    test('supports high-volume comparison and explicit sorting on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await seedHighVolumeInventory(page);

        await expect(page.getByTestId('inventory-count')).toContainText('2 containers • 103 items');
        await expect(page.getByTestId('items-list').getByRole('link')).toHaveCount(highVolumeTotalCount);
        const inventoryList = page.getByTestId('items-list');
        await expect(inventoryList.getByText('Type', { exact: true })).toBeVisible();
        await expect(inventoryList.getByText('Tags', { exact: true })).toBeVisible();
        await expect(inventoryList.getByText('Updated', { exact: true })).toBeVisible();

        const garageRow = page.getByRole('link', { name: 'Open container Garage' });
        await expect(garageRow).toContainText('Workshop and storage area');
        await expect(garageRow).toContainText('Container');
        await expect(garageRow).toContainText('Storage');
        await expect(garageRow.locator('time')).toHaveAttribute('datetime', '2026-01-01T00:00:00.000Z');

        await page.getByRole('combobox', { name: 'Sort inventory' }).selectOption('name-desc');
        const sortedRowNames = await page
            .getByTestId('items-list')
            .getByRole('link')
            .evaluateAll((links) => links.slice(0, 2).map((link) => link.getAttribute('aria-label')));
        expect(sortedRowNames).toEqual(['Open container Utility Closet', 'Open container Garage']);

        const sheetBox = await page.getByRole('region', { name: 'Inventory entries' }).boundingBox();
        if (sheetBox === null) throw new Error('Inventory sheet is not visible');
        expect(sheetBox.width).toBeLessThanOrEqual(1202);
    });

    test('preserves scan metadata, truncation, touch rows, and no overflow at required widths', async ({ page }) => {
        await seedHighVolumeInventory(page);

        for (const viewport of [
            { width: 1440, height: 900 },
            { width: 768, height: 1024 },
            { width: 390, height: 844 },
        ]) {
            await page.setViewportSize(viewport);

            const longName = page.getByText(longItemName, { exact: true });
            const truncation = await longName.evaluate((element) => {
                const style = getComputedStyle(element);
                return {
                    clientWidth: element.clientWidth,
                    scrollWidth: element.scrollWidth,
                    textOverflow: style.textOverflow,
                    whiteSpace: style.whiteSpace,
                };
            });

            expect(truncation.scrollWidth, `${viewport.width}px truncated name`).toBeGreaterThan(
                truncation.clientWidth
            );
            expect(truncation.textOverflow).toBe('ellipsis');
            expect(truncation.whiteSpace).toBe('nowrap');

            const hasHorizontalOverflow = await page.evaluate(() => {
                const root = document.scrollingElement ?? document.documentElement;
                return root.scrollWidth > root.clientWidth;
            });
            expect(hasHorizontalOverflow, `${viewport.width}px horizontal overflow`).toBe(false);

            if (viewport.width < 900) {
                await expect(page.getByTestId('items-list').getByText('Type', { exact: true })).toBeHidden();
                await expect(page.getByRole('link', { name: 'Open container Garage' })).toContainText(
                    'Container • Workshop and storage area'
                );
            } else {
                await expect(page.getByTestId('items-list').getByText('Type', { exact: true })).toBeVisible();
            }

            if (viewport.width === 390) {
                const phoneRowBox = await page.getByTestId('inventory-row').first().boundingBox();
                if (phoneRowBox === null) throw new Error('Phone inventory row is not visible');
                expect(phoneRowBox.height).toBeGreaterThanOrEqual(64);

                const sortBox = await page.getByRole('combobox', { name: 'Sort inventory' }).boundingBox();
                if (sortBox === null) throw new Error('Phone sort control is not visible');
                expect(sortBox.height).toBeGreaterThanOrEqual(44);
            }
        }
    });
});
