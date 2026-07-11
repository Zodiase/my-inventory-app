import { test, expect, type Page } from '@playwright/test';
import { waitForMeteorReady, resetDatabase } from '../helpers/database';
import { createItem } from '../helpers/factories';

/**
 * Basic app smoke tests to verify the app loads and core navigation works.
 */

const keyRoutesForNestedInteractiveAudit = [
    '/',
    '/items',
    '/container/missing-container-id',
    '/items/missing-item-id',
    '/tags',
    '/tags/missing-tag-id',
    '/search',
    '/settings/data',
    '/does-not-exist',
];

const nestedInteractiveAuditViewports = [
    { label: 'desktop', width: 1280, height: 800 },
    { label: 'mobile', width: 390, height: 844 },
];

async function expectNoAnchorWrappedButtons(page: Page, context: string): Promise<void> {
    const offenders = await page.locator('a button').evaluateAll((buttons) =>
        buttons.map((button) => {
            const anchor = button.closest('a');

            return {
                anchorHref: anchor?.getAttribute('href') ?? '',
                buttonText: button.textContent?.trim() ?? '',
                anchorHtml: anchor?.outerHTML.slice(0, 300) ?? '',
            };
        })
    );

    expect(offenders, `${context} should not render buttons inside anchors`).toEqual([]);
}

