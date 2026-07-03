import { expect, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
});

test.describe('Item detail routing', () => {
    test('updates the URL when opening an item from the list', async ({ page }) => {
        const itemId = await createItem(page, {
            name: 'Route Backed Lamp',
            description: 'List click should become a shareable route',
        });

        await page.goto('/items');
        await waitForMeteorReady(page);

        const itemLink = page.getByRole('link', { name: 'View item Route Backed Lamp' });
        await expect(itemLink).toBeVisible();
        await expect(itemLink).toHaveAttribute('href', `/items/${itemId}`);

        await itemLink.click();

        await expect(page).toHaveURL(new RegExp(`/items/${itemId}$`));
        await expect(page.getByRole('heading', { name: 'Route Backed Lamp' })).toBeVisible();
        await expect(page.getByText('List click should become a shareable route')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Item Details' })).toHaveCount(0);
    });

    test('renders item details from a direct item URL', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Direct Link Cabinet',
            isContainer: true,
        });
        const itemId = await createItem(page, {
            name: 'Direct Link Flashlight',
            description: 'Direct routes should render without prior list state',
            containerId,
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page).toHaveURL(new RegExp(`/items/${itemId}$`));
        await expect(page.getByRole('heading', { name: 'Direct Link Flashlight' })).toBeVisible();
        await expect(page.getByText('Direct routes should render without prior list state')).toBeVisible();
        await expect(page.getByText('Location:')).toBeVisible();
        await expect(page.getByText('Direct Link Cabinet', { exact: true })).toBeVisible();
    });

    test('returns to the containing container after deleting a nested route-backed item', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Return Cabinet',
            isContainer: true,
        });
        const itemId = await createItem(page, {
            name: 'Return Battery',
            containerId,
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Return Battery' })).toBeVisible();
        await page.getByRole('button', { name: /Delete$/ }).click();
        await expect(page.getByRole('heading', { name: 'Delete Item' })).toBeVisible();
        await page.getByRole('button', { name: /delete item/i }).click();

        await expect(page).toHaveURL(new RegExp(`/container/${containerId}$`));
        await expect(page.getByRole('heading', { name: 'Return Cabinet' })).toBeVisible();
        await expect(page.getByText('No items at this level')).toBeVisible();
        await expect(page.getByText('Return Battery', { exact: true })).toHaveCount(0);
    });

    test('returns to the items list after deleting a root route-backed item', async ({ page }) => {
        const itemId = await createItem(page, {
            name: 'Return Root Item',
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Return Root Item' })).toBeVisible();
        await page.getByRole('button', { name: /Delete$/ }).click();
        await expect(page.getByRole('heading', { name: 'Delete Item' })).toBeVisible();
        await page.getByRole('button', { name: /delete item/i }).click();

        await expect(page).toHaveURL(/\/items$/);
        await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
        await expect(page.getByText('Return Root Item', { exact: true })).toHaveCount(0);
    });

    test('shows a not-found state for missing and deleted container routes', async ({ page }) => {
        await page.goto('/container/missing-container-id');
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Container Not Found' })).toBeVisible();
        await expect(page.getByText(/doesn't exist, is not a container, or has been deleted/)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Go to Items' })).toHaveAttribute('href', '/items');
        await expect(page.getByText('No items at this level')).toHaveCount(0);

        const deletedContainerId = await createItem(page, {
            name: 'Deleted Container Route',
            isContainer: true,
        });
        await callMeteorMethod<number>(page, 'deleteItem', deletedContainerId);

        await page.goto(`/container/${deletedContainerId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Container Not Found' })).toBeVisible();
        await expect(page.getByText('Deleted Container Route', { exact: true })).toHaveCount(0);
        await expect(page.getByText('No items at this level')).toHaveCount(0);
    });

    test('preserves scoped search context after opening a result and going back', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Scoped Search Cabinet',
            isContainer: true,
        });
        const firstScopedItemId = await createItem(page, {
            name: 'Scoped Wrench',
            containerId,
        });
        await createItem(page, {
            name: 'Global Wrench',
        });
        await createItem(page, {
            name: 'Scoped Spare Filter',
            containerId,
        });
        await createItem(page, {
            name: 'Global Spare Filter',
        });

        await page.goto(`/container/${containerId}`);
        await waitForMeteorReady(page);
        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Search' })
            .click();

        const scopedSearchButton = page.getByRole('button', { name: 'Scoped search', exact: true });

        await scopedSearchButton.click();
        await expect(scopedSearchButton).toHaveAttribute('aria-pressed', 'true');
        await expect(scopedSearchButton).toContainText('Scoped Search Cabinet');

        await page.getByRole('textbox', { name: 'Search query' }).fill('Wrench');
        await page.getByRole('button', { name: 'Submit search' }).click();

        const scopedWrenchResult = page.locator('button').filter({ hasText: 'Scoped Wrench' }).first();
        await expect(scopedWrenchResult).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Global Wrench' })).toHaveCount(0);

        await scopedWrenchResult.click();
        await expect(page).toHaveURL(new RegExp(`/items/${firstScopedItemId}$`));
        await expect(page.getByRole('heading', { name: 'Scoped Wrench' })).toBeVisible();

        await page.goBack();
        await expect(page).toHaveURL(/\/search$/);
        await expect(scopedSearchButton).toHaveAttribute('aria-pressed', 'true');
        await expect(scopedSearchButton).toContainText('Scoped Search Cabinet');

        await page.getByRole('button', { name: 'Clear search' }).click();
        await page.getByRole('textbox', { name: 'Search query' }).fill('Spare Filter');
        await page.getByRole('button', { name: 'Submit search' }).click();

        await expect(page.locator('button').filter({ hasText: 'Scoped Spare Filter' })).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Global Spare Filter' })).toHaveCount(0);
    });

    test('returns to scoped search after deleting a search result detail', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Search Delete Cabinet',
            isContainer: true,
        });
        const itemId = await createItem(page, {
            name: 'Scoped Delete Target',
            containerId,
        });
        await createItem(page, {
            name: 'Global Delete Target',
        });

        await page.goto(`/container/${containerId}`);
        await waitForMeteorReady(page);
        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Search' })
            .click();

        const scopedSearchButton = page.getByRole('button', { name: 'Scoped search', exact: true });

        await scopedSearchButton.click();
        await expect(scopedSearchButton).toHaveAttribute('aria-pressed', 'true');
        await expect(scopedSearchButton).toContainText('Search Delete Cabinet');

        await page.getByRole('textbox', { name: 'Search query' }).fill('Delete Target');
        await page.getByRole('button', { name: 'Submit search' }).click();

        const scopedDeleteResult = page.locator('button').filter({ hasText: 'Scoped Delete Target' }).first();
        await expect(scopedDeleteResult).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Global Delete Target' })).toHaveCount(0);

        await scopedDeleteResult.click();
        await expect(page).toHaveURL(new RegExp(`/items/${itemId}$`));
        await expect(page.getByRole('heading', { name: 'Scoped Delete Target' })).toBeVisible();

        await page.getByRole('button', { name: /Delete$/ }).click();
        await expect(page.getByRole('heading', { name: 'Delete Item' })).toBeVisible();
        await page.getByRole('button', { name: /delete item/i }).click();

        await expect(page).toHaveURL(/\/search$/);
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Search query' })).toHaveValue('Delete Target');
        await expect(scopedSearchButton).toHaveAttribute('aria-pressed', 'true');
        await expect(scopedSearchButton).toContainText('Search Delete Cabinet');
    });

    test('does not reuse stale scoped context after direct item-detail navigation', async ({ page }) => {
        const containerId = await createItem(page, {
            name: 'Prior Scope Cabinet',
            isContainer: true,
        });
        await createItem(page, {
            name: 'Scoped Socket Set',
            containerId,
        });
        await createItem(page, {
            name: 'Global Socket Set',
        });
        const directItemId = await createItem(page, {
            name: 'Direct Detail Compass',
        });

        await page.goto(`/container/${containerId}`);
        await waitForMeteorReady(page);
        await page
            .getByRole('navigation', { name: 'Desktop primary navigation' })
            .getByRole('link', { name: 'Search' })
            .click();

        const scopedSearchButton = page.getByRole('button', { name: 'Scoped search', exact: true });

        await scopedSearchButton.click();
        await expect(scopedSearchButton).toHaveAttribute('aria-pressed', 'true');
        await expect(scopedSearchButton).toContainText('Prior Scope Cabinet');

        await page.getByRole('textbox', { name: 'Search query' }).fill('Socket Set');
        await page.getByRole('button', { name: 'Submit search' }).click();

        await expect(page.locator('button').filter({ hasText: 'Scoped Socket Set' })).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Global Socket Set' })).toHaveCount(0);

        await page.goto(`/items/${directItemId}`);
        await waitForMeteorReady(page);
        await expect(page.getByRole('heading', { name: 'Direct Detail Compass' })).toBeVisible();

        await page.goto('/search');
        await waitForMeteorReady(page);

        await expect(page.getByRole('button', { name: 'Global search', exact: true })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(page.getByRole('button', { name: 'Scoped search unavailable' })).toBeDisabled();

        await page.getByRole('textbox', { name: 'Search query' }).fill('Socket Set');
        await page.getByRole('button', { name: 'Submit search' }).click();

        await expect(page.locator('button').filter({ hasText: 'Scoped Socket Set' }).first()).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Global Socket Set' }).first()).toBeVisible();
    });

    test('removes a tag from route-backed item details', async ({ page }) => {
        const tagId = await createTag(page, {
            name: 'Route Detail Tag',
        });
        const itemId = await createItem(page, {
            name: 'Tagged Route Item',
            tagIds: [tagId],
        });

        await page.goto(`/items/${itemId}`);
        await waitForMeteorReady(page);

        await expect(page.getByRole('heading', { name: 'Tagged Route Item' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Remove Route Detail Tag tag' })).toBeVisible();

        await page.getByRole('button', { name: 'Remove Route Detail Tag tag' }).click();
        await expect(page.getByRole('button', { name: 'Remove Route Detail Tag tag' })).toHaveCount(0);

        await page.reload({ waitUntil: 'networkidle' });
        await waitForMeteorReady(page);
        await expect(page.getByRole('button', { name: 'Remove Route Detail Tag tag' })).toHaveCount(0);
    });
});
