import { expect, test, type Page } from '@playwright/test';

import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

const openDetails = async (page: Page, name: string, id: string): Promise<void> => {
    const trigger = page.getByRole('button', { name: `Actions for ${name}`, exact: true });
    const before = page.url();
    await trigger.click();
    await expect(page).toHaveURL(before);
    const menu = page.getByRole('dialog', { name: `Actions for ${name}`, exact: true });
    await expect(menu.getByRole('button')).toHaveCount(1);
    await expect(menu.getByRole('button', { name: 'View Details' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await menu.getByRole('button', { name: 'View Details' }).click();
    await expect(page).toHaveURL(new RegExp(`/items/${id}(?:\\?|$)`));
    await expect(page.getByRole('heading').filter({ hasText: name })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
    await page.goto('/items');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('ordinary item and container actions preserve separate primary navigation', async ({ page }) => {
    const room = await createItem(page, { name: 'Row actions room', isContainer: true });
    const item = await createItem(page, { name: 'Row actions hammer' });
    await page.goto('/items');
    await expect(page.locator('a button')).toHaveCount(0);
    await openDetails(page, 'Row actions hammer', item);
    await page.goto('/items');
    await openDetails(page, 'Row actions room', room);
    await page.goto('/items');
    await page.getByRole('link', { name: 'Open container Row actions room', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/container/${room}$`));
});

test('hoisted group and child expose their own detail targets', async ({ page }) => {
    const home = await createItem(page, { name: 'Row actions home', isContainer: true });
    const floor = await createItem(page, {
        name: 'Row actions floor',
        isContainer: true,
        containerId: home,
        properties: { childrenPresentation: 'hoist-in-parent' },
    });
    const room = await createItem(page, { name: 'Hoisted room', isContainer: true, containerId: floor });
    await page.goto(`/container/${home}`);
    await openDetails(page, 'Hoisted room', room);
    await page.goto(`/container/${home}`);
    await openDetails(page, 'Row actions floor', floor);
});

test('physical slot and accessible fallback retain detail actions', async ({ page }) => {
    const modelId = 'stack-tower-2col-5tier-v1';
    const stack = await createItem(page, {
        name: 'Action stack',
        isContainer: true,
        properties: { storageLayout: { modelId, tierCount: 5, positions: ['left', 'right'] } },
    });
    const bin = await createItem(page, {
        name: 'Action bin',
        isContainer: true,
        containerId: stack,
        properties: { storagePlacement: { modelId, tier: 1, position: 'left' } },
    });
    await page.goto(`/container/${stack}`);
    await openDetails(page, 'Action bin', bin);
    await page.goto(`/container/${stack}`);
    await page.getByText('Show accessible list view', { exact: true }).click();
    const triggers = page.getByRole('button', { name: 'Actions for Action bin', exact: true });
    await expect(triggers).toHaveCount(2);
    await triggers.last().click();
    await page
        .getByRole('dialog', { name: 'Actions for Action bin' })
        .getByRole('button', { name: 'View Details' })
        .click();
    await expect(page).toHaveURL(new RegExp(`/items/${bin}$`));
});

test('search actions retain return context and tag results navigate to the same item', async ({ page }) => {
    const tag = await createTag(page, { name: 'Row action tools' });
    const id = await createItem(page, { name: 'Row search pliers', tagIds: [tag] });
    await page.goto('/search?q=Row%20search%20pliers&run=1');
    await openDetails(page, 'Row search pliers', id);
    await page.getByRole('link', { name: '← Back to search' }).click();
    await expect(page).toHaveURL(/\/search\?q=Row%20search%20pliers&run=1$/);
    await expect(page.getByRole('button', { name: 'Actions for Row search pliers' })).toBeVisible();
    await page.goto(`/tags/${tag}`);
    await openDetails(page, 'Row search pliers', id);
});
