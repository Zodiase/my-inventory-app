import { test, expect } from '@playwright/test';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { TagsPage, InventoryPage, ItemDetailPage } from '../helpers/page-objects';
import { createItem, createTag, callMeteorMethod } from '../helpers/factories';

/**
 * E2E tests for User Story 2: Tag Items for Cross-Location Collections
 *
 * Tests cover all acceptance criteria:
 * - T034a: Create a new tag
 * - T034b: Apply tag to item
 * - T034c: View all items with a specific tag
 * - T034d: Remove tag from item
 * - T034e: Rename tag and verify all tagged items updated
 * - T034f: Delete tag and verify removed from all items
 * - T034g: Tags are case-insensitive (reject duplicate "camping" and "Camping")
 */

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('User Story 2: Tag Items for Cross-Location Collections', () => {
    test('T034a: Create a new tag', async ({ page }) => {
        const tagsPage = new TagsPage(page);

        await tagsPage.goto();

        // Click "Add Tag" button
        await tagsPage.addTagButton.click();

        // Fill in tag name via dialog/form
        const tagName = `Test Tag ${Date.now()}`;

        // Handle dialog if it's a prompt-based UI
        page.once('dialog', async (dialog) => {
            expect(dialog.type()).toBe('prompt');
            await dialog.accept(tagName);
        });

        // Trigger the tag creation
        await tagsPage.addTagButton.click();

        // Verify tag appears in the list
        await expect(tagsPage.tagByName(tagName)).toBeVisible();
    });

    test('T034b: Apply tag to item', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const itemDetailPage = new ItemDetailPage(page);

        // Create a tag and an item
        const tagId = await createTag(page, { name: 'Camping Gear' });
        const itemId = await createItem(page, { name: 'Tent' });

        // Navigate to item detail view
        await inventoryPage.goto();
        await inventoryPage.openItem('Tent');

        // Apply tag to item (implementation depends on UI)
        // For now, we'll use the API and verify in UI
        await callMeteorMethod(page, 'tags.addToItem', itemId, tagId);

        // Reload to see changes
        await page.reload();
        await waitForMeteorReady(page);

        // Verify tag appears on the item
        await expect(page.getByText('Camping Gear')).toBeVisible();
    });

    test('T034c: View all items with a specific tag', async ({ page }) => {
        const tagsPage = new TagsPage(page);

        // Create a tag and multiple items with that tag
        const tagId = await createTag(page, { name: 'Electronics' });
        const item1Id = await createItem(page, { name: 'Laptop', tagIds: [tagId] });
        const item2Id = await createItem(page, { name: 'Phone', tagIds: [tagId] });
        const item3Id = await createItem(page, { name: 'Tent' }); // No tag

        // Navigate to tags view
        await tagsPage.goto();

        // Click on the tag to view items
        await tagsPage.openTag('Electronics');

        // Verify both tagged items appear
        await expect(page.getByText('Laptop')).toBeVisible();
        await expect(page.getByText('Phone')).toBeVisible();

        // Verify untagged item does not appear
        await expect(page.getByText('Tent')).not.toBeVisible();
    });

    test('T034d: Remove tag from item', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);

        // Create item with tag
        const tagId = await createTag(page, { name: 'Winter Sports' });
        const itemId = await createItem(page, {
            name: 'Snowboard',
            tagIds: [tagId],
        });

        // Navigate to item
        await inventoryPage.goto();
        await inventoryPage.openItem('Snowboard');

        // Verify tag is present
        await expect(page.getByText('Winter Sports')).toBeVisible();

        // Remove tag (implementation depends on UI - might be a chip with X button)
        await callMeteorMethod(page, 'tags.removeFromItem', itemId, tagId);

        // Reload to see changes
        await page.reload();
        await waitForMeteorReady(page);

        // Verify tag is removed
        await expect(page.getByText('Winter Sports')).not.toBeVisible();
    });

    test('T034e: Rename tag and verify all tagged items updated', async ({ page }) => {
        const tagsPage = new TagsPage(page);

        // Create tag and items with that tag
        const tagId = await createTag(page, { name: 'OldTagName' });
        await createItem(page, { name: 'Item1', tagIds: [tagId] });
        await createItem(page, { name: 'Item2', tagIds: [tagId] });

        // Navigate to tags view
        await tagsPage.goto();

        // Verify old tag name appears
        await expect(tagsPage.tagByName('OldTagName')).toBeVisible();

        // Rename tag via API (UI implementation may vary)
        const tag = await callMeteorMethod(page, 'tags.findOne', { _id: tagId });
        await callMeteorMethod(page, 'tags.rename', tag, 'NewTagName');

        // Reload to see changes
        await page.reload();
        await waitForMeteorReady(page);

        // Verify new tag name appears
        await expect(tagsPage.tagByName('NewTagName')).toBeVisible();

        // Verify old tag name is gone
        await expect(tagsPage.tagByName('OldTagName')).not.toBeVisible();

        // Verify items now show new tag name
        await tagsPage.openTag('NewTagName');
        await expect(page.getByText('Item1')).toBeVisible();
        await expect(page.getByText('Item2')).toBeVisible();
    });

    test('T034f: Delete tag and verify removed from all items', async ({ page }) => {
        const tagsPage = new TagsPage(page);
        const inventoryPage = new InventoryPage(page);

        // Create tag and items with that tag
        const tagId = await createTag(page, { name: 'ToDelete' });
        await createItem(page, { name: 'Item1', tagIds: [tagId] });
        await createItem(page, { name: 'Item2', tagIds: [tagId] });

        // Navigate to tags view
        await tagsPage.goto();
        await expect(tagsPage.tagByName('ToDelete')).toBeVisible();

        // Delete tag via API (UI implementation may vary)
        await callMeteorMethod(page, 'tags.delete', tagId);

        // Reload tags view
        await page.reload();
        await waitForMeteorReady(page);

        // Verify tag no longer appears in tags list
        await expect(tagsPage.tagByName('ToDelete')).not.toBeVisible();

        // Navigate to items view
        await inventoryPage.goto();

        // Verify items no longer show the deleted tag
        await inventoryPage.openItem('Item1');
        await expect(page.getByText('ToDelete')).not.toBeVisible();
    });

    test('T034g: Tags are case-insensitive (reject duplicate)', async ({ page }) => {
        // Create a tag with specific casing
        await createTag(page, { name: 'CampingGear' });

        // Try to create another tag with different casing - should throw error
        let errorThrown = false;
        try {
            await createTag(page, { name: 'campinggear' });
        } catch (error) {
            // Expected error - tag already exists (case-insensitive)
            errorThrown = true;
            expect(error).toBeDefined();
        }

        // Verify error was thrown
        expect(errorThrown).toBe(true);

        // Verify only one tag exists
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        // Should see the original tag
        await expect(tagsPage.tagByName('CampingGear')).toBeVisible();
    });

    test('should apply multiple tags to single item', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);

        // Create multiple tags
        const tag1Id = await createTag(page, { name: 'Camping' });
        const tag2Id = await createTag(page, { name: 'Electronics' });
        const tag3Id = await createTag(page, { name: 'Portable' });

        // Create item with multiple tags
        await createItem(page, {
            name: 'LED Lantern',
            tagIds: [tag1Id, tag2Id, tag3Id],
        });

        // Navigate to item
        await inventoryPage.goto();
        await inventoryPage.openItem('LED Lantern');

        // Verify all tags appear
        await expect(page.getByText('Camping')).toBeVisible();
        await expect(page.getByText('Electronics')).toBeVisible();
        await expect(page.getByText('Portable')).toBeVisible();
    });

    test('should find items across different locations by tag', async ({ page }) => {
        const tagsPage = new TagsPage(page);

        // Create location hierarchy
        const kitchenId = await createItem(page, {
            name: 'Kitchen',
            isContainer: true,
        });
        const garageId = await createItem(page, {
            name: 'Garage',
            isContainer: true,
        });

        // Create tag
        const toolsTagId = await createTag(page, { name: 'Tools' });

        // Create items in different locations with same tag
        await createItem(page, {
            name: 'Kitchen Knife',
            containerId: kitchenId,
            tagIds: [toolsTagId],
        });
        await createItem(page, {
            name: 'Screwdriver',
            containerId: garageId,
            tagIds: [toolsTagId],
        });

        // Navigate to tag view
        await tagsPage.goto();
        await tagsPage.openTag('Tools');

        // Verify both items from different locations appear
        await expect(page.getByText('Kitchen Knife')).toBeVisible();
        await expect(page.getByText('Screwdriver')).toBeVisible();
    });
});

