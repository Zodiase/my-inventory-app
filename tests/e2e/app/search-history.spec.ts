import { expect, test, type Page } from '@playwright/test';
import { waitForMeteorReady } from '../helpers/database';

test('Enter checkpoints coalesce subsequent edits and repeat Enter reruns without history spam', async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await page.getByRole('link', { name: 'Search inventory' }).click();
    const query = page.getByRole('textbox', { name: 'Search query' });
    const reference = page.getByTestId('search-run-reference');
    await query.fill('enter alpha absent');
    await query.press('Enter');
    await expect(reference).toContainText('0 results');
    const firstUrl = page.url();
    const firstRun = await reference.getAttribute('data-run-id');
    const firstLength = await page.evaluate(() => history.length);
    await query.fill('enter beta');
    await query.fill('enter beta absent');
    await query.press('Enter');
    await expect(reference).toContainText('0 results');
    await expect(reference).not.toHaveAttribute('data-run-id', firstRun ?? '');
    const secondUrl = page.url();
    expect(await page.evaluate(() => history.length)).toBe(firstLength + 1);
    const secondRun = await reference.getAttribute('data-run-id');
    await query.press('Enter');
    await expect(reference).not.toHaveAttribute('data-run-id', secondRun ?? '');
    expect(await page.evaluate(() => history.length)).toBe(firstLength + 1);
    await page.goBack();
    await expect(page).toHaveURL(firstUrl);
    await expect(query).toHaveValue('enter alpha absent');
    await expect(reference).toContainText('0 results');
    await page.goForward();
    await expect(page).toHaveURL(secondUrl);
    await expect(query).toHaveValue('enter beta absent');
    await expect(reference).toContainText('0 results');
});

const completedQuery = async (page: Page, query: string): Promise<string> => {
    const reference = page.getByTestId('search-run-reference');
    const previousRun = (await reference.count()) === 0 ? null : await reference.getAttribute('data-run-id');
    await page.getByRole('textbox', { name: 'Search query' }).fill(query);
    await expect(page).toHaveURL(new RegExp(`q=${query.replaceAll(' ', '\\+')}.*run=1`));
    await expect(reference).toBeVisible();
    await expect(reference).not.toHaveAttribute('data-run-id', previousRun ?? '');
    return page.url();
};

test('completed searches survive coalesced typing, Back, and Forward', async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await page.getByRole('link', { name: 'Search inventory' }).click();
    const first = await completedQuery(page, 'history alpha absent');
    const query = page.getByRole('textbox', { name: 'Search query' });
    await query.fill('history b');
    const second = await completedQuery(page, 'history beta absent');
    await page.goBack();
    await expect(page).toHaveURL(first);
    await expect(query).toHaveValue('history alpha absent');
    await page.goBack();
    await expect(page).toHaveURL(/\/items$/);
    await page.goForward();
    await expect(page).toHaveURL(first);
    await page.goForward();
    await expect(page).toHaveURL(second);
    await expect(query).toHaveValue('history beta absent');
});

test('Enter completes the draft without an extra unsubmitted history entry', async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await page.getByRole('link', { name: 'Search inventory' }).click();
    const first = await completedQuery(page, 'history alpha absent');
    const query = page.getByRole('textbox', { name: 'Search query' });
    await query.fill('history beta absent');
    await query.press('Enter');
    await expect(page).toHaveURL(/q=history\+beta\+absent.*run=1/);
    await expect(page.getByTestId('search-run-reference')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(first);
    await expect(query).toHaveValue('history alpha absent');
});
