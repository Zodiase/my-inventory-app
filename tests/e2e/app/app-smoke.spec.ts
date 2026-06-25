import { test, expect } from '@playwright/test';
import { waitForMeteorReady, resetDatabase } from '../helpers/database';
import { createItem } from '../helpers/factories';

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

        const desktopNav = page.getByRole('navigation', { name: 'Desktop primary navigation' });
        await expect(desktopNav).toBeVisible();
        await expect(desktopNav.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');

        // Click Tags tab
        await page.getByRole('button', { name: 'Tags' }).click();

        // Should show tags view (AllTagsView component)
        // Note: Need to check what's actually rendered in AllTagsView
        await page.waitForTimeout(500); // Brief wait for view transition
        await expect(desktopNav.getByRole('link', { name: 'Tags' })).toHaveAttribute('aria-current', 'page');

        // Click back to Items tab
        await page.getByRole('button', { name: 'Items' }).click();

        // Should be back to items view
        await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
    });

    test('should navigate back to root after opening a top-level container', async ({ page }) => {
        await page.goto('/');
        await createItem(page, {
            name: 'Regression Room',
            isContainer: true,
        });

        await page.getByText('Regression Room').click();
        const rootBreadcrumb = page.getByRole('button', { name: 'Navigate to all items' });
        await expect(rootBreadcrumb).toBeVisible();
        await expect(page.getByText('Regression Room')).toBeVisible();

        await rootBreadcrumb.click();
        await expect(page.getByText('Regression Room')).toBeVisible();
    });

    test('should provide touch-friendly mobile bottom navigation without horizontal overflow', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await waitForMeteorReady(page);

        const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
        await expect(mobileNav).toBeVisible();

        const mobileTabs = ['Items', 'Tags', 'Search', 'Data'];

        for (const tab of mobileTabs) {
            const link = mobileNav.getByRole('link', { name: tab });
            await expect(link).toBeVisible();

            const box = await link.boundingBox();
            if (box === null) throw new Error(`${tab} mobile tab is not visible`);
            expect(box.width, `${tab} mobile tab width`).toBeGreaterThanOrEqual(44);
            expect(box.height, `${tab} mobile tab height`).toBeGreaterThanOrEqual(44);

            await link.click();
            await expect(link).toHaveAttribute('aria-current', 'page');
        }

        await mobileNav.getByRole('link', { name: 'Items' }).click();
        await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();

        await mobileNav.getByRole('link', { name: 'Tags' }).click();
        await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible();

        await mobileNav.getByRole('link', { name: 'Search' }).click();
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();

        await mobileNav.getByRole('link', { name: 'Data' }).click();
        await expect(page.getByRole('heading', { name: 'Please use a computer' })).toBeVisible();

        const hasHorizontalOverflow = await page.evaluate(() => {
            const root = document.scrollingElement ?? document.documentElement;
            return root.scrollWidth > root.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);
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
