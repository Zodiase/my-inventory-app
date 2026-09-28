/** Interaction and rendered-state checks for the mock direct-selection tag picker. */
import { expect, test } from '@playwright/test';

const story = (name: string): string =>
    `/iframe.html?id=prototypes-direct-selection-tag-picker--${name}&viewMode=story`;

const states = [
    'browse',
    'one-selected',
    'two-selected',
    'excluded',
    'sixteen-selected',
    'review-selected',
    'path-search',
    'type-open',
];
const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 1100 },
];

for (const viewport of viewports) {
    test(`${viewport.name} renders every review state with the catalog dominant`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const state of states) {
            await page.goto(story(state));
            await expect(page.getByTestId('direct-selection-proof')).toBeVisible();
            await expect(page.getByText('mock results')).toBeVisible();
            if (state !== 'type-open') {
                const panel = page.getByRole('dialog', { name: 'Tag filters' });
                const catalog = page.getByLabel('Tag catalog');
                await expect(panel).toBeVisible();
                const geometry = await panel.evaluate((element) => {
                    const panelBox = element.getBoundingClientRect();
                    const catalogBox = element.querySelector('.direct-catalog')?.getBoundingClientRect();
                    return {
                        left: panelBox.left,
                        right: panelBox.right,
                        top: panelBox.top,
                        bottom: panelBox.bottom,
                        catalogRatio: (catalogBox?.height ?? 0) / panelBox.height,
                    };
                });
                expect(geometry.left).toBeGreaterThanOrEqual(0);
                expect(geometry.right).toBeLessThanOrEqual(viewport.width);
                expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
                expect(geometry.catalogRatio).toBeGreaterThanOrEqual(0.7);
                await expect(catalog).toBeVisible();
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${state}-${viewport.name}.png`), fullPage: true });
        }
        expect(errors).toEqual([]);
    });
}

test('direct selection keeps the panel open and adds another tag with OR semantics', async ({ page }) => {
    await page.goto(story('browse'));
    await page.getByRole('checkbox', { name: 'Include Needs sorting' }).check();
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toBeVisible();
    await expect(page.getByText('3 mock results')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Include Needs location detail' }).check();
    await expect(page.getByText('4 mock results')).toBeVisible();
    await expect(page.getByLabel('Applied filters')).toContainText('Tags:');
    await expect(page.getByLabel('Applied filters')).toContainText('or');
    await expect(page.getByRole('button', { name: 'Remove included Needs sorting' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove included Needs location detail' })).toBeVisible();
});

test('per-row options exclude, include, and remove one tag without losing catalog position', async ({ page }) => {
    await page.goto(story('two-selected'));
    const catalog = page.getByLabel('Tag catalog');
    const more = page.getByRole('button', { name: 'More options for Fragile' });
    await more.click();
    const before = await catalog.evaluate((element) => element.scrollTop);
    await page.getByRole('menuitem', { name: 'Exclude this tag' }).click();
    await expect(page.getByRole('button', { name: 'Tags: 3 selected' })).toBeVisible();
    await expect(page.getByText('3 mock results')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toBeVisible();
    expect(await catalog.evaluate((element) => element.scrollTop)).toBe(before);
    await more.click();
    await page.getByRole('menuitem', { name: 'Include this tag' }).click();
    await expect(page.getByText('4 mock results')).toBeVisible();
    await more.click();
    await page.getByRole('menuitem', { name: 'Remove filter' }).click();
    await expect(page.getByRole('button', { name: 'Tags: 2 selected' })).toBeVisible();
});

test('review sixteen selections in the catalog and remove one in place', async ({ page }) => {
    await page.goto(story('sixteen-selected'));
    await page.getByRole('button', { name: 'Selected (16)' }).click();
    await expect(page.locator('.direct-tag-row')).toHaveCount(16);
    await expect(page.getByRole('button', { name: 'Review selected' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Include Fastener 01' }).click();
    await expect(page.locator('.direct-tag-row')).toHaveCount(15);
    await expect(page.getByRole('button', { name: 'Tags: 15 selected' })).toBeVisible();
    await page.getByRole('button', { name: 'Browse' }).click();
    await expect(page.getByRole('button', { name: 'Equipment' })).toBeVisible();
});

test('finds a tag by name or parent path and leaves Type anchored separately', async ({ page }) => {
    await page.goto(story('path-search'));
    await expect(page.getByRole('checkbox', { name: 'Include Lens' })).toBeVisible();
    await expect(page.getByLabel('Tag catalog')).toContainText('Equipment / Camera');
    await page.getByRole('textbox', { name: 'Find a tag' }).fill('camera');
    await expect(page.getByRole('checkbox', { name: 'Include Battery' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Include Lens' }).check();
    await expect(page.getByText('1 mock results')).toBeVisible();
    await page.getByRole('button', { name: 'Type: Any' }).click();
    await expect(page.getByRole('dialog', { name: 'Type filter' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toHaveCount(0);
});

test('Escape closes row options then Tags and returns focus to the trigger', async ({ page }) => {
    await page.goto(story('browse'));
    const more = page.getByRole('button', { name: 'More options for Needs sorting' });
    await more.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(more).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tags: 0 selected' })).toBeFocused();
});

test('Storybook manager opens the exact mock story without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-direct-selection-tag-picker--browse');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('dialog', { name: 'Tag filters' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
