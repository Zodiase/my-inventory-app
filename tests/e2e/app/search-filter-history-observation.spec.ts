/** Settled filter changes must coalesce without adding per-click history entries. */
import { expect, test } from '@playwright/test';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createTag } from '../helpers/factories';

test('completed tag changes do not add per-click history checkpoints', async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await createTag(page, { name: 'History Tools' });
    await createTag(page, { name: 'History Spare' });
    await page.getByRole('link', { name: 'Search inventory' }).click();
    await page.getByRole('textbox', { name: 'Search query' }).fill('filter history absent');
    const reference = page.getByTestId('search-run-reference');
    await expect(reference).toContainText('0 results');
    const initial = await page.evaluate(() => history.length);
    const runA = await reference.getAttribute('data-run-id');
    await page.getByRole('button', { name: 'Tags: 0 selected' }).click();
    await page.getByRole('radio', { name: 'Include History Tools' }).click();
    await expect(reference).toContainText('0 results');
    await expect(reference).not.toHaveAttribute('data-run-id', runA ?? '');
    const afterFirst = await page.evaluate(() => history.length);
    const runB = await reference.getAttribute('data-run-id');
    await page.getByRole('radio', { name: 'Include History Spare' }).click();
    await expect(reference).toContainText('0 results');
    await expect(reference).not.toHaveAttribute('data-run-id', runB ?? '');
    const afterSecond = await page.evaluate(() => history.length);
    console.log(JSON.stringify({ initial, afterFirst, afterSecond }));
    expect(afterFirst).toBe(initial);
    expect(afterSecond).toBe(initial);
});
