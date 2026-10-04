/** Browser checks for the mock three-state tag picker and its review states. */
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
    'selected-search',
    'selected-empty',
    'path-search',
    'type-open',
];
const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 1100 },
];

for (const viewport of viewports) {
    test(`${viewport.name} renders every review state with a dominant catalog`, async ({ page }, testInfo) => {
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
                        bottom: panelBox.bottom,
                        catalogRatio: (catalogBox?.height ?? 0) / panelBox.height,
                    };
                });
                expect(geometry.left).toBeGreaterThanOrEqual(0);
                expect(geometry.right).toBeLessThanOrEqual(viewport.width);
                expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
                expect(geometry.catalogRatio).toBeGreaterThanOrEqual(0.7);
                await expect(catalog).toBeVisible();
                await expect(page.getByRole('switch', { name: /Show selected only/u })).toBeVisible();
                await expect(page.getByRole('button', { name: /More options for/u })).toHaveCount(0);
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${state}-${viewport.name}.png`), fullPage: true });
        }
        expect(errors).toEqual([]);
    });
}

test('selects two tags directly with OR semantics and leaves the panel open', async ({ page }) => {
    await page.goto(story('browse'));
    await page.getByRole('radio', { name: 'Include Needs sorting' }).click();
    await expect(page.getByText('3 mock results')).toBeVisible();
    await page.getByRole('radio', { name: 'Include Needs location detail' }).click();
    await expect(page.getByText('4 mock results')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Include Needs location detail' })).toBeChecked();
    await expect(page.getByLabel('Applied filters')).toContainText('or');
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toBeVisible();
});

test('moves one tag Include to Neutral to Exclude without changing other tags', async ({ page }) => {
    await page.goto(story('two-selected'));
    await page.getByRole('radio', { name: 'No filter for Needs sorting' }).click();
    await expect(page.getByRole('radio', { name: 'No filter for Needs sorting' })).toBeChecked();
    await expect(page.getByText('2 mock results')).toBeVisible();
    await page.getByRole('radio', { name: 'Exclude Needs sorting' }).click();
    await expect(page.getByRole('radio', { name: 'Exclude Needs sorting' })).toBeChecked();
    await expect(page.getByLabel('Applied filters')).toContainText('Not:');
    await expect(page.getByRole('radio', { name: 'Include Needs location detail' })).toBeChecked();
    await expect(page.getByText('1 mock results')).toBeVisible();
    await page.getByRole('radio', { name: 'Include Needs sorting' }).click();
    await expect(page.getByText('4 mock results')).toBeVisible();
});

test('changing a tag deep in the catalog preserves its scroll position', async ({ page }) => {
    await page.goto(story('browse'));
    await page.getByRole('button', { name: 'Hardware' }).click();
    const exclude = page.getByRole('radio', { name: 'Exclude Fastener 25' });
    await exclude.scrollIntoViewIfNeeded();
    const catalog = page.getByLabel('Tag catalog');
    const before = await catalog.evaluate((element) => element.scrollTop);
    await exclude.click();
    await expect(exclude).toBeChecked();
    const after = await catalog.evaluate((element) => element.scrollTop);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
});

test('selected-only view and text query filter the same hierarchy without clearing text', async ({ page }) => {
    await page.goto(story('excluded'));
    const toggle = page.getByRole('switch', { name: /Show selected only/u });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('textbox', { name: 'Find a tag' })).toHaveValue('fragile');
    await expect(page.locator('.direct-tag-row')).toHaveCount(1);
    await expect(page.getByRole('radio', { name: 'Exclude Fragile' })).toBeChecked();
    await page.getByRole('textbox', { name: 'Find a tag' }).fill('workflow');
    await expect(page.locator('.direct-tag-row')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Workflow' })).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('textbox', { name: 'Find a tag' })).toHaveValue('workflow');
    await expect(page.locator('.direct-tag-row')).toHaveCount(3);
    await toggle.click();
    await expect(page.locator('.direct-tag-row')).toHaveCount(2);
});

test('reviewing sixteen tags removes a row in place and moves focus to the next', async ({ page }) => {
    await page.goto(story('review-selected'));
    const toggle = page.getByRole('switch', { name: /Show selected only/u });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.direct-tag-row')).toHaveCount(16);
    await expect(page.getByRole('button', { name: 'Review selected' })).toBeVisible();
    await page.getByRole('radio', { name: 'No filter for Fastener 01' }).click();
    await expect(page.locator('.direct-tag-row')).toHaveCount(15);
    await expect(page.getByRole('radio', { name: 'Include Fastener 02' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Tags: 15 selected' })).toBeVisible();
});

test('selected-only empty state keeps the switch reachable and can clear the search', async ({ page }) => {
    await page.goto(story('selected-empty'));
    const toggle = page.getByRole('switch', { name: /Show selected only/u });
    await expect(page.getByText('No selected tags match.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear tag search' }).click();
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeVisible();
    await page.getByRole('radio', { name: 'No filter for Needs sorting' }).click();
    await expect(page.getByText('No selected tags.')).toBeVisible();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

test('finds a tag by name or parent path and leaves Type separately anchored', async ({ page }) => {
    await page.goto(story('path-search'));
    await expect(page.getByRole('radio', { name: 'Include Lens' })).toBeVisible();
    await expect(page.getByLabel('Tag catalog')).toContainText('Equipment / Camera');
    await page.getByRole('textbox', { name: 'Find a tag' }).fill('camera');
    await expect(page.getByRole('radio', { name: 'Include Battery' })).toBeVisible();
    await page.getByRole('radio', { name: 'Include Lens' }).click();
    await expect(page.getByText('1 mock results')).toBeVisible();
    await page.getByRole('button', { name: 'Type: Any' }).click();
    await expect(page.getByRole('dialog', { name: 'Type filter' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toHaveCount(0);
});

test('radio keyboard movement and Escape focus work', async ({ page }) => {
    await page.goto(story('browse'));
    await page.getByRole('radio', { name: 'No filter for Needs sorting' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'No filter for Needs sorting' })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Exclude Needs sorting' })).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Tag filters' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tags: 1 selected' })).toBeFocused();
});

test('logical Include and Exclude positions mirror in right-to-left layout', async ({ page }) => {
    await page.goto(story('browse'));
    const group = page.getByRole('radiogroup', { name: 'Filter Needs sorting' });
    const include = group.getByRole('radio', { name: 'Include Needs sorting' });
    const exclude = group.getByRole('radio', { name: 'Exclude Needs sorting' });
    const ltrInclude = await include.boundingBox();
    const ltrExclude = await exclude.boundingBox();
    expect(ltrInclude?.x).toBeLessThan(ltrExclude?.x ?? 0);
    await page.getByTestId('direct-selection-proof').evaluate((element) => {
        element.setAttribute('dir', 'rtl');
    });
    const rtlInclude = await include.boundingBox();
    const rtlExclude = await exclude.boundingBox();
    expect(rtlInclude?.x).toBeGreaterThan(rtlExclude?.x ?? 0);
});

test('three-state positions and selected-only switch are touch-operable at iPad width', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 820, height: 1100 },
        hasTouch: true,
        baseURL: process.env.STORYBOOK_BASE_URL ?? 'http://localhost:6006',
    });
    try {
        const page = await context.newPage();
        await page.goto(story('browse'));
        await page.getByRole('radio', { name: 'Include Needs sorting' }).tap();
        await expect(page.getByText('3 mock results')).toBeVisible();
        await page.getByRole('radio', { name: 'Exclude Needs sorting' }).tap();
        await expect(page.getByText('3 mock results')).toBeVisible();
        const toggle = page.getByRole('switch', { name: /Show selected only/u });
        await toggle.tap();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
    } finally {
        await context.close();
    }
});

test('Storybook manager opens the exact mock story without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-direct-selection-tag-picker--browse');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('dialog', { name: 'Tag filters' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
