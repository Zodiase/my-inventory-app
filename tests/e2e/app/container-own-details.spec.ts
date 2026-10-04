import { expect, test } from '@playwright/test';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

test.beforeEach(async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('own details target current rack and return preserves filters, list scroll and navigation', async ({ page }) => {
    const rack = await createItem(page, {
        name: 'Network rack',
        isContainer: true,
        description: 'Rack model and purchase history\nA full rack description.',
        properties: { model: 'Rack-MODEL', serialNumber: 'RACK-001', purchasePrice: 12999 },
    });
    const pdu = await createItem(page, {
        name: 'Bypass PDU',
        containerId: rack,
        description: 'Child-specific PDU information.',
    });
    for (let index = 0; index < 30; index++)
        await createItem(page, { name: `Bypass extra ${index}`, containerId: rack });
    await createItem(page, { name: 'Excluded child', containerId: rack });
    const before = await callMeteorMethod(page, 'items.search', [{ type: 'containerScope', containerRootId: rack }]);
    await page.goto(`/container/${rack}`);
    await page.getByRole('button', { name: /Add Filters/ }).click();
    await page.getByPlaceholder('Search by name...').fill('Bypass');
    await page.getByPlaceholder('Search by name...').press('Enter');
    await page.getByRole('button', { name: /Hide Filters/ }).click();
    await expect(page.getByRole('link', { name: 'View item Excluded child', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^View item Bypass/ })).toHaveCount(31);
    const list = page.getByTestId('items-list');
    await expect.poll(() => list.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(0);
    await list.evaluate((node) => {
        node.scrollTop = 180;
    });
    const top = await list.evaluate((node) => node.scrollTop);
    expect(top).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Container details', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/items/${rack}$`));
    await expect(page.getByRole('heading', { name: '📦 Network rack', exact: true })).toBeVisible();
    await expect(page.getByText('Rack-MODEL', { exact: true })).toBeVisible();
    await expect(page.getByText('$129.99', { exact: true })).toBeVisible();
    await expect(page.getByText('Child-specific PDU information.', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to contents', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/container/${rack}$`));
    await expect(page.getByRole('link', { name: 'View item Excluded child', exact: true })).toHaveCount(0);
    await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBe(top);
    await expect(page.getByRole('button', { name: 'Container details', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: /Add Filters/ })).toBeVisible();
    const after = await callMeteorMethod(page, 'items.search', [{ type: 'containerScope', containerRootId: rack }]);
    expect(after).toEqual(before);
    await list.evaluate((node) => {
        node.scrollTop = 0;
    });
    await page.getByRole('button', { name: 'Actions for Bypass PDU', exact: true }).click();
    await page
        .getByRole('dialog', { name: 'Actions for Bypass PDU', exact: true })
        .getByRole('button', { name: 'View Details', exact: true })
        .click();
    await expect(page).toHaveURL(new RegExp(`/items/${pdu}$`));
    await expect(page.getByRole('heading', { name: 'Bypass PDU', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to contents' })).toHaveCount(0);
});

test('empty and filtered-empty containers keep entry and browser Back preserves context', async ({ page }) => {
    const empty = await createItem(page, { name: 'Empty rack', isContainer: true });
    await page.goto(`/container/${empty}`);
    await page.getByRole('button', { name: 'Container details', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/items/${empty}$`));
    await expect(page.getByText('Description:', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Properties', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to contents', exact: true }).click();
    await page.getByRole('button', { name: /Add Filters/ }).click();
    await page.getByPlaceholder('Search by name...').fill('absent');
    await page.getByPlaceholder('Search by name...').press('Enter');
    await page.getByRole('button', { name: 'Container details', exact: true }).click();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/container/${empty}$`));
    await expect(page.getByPlaceholder('Search by name...')).toBeVisible();
});

// Keep this independent of the browser-Back journey: the bundled WebKit engine
// crashes on a subsequent full document load after repeated same-document
// history entries, even with plain HTML and no application JavaScript.
test('structured containers keep entry; global and missing omit it', async ({ page }) => {
    const stack = await createItem(page, {
        name: 'Physical rack',
        isContainer: true,
        properties: {
            storageLayout: { modelId: 'stack-tower-2col-5tier-v1', tierCount: 5, positions: ['left', 'right'] },
        },
    });
    await page.goto(`/container/${stack}`);
    await page.getByRole('button', { name: 'Container details', exact: true }).click();
    await expect(page.getByText('Storage tiers', { exact: true })).toBeVisible();
    await page.goto('/items');
    await expect(page.getByRole('button', { name: 'Container details', exact: true })).toHaveCount(0);
    await page.goto('/container/missing-current-rack');
    await expect(page.getByRole('heading', { name: 'Container Not Found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Container details', exact: true })).toHaveCount(0);
});
