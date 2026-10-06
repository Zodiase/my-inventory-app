import { expect, test, type Locator, type Page } from '@playwright/test';

import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { callMeteorMethod, createItem, createTag } from '../helpers/factories';
import { TagsPage } from '../helpers/page-objects';

const longTagName = 'Emergency communication and navigation equipment with rechargeable backup power';
const MOBILE_TAG_ROW_TEST_TIMEOUT_MS = 60_000;

async function seedHierarchy(page: Page): Promise<{ deepestTagId: string }> {
    const names = [
        'Household equipment',
        'Seasonal storage',
        'Outdoor recreation',
        'Cold weather camping',
        'Safety systems',
        longTagName,
    ];
    let parentId: string | undefined;

    for (const name of names) {
        parentId = await callMeteorMethod<string>(page, 'createTag', { name, parentTagId: parentId ?? '' });
    }

    if (parentId === undefined) throw new Error('Hierarchy fixture did not create a deepest tag');

    await createItem(page, { name: 'Satellite communicator', tagIds: [parentId] });
    return { deepestTagId: parentId };
}

function tagRowByExactName(page: Page, name: string): Locator {
    return page.locator('.tag-body').filter({ has: page.getByText(name, { exact: true }) });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('Mobile tag hierarchy and row actions', () => {
    test('keeps deep, long tag rows bounded from phone through desktop', async ({ page }, testInfo) => {
        test.setTimeout(MOBILE_TAG_ROW_TEST_TIMEOUT_MS);

        const { deepestTagId } = await seedHierarchy(page);
        const tagsPage = new TagsPage(page);
        const widths = [320, 390, 430, 768, 1280] as const;

        await tagsPage.goto();
        await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible();

        for (const width of widths) {
            await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });

            const deepestRow = tagsPage.tagByName(longTagName);
            await expect(deepestRow.locator('.tag-name')).toHaveText(longTagName);
            await expect(deepestRow.locator('.tag-item-count')).toHaveText('1 item');

            const layout = await page.evaluate(() => {
                const row = [...document.querySelectorAll('.tag-body')].find((candidate) =>
                    candidate.textContent?.includes('Emergency communication and navigation equipment')
                );
                if (row === undefined) throw new Error('Deep hierarchy row is missing');
                const rect = row.getBoundingClientRect();

                return {
                    viewportWidth: document.documentElement.clientWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                    rowLeft: rect.left,
                    rowRight: rect.right,
                    rowHeight: rect.height,
                };
            });

            expect(layout.scrollWidth).toBe(layout.viewportWidth);
            expect(layout.rowLeft).toBeGreaterThanOrEqual(0);
            expect(layout.rowRight).toBeLessThanOrEqual(width);

            const overflowAction = deepestRow.getByRole('button', { name: `Actions for ${longTagName}` });
            const directActions = deepestRow.locator('.tag-desktop-actions button');

            if (width <= 600) {
                await expect(overflowAction).toBeVisible();
                await expect(directActions.first()).toBeHidden();
                await expect(deepestRow.locator('.tag-mobile-hierarchy')).toContainText('Level 6');
                await expect(deepestRow.locator('.tag-mobile-hierarchy')).toContainText('under Safety systems');
                await expect(deepestRow.locator('.tag-path')).toBeHidden();

                const actionBox = await overflowAction.boundingBox();
                expect(actionBox).not.toBeNull();
                expect(actionBox?.width).toBeGreaterThanOrEqual(44);
                expect(actionBox?.height).toBeGreaterThanOrEqual(44);
                expect(layout.rowHeight).toBeLessThanOrEqual(88);
            } else {
                await expect(overflowAction).toBeHidden();
                await expect(directActions).toHaveCount(3);
                await expect(directActions.first()).toBeVisible();
                await expect(deepestRow.locator('.tag-path')).toBeVisible();
            }

            const screenshotPath = testInfo.outputPath(`tag-hierarchy-${width}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            await testInfo.attach(`tag hierarchy at ${width}px`, { path: screenshotPath, contentType: 'image/png' });
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await tagsPage.tagByName(longTagName).locator('.tag-name-button').click();
        await expect(page).toHaveURL(new RegExp(`/tags/${deepestTagId}$`));
        await expect(page.getByText('Satellite communicator', { exact: true })).toBeVisible();
    });

    test('supports add, rename, and confirmed delete through the visible mobile menu', async ({ page }) => {
        test.setTimeout(MOBILE_TAG_ROW_TEST_TIMEOUT_MS);

        const parentId = await createTag(page, { name: 'Emergency kits' });
        await callMeteorMethod<string>(page, 'createTag', { name: 'Radio supplies', parentTagId: parentId });
        const tagsPage = new TagsPage(page);

        await page.setViewportSize({ width: 390, height: 844 });
        await tagsPage.goto();

        let row = tagRowByExactName(page, 'Radio supplies');
        await row.getByRole('button', { name: 'Actions for Radio supplies' }).click();
        let menu = page.getByRole('menu', { name: 'Actions for Radio supplies' });
        await menu.getByRole('menuitem').filter({ hasText: 'Add child' }).click();
        await page.locator('input[name="name"]').fill('Spare antennas');
        await page.getByRole('button', { name: 'Create Tag', exact: true }).click();
        await expect(tagsPage.tagByName('Spare antennas')).toBeVisible();

        row = tagRowByExactName(page, 'Radio supplies');
        await row.getByRole('button', { name: 'Actions for Radio supplies' }).click();
        menu = page.getByRole('menu', { name: 'Actions for Radio supplies' });
        await menu.getByRole('menuitem').filter({ hasText: 'Rename' }).click();
        await page.locator('input[name="name"]').fill('Field radio supplies');
        await page.getByRole('button', { name: 'Rename', exact: true }).click();
        await expect(tagRowByExactName(page, 'Field radio supplies')).toBeVisible();

        row = tagRowByExactName(page, 'Field radio supplies');
        await row.getByRole('button', { name: 'Actions for Field radio supplies' }).click();
        menu = page.getByRole('menu', { name: 'Actions for Field radio supplies' });
        await menu.getByRole('menuitem').filter({ hasText: 'Delete' }).click();
        await expect(page.getByRole('heading', { name: 'Delete Tag' })).toBeVisible();
        await expect(row).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(row).toBeVisible();

        await row.getByRole('button', { name: 'Actions for Field radio supplies' }).click();
        menu = page.getByRole('menu', { name: 'Actions for Field radio supplies' });
        await menu.getByRole('menuitem').filter({ hasText: 'Delete' }).click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        await expect(tagRowByExactName(page, 'Field radio supplies')).toHaveCount(0);
    });
});