async function focusHrefWithKeyboard(page: Page, href: string): Promise<void> {
    for (let tabCount = 0; tabCount < 30; tabCount += 1) {
        if (
            await page.evaluate((expectedHref) => {
                return document.activeElement?.getAttribute('href') === expectedHref;
            }, href)
        ) {
            return;
        }

        await page.keyboard.press('Tab');
    }

    throw new Error(`Could not focus link with href "${href}" using keyboard navigation`);
}

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

        // Should show app header without adding a competing heading before the page title
        await expect(page.getByText('Inventory App', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Inventory App' })).toHaveCount(0);

        // Should show navigation tabs as links, not nested interactive link-button pairs
        const desktopNav = page.getByRole('navigation', { name: 'Desktop primary navigation' });
        await expect(desktopNav.getByRole('link', { name: 'Items' })).toBeVisible();
        await expect(desktopNav.getByRole('link', { name: 'Tags' })).toBeVisible();
        await expect(desktopNav.locator('a button')).toHaveCount(0);
    });

    test('home page should not duplicate the Items nav label as a page heading', async ({ page }) => {
        await page.goto('/');

        const visibleItemsLabels = page
            .getByRole('link', { name: 'Items', exact: true })
            .or(page.getByRole('heading', { name: 'Items', exact: true }));

        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Items', exact: true })).toHaveCount(0);
        await expect(visibleItemsLabels).toHaveCount(1);

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Items', exact: true })).toHaveCount(0);
        await expect(visibleItemsLabels).toHaveCount(1);
    });

    test('should navigate between Items and Tags views', async ({ page }) => {
        await page.goto('/');

        // Default view should be All Items to avoid duplicating the nav label
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Item' })).toBeVisible();

        const desktopNav = page.getByRole('navigation', { name: 'Desktop primary navigation' });
        await expect(desktopNav).toBeVisible();
        await expect(desktopNav.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');

        // Click Tags tab
        await desktopNav.getByRole('link', { name: 'Tags' }).click();

        // Should show tags view (AllTagsView component)
        // Note: Need to check what's actually rendered in AllTagsView
        await page.waitForTimeout(500); // Brief wait for view transition
        await expect(desktopNav.getByRole('link', { name: 'Tags' })).toHaveAttribute('aria-current', 'page');

        // Click back to Items tab
        await desktopNav.getByRole('link', { name: 'Items' }).click();

        // Should be back to items view
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
    });

    test('fallback navigation links are semantic links', async ({ page }) => {
        await page.goto('/items/missing-item-id');
        await waitForMeteorReady(page);
        await expect(page.getByRole('heading', { name: 'Item Not Found' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Go to Items' })).toBeVisible();
        await expect(page.locator('a button')).toHaveCount(0);

        await page.goto('/tags/missing-tag-id');
        await waitForMeteorReady(page);
        await expect(page.getByRole('heading', { name: 'Tag Not Found' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Go to Tags' })).toBeVisible();
        await expect(page.locator('a button')).toHaveCount(0);
    });

    test('key routes do not render buttons inside anchors', async ({ page }) => {
        test.setTimeout(60_000);

        for (const viewport of nestedInteractiveAuditViewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            for (const route of keyRoutesForNestedInteractiveAudit) {
                await page.goto(route);
                await waitForMeteorReady(page);
                await expectNoAnchorWrappedButtons(page, `${viewport.label} ${route}`);
            }
        }
    });

    test('should navigate back to root after opening a top-level container', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Regression Room',
            isContainer: true,
        });
        await page.goto('/items');
        await waitForMeteorReady(page);

        await page.getByTestId('items-list').getByText('Regression Room').click();
        const rootBreadcrumb = page.getByRole('button', { name: 'Navigate to all items' });
        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await expect(rootBreadcrumb).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Regression Room' })).toBeVisible();
        await expect(
            page.getByRole('navigation', { name: 'Desktop primary navigation' }).getByRole('link', { name: 'Items' })
        ).toHaveAttribute('aria-current', 'page');

        await page.goBack();
        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByTestId('items-list').getByText('Regression Room')).toBeVisible();

        await page.getByTestId('items-list').getByText('Regression Room').click();
        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await rootBreadcrumb.click();
        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.getByTestId('items-list').getByText('Regression Room')).toBeVisible();

        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await expect(page.getByRole('heading', { name: 'Regression Room' })).toBeVisible();
    });

    test('items and containers expose semantic links with keyboard navigation', async ({ page }, testInfo) => {
        const containerId = await createItem(page, {
            name: 'Accessible Room',
            isContainer: true,
        });
        const itemId = await createItem(page, {
            name: 'Accessible Lamp',
        });

        await page.goto('/');
        await waitForMeteorReady(page);

        const containerLink = page.getByRole('link', { name: 'Open container Accessible Room' });
        const itemLink = page.getByRole('link', { name: 'View item Accessible Lamp' });

        await expect(containerLink).toBeVisible();
        await expect(containerLink).toHaveAttribute('href', `/container/${containerId}`);
        await expect(itemLink).toBeVisible();
        await expect(itemLink).toHaveAttribute('href', `/items/${itemId}`);

        const containerContextMenuWasNotCanceled = await containerLink.evaluate((element) =>
            element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2, cancelable: true }))
        );
        const itemContextMenuWasNotCanceled = await itemLink.evaluate((element) =>
            element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2, cancelable: true }))
        );
        expect(containerContextMenuWasNotCanceled).toBe(true);
        expect(itemContextMenuWasNotCanceled).toBe(true);

        // Mobile WebKit does not expose desktop-style Tab traversal. The link
        // semantics above still run on iPhone; hardware-keyboard navigation is
        // covered by the Chromium and iPad projects.
        if (testInfo.project.name === 'iPhone') return;

        const itemHref = `/items/${itemId}`;
        await focusHrefWithKeyboard(page, itemHref);
        await expect(page.locator(`a[href="${itemHref}"]`)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`/items/${itemId}$`));
        await expect(page.getByRole('heading', { name: 'Accessible Lamp' })).toBeVisible();

        await page.goto('/');
        await waitForMeteorReady(page);

        const reloadedContainerLink = page.getByRole('link', { name: 'Open container Accessible Room' });
        const containerHref = `/container/${containerId}`;
        await expect(reloadedContainerLink).toBeVisible();
        await focusHrefWithKeyboard(page, containerHref);
        await expect(page.locator(`a[href="${containerHref}"]`)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await expect(page.getByRole('button', { name: 'Navigate to all items' })).toBeVisible();
    });

    test('should deep-link directly to a container view', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Deep Link Room',
            isContainer: true,
        });
        await createItem(page, {
            name: 'Deep Link Lamp',
            containerId,
        });

        await page.goto(`/container/${containerId}`);
        await waitForMeteorReady(page);

        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await expect(page.getByText('Deep Link Lamp')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Navigate to all items' })).toBeVisible();
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
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();

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

    test('should close Create Item modal on route change', async ({ page }) => {
        await page.goto('/search');
        await waitForMeteorReady(page);
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();

        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Items' })
            .click();
        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();

        await page.getByRole('button', { name: 'Create Item' }).click();
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();

        await page.goBack();

        await expect(page).toHaveURL(/\/search$/);
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toHaveCount(0);
        await expect(page.locator('input[name="name"]')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    });
});
