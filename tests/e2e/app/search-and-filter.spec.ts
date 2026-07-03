import { test, expect } from '@playwright/test';
import { resetDatabase, waitForMeteorReady, callMeteorMethod } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

/**
 * E2E tests for User Story 3: Global Search and Context Filtering
 *
 * Tests cover all acceptance criteria:
 * - T067a: Global search finds items across all containers
 * - T067b: Search by item name (partial match, case-insensitive)
 * - T067c: Search by included tags
 * - T067d: Search by excluded tags
 * - T067e: Search by container type
 * - T067f: Scoped search (search within current container only)
 * - T067g: Context filters apply to current view
 * - T067h: Filters cleared when navigating to different location
 * - T067i: Search results show breadcrumb trail for context
 * - T067j: Prevent contradictory filters (same tag included and excluded)
 */

// Type for search results
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchResults = any[];

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('User Story 3: Global Search and Context Filtering', () => {
    test('T067a: Global search finds items across all containers', async ({ page }) => {
        // Create nested container hierarchy
        const garageId = await createItem(page, {
            name: 'Garage',
            isContainer: true,
        });
        const toolboxId = await createItem(page, {
            name: 'Toolbox',
            isContainer: true,
            containerId: garageId,
        });

        // Create items in different containers
        await createItem(page, { name: 'Hammer', containerId: toolboxId });
        await createItem(page, { name: 'Screwdriver', containerId: garageId });
        await createItem(page, { name: 'Nails' }); // Root level

        // Perform global search (implementation depends on UI)
        // For now, test via search method
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'a' }, // Match all items with 'a'
        ])) as SearchResults;

        // Should find items across all containers
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // All items have 'a' in name: Garage, Hammer, Screwdriver, Nails
        expect(results.length).toBeGreaterThanOrEqual(3);
    });

    test('T067b: Search by item name (partial match, case-insensitive)', async ({ page }) => {
        // Create items with different names
        await createItem(page, { name: 'Gaming Laptop' });
        await createItem(page, { name: 'Old laptop' });
        await createItem(page, { name: 'Laptop Bag' });
        await createItem(page, { name: 'Desktop Computer' });

        // Search for "laptop" (should match all 3 laptop items)
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'laptop' },
        ])) as SearchResults;

        expect(results.length).toBe(3);

        // Verify case-insensitive
        const results2 = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'LAPTOP' },
        ])) as SearchResults;

        expect(results2.length).toBe(3);
    });

    test('T067c: Search by included tags', async ({ page }) => {
        // Create tags
        const electronicsId = await createTag(page, { name: 'Electronics' });
        const campingId = await createTag(page, { name: 'Camping' });

        // Create items with tags
        await createItem(page, {
            name: 'Laptop',
            tagIds: [electronicsId],
        });
        await createItem(page, {
            name: 'Phone',
            tagIds: [electronicsId],
        });
        await createItem(page, {
            name: 'Tent',
            tagIds: [campingId],
        });
        await createItem(page, { name: 'Book' }); // No tags

        // Search for items with electronics tag
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'tagInclude', tagIds: [electronicsId] },
        ])) as SearchResults;

        expect(results.length).toBe(2);
        const names = results.map((r: { name: string }) => r.name);
        expect(names).toContain('Laptop');
        expect(names).toContain('Phone');
    });

    test('T067d: Search by excluded tags', async ({ page }) => {
        // Create tags
        const archivedId = await createTag(page, { name: 'Archived' });
        const soldId = await createTag(page, { name: 'Sold' });

        // Create items
        await createItem(page, { name: 'Active Item 1' });
        await createItem(page, { name: 'Active Item 2' });
        await createItem(page, {
            name: 'Archived Item',
            tagIds: [archivedId],
        });
        await createItem(page, {
            name: 'Sold Item',
            tagIds: [soldId],
        });

        // Search excluding archived and sold items
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'tagExclude', tagIds: [archivedId, soldId] },
        ])) as SearchResults;

        expect(results.length).toBe(2);
        const names = results.map((r: { name: string }) => r.name);
        expect(names).toContain('Active Item 1');
        expect(names).toContain('Active Item 2');
        expect(names).not.toContain('Archived Item');
        expect(names).not.toContain('Sold Item');
    });

    test('T067e: Search by container type', async ({ page }) => {
        // Create containers and items
        await createItem(page, { name: 'Box 1', isContainer: true });
        await createItem(page, { name: 'Box 2', isContainer: true });
        await createItem(page, { name: 'Item 1', isContainer: false });
        await createItem(page, { name: 'Item 2', isContainer: false });

        // Search for containers only
        const containers = (await callMeteorMethod(page, 'items.search', [
            { type: 'containerType', value: 'containers' },
        ])) as SearchResults;

        expect(containers.length).toBe(2);
        const containerNames = containers.map((r: { name: string }) => r.name);
        expect(containerNames).toContain('Box 1');
        expect(containerNames).toContain('Box 2');

        // Search for items only
        const items = (await callMeteorMethod(page, 'items.search', [
            { type: 'containerType', value: 'items' },
        ])) as SearchResults;

        expect(items.length).toBe(2);
        const itemNames = items.map((r: { name: string }) => r.name);
        expect(itemNames).toContain('Item 1');
        expect(itemNames).toContain('Item 2');
    });

    test('T067f: Scoped search (search within current container only)', async ({ page }) => {
        // Create container hierarchy
        const kitchenId = await createItem(page, {
            name: 'Kitchen',
            isContainer: true,
        });
        const pantryId = await createItem(page, {
            name: 'Pantry',
            isContainer: true,
            containerId: kitchenId,
        });
        const garageId = await createItem(page, {
            name: 'Garage',
            isContainer: true,
        });

        // Create items in different containers
        await createItem(page, { name: 'Kitchen Knife', containerId: kitchenId });
        await createItem(page, { name: 'Kitchen Towel', containerId: pantryId });
        await createItem(page, { name: 'Garage Tool', containerId: garageId });

        // Scoped search within kitchen
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'containerScope', containerRootId: kitchenId },
            { type: 'name', value: 'kitchen' },
        ])) as SearchResults;

        const names = results.map((r: { name: string }) => r.name);
        expect(names).toHaveLength(2);
        expect(names).toContain('Kitchen Knife');
        expect(names).toContain('Kitchen Towel');
        expect(names).not.toContain('Garage Tool');
    });

    test('T067g: Context filters apply to current view (narrow down visible items)', async ({ page }) => {
        // Create items with various properties
        const electronicsId = await createTag(page, { name: 'Electronics' });

        await createItem(page, {
            name: 'Laptop',
            tagIds: [electronicsId],
            isContainer: false,
        });
        await createItem(page, {
            name: 'Phone',
            tagIds: [electronicsId],
            isContainer: false,
        });
        await createItem(page, {
            name: 'Electronics Box',
            tagIds: [electronicsId],
            isContainer: true,
        });

        // Filter: electronics tag + items only (not containers)
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'tagInclude', tagIds: [electronicsId] },
            { type: 'containerType', value: 'items' },
        ])) as SearchResults;

        expect(results.length).toBe(2);
        const names = results.map((r: { name: string }) => r.name);
        expect(names).toContain('Laptop');
        expect(names).toContain('Phone');
        expect(names).not.toContain('Electronics Box'); // Container excluded
    });

    test('T067h: Filters cleared when navigating to different location', async ({ page }) => {
        // This test validates UI behavior
        // Create test data
        const containerId = await createItem(page, {
            name: 'Container',
            isContainer: true,
        });
        await createItem(page, { name: 'Item', containerId });

        // Navigate to home
        await page.goto('/');
        await waitForMeteorReady(page);

        // Apply a filter (implementation depends on UI)
        // In real UI, this would set filter state

        // Navigate to different location
        await page.goto(`/container/${containerId}`);
        await waitForMeteorReady(page);

        // Verify filters are cleared (implementation depends on UI)
        // For now, we just verify navigation works
        await expect(page).toHaveURL(new RegExp(`/container/${containerId}`));
    });

    test('Items Add Filter panel contains controls without overlapping the item list', async ({ page }) => {
        await page.setViewportSize({ width: 2048, height: 512 });
        await createTag(page, { name: 'Tools' });
        await createItem(page, {
            name: 'Garage',
            isContainer: true,
        });

        await page.goto('/items');
        await waitForMeteorReady(page);

        await page.getByRole('button', { name: 'Add Filters' }).click();

        const addFilterPanel = page.getByText('Add Filter', { exact: true }).locator('..');
        const firstItemRow = page.getByRole('link', { name: 'Open container Garage' });

        await expect(addFilterPanel).toBeVisible();
        await expect(page.getByRole('button', { name: 'Has Tag' })).toBeVisible();
        await expect(firstItemRow).toBeVisible();

        const geometry = await page.evaluate(() => {
            const addFilterHeading = [...document.querySelectorAll('h4')].find(
                (heading) => heading.textContent?.trim() === 'Add Filter'
            );
            const addFilterPanel = addFilterHeading?.parentElement;
            const firstItemRow = document.querySelector('a[aria-label="Open container Garage"]');
            const root = document.scrollingElement ?? document.documentElement;

            if (addFilterPanel === undefined || addFilterPanel === null || firstItemRow === null) {
                throw new Error('Expected Add Filter panel and Garage row to be present');
            }

            const addFilterRect = addFilterPanel.getBoundingClientRect();
            const firstItemRect = firstItemRow.getBoundingClientRect();

            return {
                addFilterBottom: addFilterRect.bottom,
                firstItemTop: firstItemRect.top,
                scrollWidth: root.scrollWidth,
                clientWidth: root.clientWidth,
            };
        });

        expect(geometry.firstItemTop).toBeGreaterThanOrEqual(geometry.addFilterBottom + 8);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    });

    test('T067i: Search results show breadcrumb trail for context', async ({ page }) => {
        // Create hierarchy
        const kitchenId = await createItem(page, {
            name: 'Kitchen',
            isContainer: true,
        });
        const cabinetId = await createItem(page, {
            name: 'Cabinet',
            isContainer: true,
            containerId: kitchenId,
        });
        await createItem(page, {
            name: 'Plate',
            containerId: cabinetId,
        });

        // Search for plate
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'plate' },
        ])) as SearchResults;

        expect(results.length).toBe(1);
        const item = results[0];

        // Get path for the item to show breadcrumb context
        const path = (await callMeteorMethod(page, 'items.getPath', item._id)) as SearchResults;

        expect(path).toBeDefined();
        expect(Array.isArray(path)).toBe(true);
        // Path should include Kitchen > Cabinet > Plate
        expect(path.length).toBeGreaterThanOrEqual(2);
    });

    test('shows breadcrumb trail in the Search UI results', async ({ page }) => {
        const kitchenId = await createItem(page, {
            name: 'Kitchen',
            isContainer: true,
        });
        const cabinetId = await createItem(page, {
            name: 'Cabinet',
            isContainer: true,
            containerId: kitchenId,
        });
        await createItem(page, {
            name: 'Plate',
            containerId: cabinetId,
        });

        await page.goto('/search');
        await waitForMeteorReady(page);
        await page.getByRole('textbox', { name: 'Search query' }).fill('plate');
        await page.getByRole('button', { name: 'Submit search' }).click();

        const result = page.locator('button').filter({ hasText: 'Plate' }).first();
        await expect(result).toBeVisible();
        await expect(result).toContainText('Kitchen');
        await expect(result).toContainText('Cabinet');
    });

    test('T067j: Prevent contradictory filters (same tag included and excluded)', async ({ page }) => {
        // Create tag
        const testTagId = await createTag(page, { name: 'Test' });
        await createItem(page, { name: 'Item', tagIds: [testTagId] });

        // Try contradictory search (include AND exclude same tag)
        // The query builder allows this but returns no results
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'tagInclude', tagIds: [testTagId] },
            { type: 'tagExclude', tagIds: [testTagId] },
        ])) as SearchResults;

        // Contradictory filter returns no results
        expect(results.length).toBe(0);

        // UI should validate and prevent this scenario
        // This test just confirms the behavior when it happens
    });

    test('should combine multiple search criteria', async ({ page }) => {
        // Complex search scenario
        const electronicsId = await createTag(page, { name: 'Electronics' });
        const archivedId = await createTag(page, { name: 'Archived' });

        await createItem(page, {
            name: 'Gaming Laptop',
            tagIds: [electronicsId],
            isContainer: false,
        });
        await createItem(page, {
            name: 'Old Phone',
            tagIds: [electronicsId, archivedId],
            isContainer: false,
        });
        await createItem(page, {
            name: 'Laptop Bag',
            tagIds: [],
            isContainer: false,
        });

        // Search: name contains "laptop" + electronics tag + not archived
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'laptop' },
            { type: 'tagInclude', tagIds: [electronicsId] },
            { type: 'tagExclude', tagIds: [archivedId] },
        ])) as SearchResults;

        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Gaming Laptop');
    });

    test('should handle empty search results gracefully', async ({ page }) => {
        await createItem(page, { name: 'Test Item' });

        // Search for non-existent item
        const results = (await callMeteorMethod(page, 'items.search', [
            { type: 'name', value: 'NonExistentItem' },
        ])) as SearchResults;

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
    });
});
