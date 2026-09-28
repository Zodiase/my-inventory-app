/** Real-app verification of semantic search exits and server-correlated result traces. */
import { expect, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

interface SearchTraceSummary {
    runId: string;
    count: number;
    resultIds: string[];
    status: 'success' | 'empty' | 'error';
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('scoped direct and refreshed search exits to its container and traces the rendered cards', async ({
    page,
}, testInfo) => {
    const kitchenId = await createItem(page, { name: 'Kitchen', isContainer: true });
    const pantryId = await createItem(page, { name: 'Pantry', isContainer: true, containerId: kitchenId });
    const plateId = await createItem(page, { name: 'Trace Plate', containerId: kitchenId });
    const bowlId = await createItem(page, { name: 'Trace Bowl', containerId: pantryId });
    await createItem(page, { name: 'Trace Outside' });
    const filter = encodeURIComponent(JSON.stringify({ type: 'name', value: 'Trace' }));
    const searchPath = `/search?container=${encodeURIComponent(kitchenId)}&scope=within&f=${filter}&run=1`;

    await page.goto(searchPath);
    await waitForMeteorReady(page);
    const exit = page.getByRole('link', { name: 'Return to Kitchen' });
    await expect(exit).toHaveAttribute('href', `/container/${kitchenId}`);
    await expect(page.locator('.app-shell-header').getByRole('search', { name: 'Inventory search' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scoped search' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.app-shell-main').getByRole('heading', { name: 'Search' })).toHaveCount(0);
    const runReference = page.getByTestId('search-run-reference');
    await expect(runReference).toContainText('2 results');
    const firstRunId = await runReference.getAttribute('data-run-id');
    expect(firstRunId).toMatch(/^srch-[A-Za-z0-9]{16}$/u);
    const firstTrace = await callMeteorMethod<SearchTraceSummary>(page, 'items.getSearchTrace', firstRunId);
    expect(firstTrace.runId).toBe(firstRunId);
    expect(firstTrace.status).toBe('success');
    expect(firstTrace.count).toBe(2);
    expect(new Set(firstTrace.resultIds)).toEqual(new Set([plateId, bowlId]));
    const renderedIds = await page
        .getByRole('region', { name: 'Search results' })
        .locator('a[href^="/items/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')?.split('/').pop()));
    expect(renderedIds).toEqual(firstTrace.resultIds);
    await page.screenshot({ path: testInfo.outputPath('scoped-search-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(exit).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('scoped-search-phone.png') });
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await expect(exit).toHaveAttribute('href', `/container/${kitchenId}`);
    await expect(runReference).toContainText('2 results');
    const refreshedRunId = await runReference.getAttribute('data-run-id');
    expect(refreshedRunId).not.toBe(firstRunId);

    await page.getByRole('region', { name: 'Search results' }).locator(`a[href="/items/${plateId}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/items/${plateId}$`));
    await expect(page.getByRole('link', { name: /Back to search/u })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp('/search\\?'));
    await expect(runReference).toContainText('2 results');

    await exit.click();
    await expect(page).toHaveURL(new RegExp(`/container/${kitchenId}$`));
    await expect(page.getByRole('heading', { name: 'Kitchen' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp('/search\\?'));
    await expect(exit).toBeVisible();
});

test('global search exits to all items and empty results retain a server run reference', async ({ page }) => {
    await page.goto(
        '/search?f=' + encodeURIComponent(JSON.stringify({ type: 'name', value: 'Never Found' })) + '&run=1'
    );
    await waitForMeteorReady(page);
    const exit = page.getByRole('link', { name: 'Exit search to All Items' });
    await expect(exit).toHaveAttribute('href', '/items');
    await expect(page.getByText('No results found')).toBeVisible();
    const runReference = page.getByTestId('search-run-reference');
    await expect(runReference).toContainText('0 results');
    const runId = await runReference.getAttribute('data-run-id');
    const trace = await callMeteorMethod<SearchTraceSummary>(page, 'items.getSearchTrace', runId);
    expect(trace).toMatchObject({ runId, count: 0, resultIds: [], status: 'empty' });
    await exit.click();
    await expect(page).toHaveURL(/\/items$/u);
    await page.goBack();
    await expect(page.getByText('No results found')).toBeVisible();
});

test('a delayed stale run never replaces the latest server result or reference', async ({ page }) => {
    await page.goto('/search');
    await waitForMeteorReady(page);
    await page.evaluate(() => {
        // @ts-expect-error Meteor is available in the app browser.
        const original = Meteor.callAsync.bind(Meteor);
        // @ts-expect-error Replace only this page's test call, leaving the server and shared database untouched.
        Meteor.callAsync = async (method: string, ...args: unknown[]) => {
            const response = await original(method, ...args);
            const fragments = args[0] as Array<{ type: string; value?: string }>;
            if (method === 'items.searchTraced' && fragments.some((fragment) => fragment.value === 'slow')) {
                await new Promise((resolve) => setTimeout(resolve, 800));
            }
            return response;
        };
    });
    const query = page.getByRole('textbox', { name: 'Search query' });
    await query.fill('slow');
    await page.getByRole('button', { name: 'Submit search' }).click();
    await query.fill('fast');
    await page.getByRole('button', { name: 'Submit search' }).click();
    const runReference = page.getByTestId('search-run-reference');
    await expect(runReference).toContainText('0 results');
    const latestRunId = await runReference.getAttribute('data-run-id');
    await page.waitForTimeout(900);
    await expect(runReference).toHaveAttribute('data-run-id', latestRunId ?? '');
    await expect(page.getByText('No results found')).toBeVisible();
});
