import { test, expect } from '@playwright/test';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';
import { waitForMeteorReady, resetDatabase } from '../helpers/database';

/**
 * Integration Test for item creation in full Meteor app.
 *
 * **Context**: Full app integration testing (http://localhost:3000)
 * **Dependencies**: T007 (ItemForm Storybook tests) validates the form UI
 *
 * **What this test validates**:
 * - Opening the Create Item modal
 * - Filling out the ItemForm
 * - Submitting via button click
 * - Created items appear in the inventory list
 * - Data persists after page reload
 * - Full integration: UI → Meteor methods → database → reactive UI
 *
 * **Prerequisites**: Meteor app must be running at http://localhost:3000
 * ```bash
 * cd meteor-app && npm run dev
 * ```
 *
 * **Run this test**:
 * ```bash
 * npm run test:e2e:skip-server:headless -- tests/e2e/app/item-creation.spec.ts --project=chromium
 * ```
 */

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('T008: Item Creation (Integration)', () => {
    test('should create item via form UI and display in list', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const itemForm = new ItemFormPage(page);
        const itemName = `Integration Test Item ${Date.now()}`;

        // Navigate to inventory page
        await inventoryPage.goto();

        // Open the Create Item modal
        await inventoryPage.clickCreateItem();

        // Wait for modal to be visible
        await expect(page.getByRole('heading', { name: /create.*item/i })).toBeVisible();

        // Fill out the form
        await itemForm.fillName(itemName);
        await itemForm.fillDescription('Created via form UI in integration test');

        // Submit the form
        await itemForm.submit();

        // Wait for modal to close
        await expect(page.getByRole('heading', { name: /create.*item/i })).not.toBeVisible({ timeout: 5000 });

        // Wait for item to appear in the list (tests reactive data binding)
        await expect(inventoryPage.itemByName(itemName)).toBeVisible({ timeout: 5000 });

        // Verify item persists after page refresh
        await page.reload();
        await waitForMeteorReady(page);
        await expect(inventoryPage.itemByName(itemName)).toBeVisible({ timeout: 5000 });
    });
});
