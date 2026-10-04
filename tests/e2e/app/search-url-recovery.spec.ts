/** Live malformed-URL and query-clearing checks against disposable app fixtures only. */
import { expect, test } from '@playwright/test';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('invalid URL filters do not suppress valid scoped results or deterministic exit', async ({ page }) => {
    const kitchen = await createItem(page, { name: 'Kitchen', isContainer: true });
    const plate = await createItem(page, { name: 'URL Recovery Plate', containerId: kitchen });
    await createItem(page, { name: 'URL Recovery Outside' });
    const params = new URLSearchParams({ container: kitchen, scope: 'within', run: '1' });
    params.append('f', '{broken');
    params.append('f', JSON.stringify({ type: 'tagInclude', tagIds: [42] }));
    params.append('f', JSON.stringify({ type: 'unknown', value: 'x' }));
    params.append('f', JSON.stringify({ type: 'name', value: 'URL Recovery' }));
    params.append('f', JSON.stringify({ type: 'containerType', value: 'items' }));
    await page.goto(`/search?${params.toString()}`);
    await waitForMeteorReady(page);
    await expect(page.getByTestId('search-run-reference')).toContainText('1 result');
    await expect(
        page.getByRole('region', { name: 'Search results', exact: true }).locator('a[href^="/items/"]')
    ).toHaveAttribute('href', `/items/${plate}`);
    await expect(page.getByRole('link', { name: 'Return to Kitchen' })).toHaveAttribute(
        'href',
        `/container/${kitchen}`
    );
    await page.reload();
    await expect(page.getByTestId('search-run-reference')).toContainText('1 result');
    await page.getByRole('link', { name: 'Return to Kitchen' }).click();
    await expect(page).toHaveURL(new RegExp(`/container/${kitchen}$`));
});

test('missing scope root and invalid run recover to an idle global search that can run', async ({ page }) => {
    await page.goto('/search?scope=within&container=&run=invalid&f=null&f=%7Bbroken');
    await waitForMeteorReady(page);
    await expect(page.getByText('Ready to search', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exit search to All Items' })).toHaveAttribute('href', '/items');
    await expect(page.getByTestId('search-run-reference')).toHaveCount(0);
    const query = page.getByRole('textbox', { name: 'Search query' });
    await query.fill('missing recovery phrase');
    await query.press('Enter');
    await expect(page.getByTestId('search-run-reference')).toContainText('0 results');
    await expect(page).toHaveURL(/q=missing\+recovery\+phrase.*run=1/);
    expect(new URL(page.url()).searchParams.getAll('f')).toEqual([]);
});

test('Clear search removes query and keeps scope/filter with matching results', async ({ page }) => {
    const kitchen = await createItem(page, { name: 'Kitchen', isContainer: true });
    const plate = await createItem(page, { name: 'URL Plate', containerId: kitchen });
    await createItem(page, { name: 'URL Outside' });
    const params = new URLSearchParams({ q: 'missing recovery phrase', container: kitchen, scope: 'within', run: '1' });
    params.append('f', JSON.stringify({ type: 'containerType', value: 'items' }));
    await page.goto(`/search?${params.toString()}`);
    await waitForMeteorReady(page);
    await expect(page.getByTestId('search-run-reference')).toContainText('0 results');
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Search query' })).toHaveValue('');
    await expect(page.getByTestId('search-run-reference')).toContainText('1 result');
    const url = new URL(page.url());
    expect(url.searchParams.has('q')).toBe(false);
    expect(url.searchParams.get('container')).toBe(kitchen);
    expect(url.searchParams.get('scope')).toBe('within');
    expect(url.searchParams.getAll('f').map((value) => JSON.parse(value))).toEqual([
        { type: 'containerType', value: 'items' },
    ]);
    await expect(
        page.getByRole('region', { name: 'Search results', exact: true }).locator('a[href^="/items/"]')
    ).toHaveAttribute('href', `/items/${plate}`);
});

test('Clear search without filters returns idle and removes submitted marker', async ({ page }) => {
    await page.goto('/search?q=missing+recovery+phrase&run=1');
    await waitForMeteorReady(page);
    await expect(page.getByTestId('search-run-reference')).toContainText('0 results');
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(page.getByText('Ready to search', { exact: true })).toBeVisible();
    await expect(page.getByTestId('search-run-reference')).toHaveCount(0);
    await expect(page).toHaveURL(/\/search$/);
});
