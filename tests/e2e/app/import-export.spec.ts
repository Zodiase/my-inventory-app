import { test, expect } from '@playwright/test';
import { waitForMeteorReady, resetDatabase, callMeteorMethod } from '../helpers/database';
import { createItem } from '../helpers/factories';
import path from 'path';
import fs from 'fs/promises';

test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for Meteor to be ready
    await page.goto('/');
    await waitForMeteorReady(page);

    // Reset database before each test for isolation
    await resetDatabase(page);
});

test.describe('Import/Export Data', () => {
    test('Round-trip JSON export and import', async ({ page }) => {
        // 1. Seed items
        await createItem(page, { name: 'Export Item 1', properties: { notes: 'Note 1' } });
        await createItem(page, { name: 'Export Item 2' });
        await createItem(page, { name: 'Export Item 3', isContainer: true });

        // 2. Navigate to /settings/data
        await page.goto('/settings/data');
        await expect(page.getByRole('heading', { name: 'Export Data' })).toBeVisible();
        const attachmentDisclosure = page.getByRole('note', { name: 'Attachment export limitation' });
        await expect(attachmentDisclosure).toContainText('JSON and CSV exports do not include attachment files.');
        await expect(attachmentDisclosure).toContainText('but not attachments.');

        // 3. Click "Download JSON" and capture download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download JSON' }).click();
        const download = await downloadPromise;

        // Verify filename pattern
        expect(download.suggestedFilename()).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.json$/);

        const jsonPath = path.resolve(__dirname, 'temp-download.json');
        await download.saveAs(jsonPath);
        const fileContent = await fs.readFile(jsonPath, 'utf8');
        expect(fileContent).toContain('Export Item 1');

        // 4. Wipe DB
        await resetDatabase(page);

        // 5. Re-upload JSON
        await page.goto('/settings/data');
        await page.locator('input[type="file"]').setInputFiles(jsonPath);

        // 6. Click "Preview Import"
        await page.getByRole('button', { name: 'Preview Import' }).click();

        // 7. Assert preview shows 3 items
        await expect(page.getByRole('heading', { name: 'Preview Results' })).toBeVisible();
        await expect(page.locator('text=To Create').locator('..').getByText('3')).toBeVisible();

        // 8. Click "Confirm Import"
        await page.getByRole('button', { name: 'Confirm Import' }).click();

        // 9. Assert success message
        await expect(page.getByText('Import completed successfully!')).toBeVisible();

        // 10. Navigate to items list and verify
        await page.goto('/');

        const jsonResults = await callMeteorMethod<any[]>(page, 'items.search', []);
        console.log('JSON test items in DB:', jsonResults.length);

        await expect(page.getByText('Export Item 1')).toBeVisible();
        await expect(page.getByText('Export Item 2')).toBeVisible();
        await expect(page.getByText('Export Item 3')).toBeVisible();
    });

    test('UMR sample CSV import', async ({ page }) => {
        await page.goto('/settings/data');

        // Upload CSV
        const csvPath = path.resolve(__dirname, '../../../specs/004-import-export/fixtures/under-my-roof-sample.csv');
        await page.locator('input[type="file"]').setInputFiles(csvPath);

        // Click Preview
        await page.getByRole('button', { name: 'Preview Import' }).click();

        // Assert preview shows results
        await expect(page.getByRole('heading', { name: 'Preview Results' })).toBeVisible();

        // Verify To Create is non-zero
        const toCreateElement = page.locator('text=To Create').locator('..').locator('text=/^[1-9]\\d*$/').first();
        await expect(toCreateElement).toBeVisible();

        // Click Import
        await page.getByRole('button', { name: 'Confirm Import' }).click();

        // Assert success message or partial success message
        await expect(page.getByText('Import completed successfully!')).toBeVisible();

        // Verify items were imported (assert via DB due to list virtualization)
        const allItems = await callMeteorMethod<any[]>(page, 'items.search', []);
        console.log('All items count:', allItems.length);
        const sonyResults = await callMeteorMethod<any[]>(page, 'items.search', [{ type: 'name', value: 'Sony a7R3' }]);
        expect(sonyResults.length).toBeGreaterThan(0);

        const appleResults = await callMeteorMethod<any[]>(page, 'items.search', [
            { type: 'name', value: 'Apple TV 4K 64GB' },
        ]);
        expect(appleResults.length).toBeGreaterThan(0);
    });

    test('Dry-run safety with CSV', async ({ page }) => {
        await page.goto('/settings/data');

        // Upload CSV
        const csvPath = path.resolve(__dirname, '../../../specs/004-import-export/fixtures/under-my-roof-sample.csv');
        await page.locator('input[type="file"]').setInputFiles(csvPath);

        // Click Preview
        await page.getByRole('button', { name: 'Preview Import' }).click();

        // Wait for preview
        await expect(page.getByRole('heading', { name: 'Preview Results' })).toBeVisible();

        // DO NOT click confirm, navigate away
        await page.goto('/');

        // Assert DB is still empty
        const results = await callMeteorMethod<any[]>(page, 'items.search', [{ type: 'name', value: 'Sony a7R3' }]);
        expect(results.length).toBe(0);

        // Make sure Create Item button is there so we know page loaded
        await expect(page.getByRole('button', { name: 'Create Item' })).toBeVisible();
    });
});