/**
 * T012: CreateTagDialog Integration Tests
 * Porting proven patterns from Storybook tests (tests/e2e/storybook/CreateTagDialog.spec.ts)
 * to full app integration tests.
 */
test.describe('T012: CreateTagDialog Integration (Ported from Storybook)', () => {
    test('should create tag via CreateTagDialog', async ({ page }) => {
        // Navigate to tags view by clicking navigation button
        await page.goto('/');
        await page.getByRole('button', { name: /tags/i }).click();

        // Click + button to open CreateTagDialog
        await page.locator('.new-child-action').first().click();

        // Fill form using same selectors as Storybook tests
        const tagName = `Integration Test Tag ${Date.now()}`;
        await page.locator('input[name="tagName"]').fill(tagName);

        // Submit
        await page.getByRole('button', { name: /create tag/i }).click();

        // Verify tag appears in list
        await expect(page.getByRole('listitem').filter({ hasText: tagName })).toBeVisible();
    });

    test('should show validation error for empty tag name', async ({ page }) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        // Open dialog
        await page.locator('.new-child-action').first().click();

        // Try to submit without filling
        await page.getByRole('button', { name: /create tag/i }).click();

        // Expect validation error (form won't submit)
        await expect(page.locator('input[name="tagName"]')).toBeVisible();
        await expect(page.locator('input[name="tagName"]')).toHaveAttribute('required', '');
    });

    test('should prevent double-submit', async ({ page }) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        // Open dialog
        await page.locator('.new-child-action').first().click();

        const tagName = `Double Submit Test ${Date.now()}`;
        await page.locator('input[name="tagName"]').fill(tagName);

        // Click submit button rapidly multiple times
        const submitButton = page.getByRole('button', { name: /create tag/i });
        await Promise.all([
            submitButton.click({ force: true }),
            submitButton.click({ force: true }),
            submitButton.click({ force: true }),
        ]);

        // Wait for dialog to close
        await expect(page.locator('input[name="tagName"]')).not.toBeVisible();

        // Verify only one tag was created
        const tags = page.locator(`text="${tagName}"`);
        await expect(tags).toHaveCount(1);
    });

    test('should close dialog on cancel', async ({ page }) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        // Open dialog
        await page.locator('.new-child-action').first().click();

        // Verify dialog is open
        await expect(page.locator('input[name="tagName"]')).toBeVisible();

        // Click cancel
        await page.getByRole('button', { name: /cancel/i }).click();

        // Verify dialog closed
        await expect(page.locator('input[name="tagName"]')).not.toBeVisible();
    });
});
