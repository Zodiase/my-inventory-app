import { test, expect } from '@playwright/test';

/**
 * Tests for creating, viewing, and managing inventory items.
 */

test.describe('Item Management', () => {
    test('should create a new item', async ({ page }) => {
        await page.goto('/');

        // Open create item modal
        await page.getByRole('button', { name: 'Create Item' }).click();

        // Fill in item details
        const itemName = `Test Item ${Date.now()}`;
        await page.getByLabel('Name').fill(itemName);
        await page.getByLabel('Description').fill('This is a test item created by Playwright');

        // Submit the form
        await page.getByRole('button', { name: 'Submit' }).click();

        // Wait for modal to close
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible();

        // Item should appear in the list
        // Note: Need to verify the actual structure of AllItemsView
        await page.waitForTimeout(1000); // Wait for Meteor subscription to update

        // Check if item appears (this depends on how AllItemsView renders items)
        await expect(page.getByText(itemName)).toBeVisible();
    });

    test('should create a container item', async ({ page }) => {
        await page.goto('/');

        // Open create item modal
        await page.getByRole('button', { name: 'Create Item' }).click();

        // Fill in container details
        const containerName = `Test Container ${Date.now()}`;
        await page.getByLabel('Name').fill(containerName);

        // Check "Is Container" checkbox
        await page.getByLabel('Is Container').check();

        // Submit the form
        await page.getByRole('button', { name: 'Submit' }).click();

        // Wait for modal to close and subscription to update
        await page.waitForTimeout(1000);

        // Container should appear in the list
        await expect(page.getByText(containerName)).toBeVisible();
    });

    test('should validate required name field', async ({ page }) => {
        await page.goto('/');

        // Open create item modal
        await page.getByRole('button', { name: 'Create Item' }).click();

        // Try to submit without filling name
        await page.getByRole('button', { name: 'Submit' }).click();

        // Should show validation error or prevent submission
        // Modal should still be open
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();
    });

    test('should cancel item creation', async ({ page }) => {
        await page.goto('/');

        // Open create item modal
        await page.getByRole('button', { name: 'Create Item' }).click();

        // Start filling form
        await page.getByLabel('Name').fill('This item will not be created');

        // Click cancel
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Modal should close
        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible();

        // Item should not appear in list
        await expect(page.getByText('This item will not be created')).not.toBeVisible();
    });
});
