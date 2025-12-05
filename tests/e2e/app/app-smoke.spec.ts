import { test, expect } from '@playwright/test';
import { waitForMeteorReady, resetDatabase } from '../helpers/database';

/**
 * Basic app smoke tests to verify the app loads and core navigation works.
 */

test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for Meteor to be ready
    await page.goto('/');
    await waitForMeteorReady(page);

    // Reset database before each test for isolation
    await resetDatabase(page);
});

test.describe('App Smoke Tests', () => {
    test('should load the app homepage', async ({ page }) => {
        await page.goto('/');

        // Should show app header
        await expect(page.getByRole('heading', { name: 'Inventory App' })).toBeVisible();

        // Should show navigation tabs
        await expect(page.getByRole('button', { name: 'Items' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Tags' })).toBeVisible();
    });

    test('should navigate between Items and Tags views', async ({ page }) => {
        await page.goto('/');

        // Default view should be Items
        await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Item' })).toBeVisible();

        // Click Tags tab
        await page.getByRole('button', { name: 'Tags' }).click();

        // Should show tags view (AllTagsView component)
        // Note: Need to check what's actually rendered in AllTagsView
        await page.waitForTimeout(500); // Brief wait for view transition

        // Click back to Items tab
        await page.getByRole('button', { name: 'Items' }).click();

        // Should be back to items view
        await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
    });

    test('should open Create Item modal', async ({ page }) => {
        await page.goto('/');

        // Click Create Item button
        await page.getByRole('button', { name: 'Create Item' }).click();

        // Modal should appear with form
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();

        // Should have form fields (use name attribute selectors, not getByLabel - Grommet incompatible)
        await expect(page.locator('input[name="name"]')).toBeVisible();

        // Should have Cancel and Submit buttons
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(page.getByRole('button', { name: /create item/i })).toBeVisible();

        // Close modal by clicking Cancel
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Modal should be closed
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible();
    });
});
