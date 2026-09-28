/** Real-app verification of semantic search exits and server-correlated result traces. */
import { expect, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

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
    await expect(page.getByRole('button', { name: 'Scope: Kitchen' })).toBeVisible();
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
    await query.press('Enter');
    await query.fill('fast');
    await query.press('Enter');
    const runReference = page.getByTestId('search-run-reference');
    await expect(runReference).toContainText('0 results');
    const latestRunId = await runReference.getAttribute('data-run-id');
    await page.waitForTimeout(900);
    await expect(runReference).toHaveAttribute('data-run-id', latestRunId ?? '');
    await expect(page.getByText('No results found')).toBeVisible();
});

test('narrow Search mode debounces query, applies tag/type filters, and retains state on refresh', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const kitchenId = await createItem(page, { name: 'Kitchen', isContainer: true });
    const toolsTag = await createTag(page, { name: 'Tools' });
    const spareTag = await createTag(page, { name: 'Spare' });
    const selectedId = await createItem(page, {
        name: 'Plate fixture',
        containerId: kitchenId,
        tagIds: [toolsTag, spareTag],
    });
    await createItem(page, { name: 'Other fixture', containerId: kitchenId, tagIds: [toolsTag] });
    await page.goto(`/container/${kitchenId}`);
    await waitForMeteorReady(page);
    await page.getByRole('link', { name: 'Search inventory' }).click();
    const banner = page.getByRole('search', { name: 'Inventory search' });
    await expect(banner.getByRole('button', { name: /Scope: Kitchen; 0 active filters/u })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveCount(0);
    expect(
        await banner.locator('form').evaluate((element) => element.getBoundingClientRect().width)
    ).toBeGreaterThanOrEqual(160);

    await banner.getByRole('button', { name: /Scope: Kitchen/u }).click();
    const controls = page.getByRole('dialog', { name: 'Search controls' });
    await controls.getByRole('button', { name: 'Items', exact: true }).click();
    await expect(page).toHaveURL(/run=1/u);
    await controls.locator('section[aria-label="Tags"]').getByRole('button', { name: 'Tools' }).first().click();
    await controls.locator('section[aria-label="Tags"]').getByRole('button', { name: 'Spare' }).first().click();
    await expect(
        page.getByRole('region', { name: 'Search results' }).locator(`a[href="/items/${selectedId}"]`)
    ).toBeVisible();
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();

    const query = banner.getByRole('textbox', { name: 'Search query' });
    await query.fill('Plate');
    await expect(page).toHaveURL(/q=Plate/u);
    await expect(page).toHaveURL(/run=1/u);
    const searchUrl = page.url();
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
    await expect(query).toHaveValue('Plate');
    await expect(page).toHaveURL(searchUrl);
    await expect(page.getByRole('link', { name: 'Return to Kitchen' })).toHaveAttribute(
        'href',
        `/container/${kitchenId}`
    );
    await page.getByRole('button', { name: /Scope: Kitchen; 3 active filters/u }).click();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(query).toHaveValue('Plate');
    await expect(page.getByRole('button', { name: /Scope: All Items; 0 active filters/u })).toBeVisible();
});

test('typing waits before search while Enter runs immediately', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/search');
    await waitForMeteorReady(page);
    const query = page.getByRole('textbox', { name: 'Search query' });
    await query.fill('delayed phrase');
    await expect(page).toHaveURL(/q=delayed\+phrase/u);
    await page.waitForTimeout(100);
    await expect(page).not.toHaveURL(/run=1/u);
    await expect(page).toHaveURL(/run=1/u, { timeout: 5_000 });
    await expect(page.getByTestId('search-run-reference')).toBeVisible();

    await query.fill('immediate phrase');
    await query.press('Enter');
    await expect(page).toHaveURL(/q=immediate\+phrase.*run=1/u);
    await expect(page.getByTestId('search-run-reference')).toBeVisible();
});

test('an older saved filter is visible and Reset removes it while retaining the query', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const oldFilter = encodeURIComponent(JSON.stringify({ type: 'name', value: 'bathroom' }));
    await page.goto(`/search?q=ninja&f=${oldFilter}&run=1`);
    await waitForMeteorReady(page);
    await page.getByRole('button', { name: 'Scope: All Items; 1 active filter' }).click();
    const controls = page.getByRole('dialog', { name: 'Search controls' });
    await expect(controls.getByRole('heading', { name: 'Older saved filters · 1' })).toBeVisible();
    await controls.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page).toHaveURL(/q=ninja/u);
    await expect(page).not.toHaveURL(/(?:\?|&)f=/u);
    await expect(page.getByRole('textbox', { name: 'Search query' })).toHaveValue('ninja');
    await expect(page.getByRole('button', { name: 'Scope: All Items; 0 active filters' })).toBeVisible();
});
