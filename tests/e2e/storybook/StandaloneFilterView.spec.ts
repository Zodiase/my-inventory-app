import { expect, test } from '@playwright/test';

const story = (state: string): string => `/iframe.html?id=prototypes-standalone-filter-view--${state}&viewMode=story`;

test('filter button opens an independent panel and choices update results', async ({ page }, testInfo) => {
    await page.goto(story('closed'));
    const results = page.getByRole('region', { name: 'Results' });
    const trigger = page.getByRole('button', { name: 'Filters' });
    await expect(results.getByRole('listitem')).toHaveCount(8);
    await expect(page.getByRole('dialog', { name: 'Filter results' })).toHaveCount(0);
    await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Filter results' });
    await expect(panel).toBeVisible();
    await expect(results.locator('.standalone-filter-panel')).toHaveCount(0);
    await expect(panel.getByRole('switch', { name: 'Show selected only (0)' })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('standalone-filter-desktop.png'), fullPage: true });

    await panel
        .getByRole('radiogroup', { name: 'Filter Needs sorting' })
        .getByRole('radio', { name: 'Include Needs sorting' })
        .click();
    await expect(results.getByRole('listitem')).toHaveCount(2);
    await expect(results.getByText('Unsorted parts box')).toBeVisible();
    await expect(results.getByText('Sorting tray')).toBeVisible();

    await panel
        .getByRole('radiogroup', { name: 'Filter Hardware' })
        .getByRole('radio', { name: 'Exclude Hardware' })
        .click();
    await expect(results.getByRole('listitem')).toHaveCount(1);
    await expect(results.getByText('Sorting tray')).toBeVisible();
    await panel.getByRole('radio', { name: 'Containers', exact: true }).check();
    await expect(results.getByRole('listitem')).toHaveCount(0);
    await expect(results.getByText('No results match these filters.')).toBeVisible();

    await panel.getByRole('button', { name: 'Clear filters' }).click();
    await expect(results.getByRole('listitem')).toHaveCount(8);
    await expect(panel.getByRole('radio', { name: 'Any', exact: true })).toBeChecked();
    await expect(panel.getByRole('radiogroup', { name: 'Filter Needs sorting' })).toHaveAttribute(
        'data-state',
        'neutral'
    );
});

test('finding tags composes with selected-only without changing results', async ({ page }) => {
    await page.goto(story('active'));
    const panel = page.getByRole('dialog', { name: 'Filter results' });
    const catalog = panel.getByLabel('Tag catalog');
    await expect(page.getByRole('region', { name: 'Results' }).getByRole('listitem')).toHaveCount(1);
    const resultCount = await page.getByRole('region', { name: 'Results' }).getByRole('listitem').count();
    await panel.getByRole('switch', { name: 'Show selected only (2)' }).check();
    await expect(catalog.getByRole('radiogroup')).toHaveCount(2);
    await panel.getByRole('textbox', { name: 'Find a tag' }).fill('fragile');
    await expect(catalog.getByRole('radiogroup')).toHaveCount(1);
    expect(await page.getByRole('region', { name: 'Results' }).getByRole('listitem').count()).toBe(resultCount);
    await panel.getByRole('textbox', { name: 'Find a tag' }).fill('battery');
    await expect(catalog.getByText('No matching tags.')).toBeVisible();
    await panel.getByRole('switch', { name: 'Show selected only (2)' }).uncheck();
    await expect(catalog.getByRole('radiogroup', { name: 'Filter Battery' })).toBeVisible();
});

test('included tags use simple OR and the selected-only view retains focus when a row disappears', async ({ page }) => {
    await page.goto(story('open'));
    const panel = page.getByRole('dialog', { name: 'Filter results' });
    const results = page.getByRole('region', { name: 'Results' });
    await panel
        .getByRole('radiogroup', { name: 'Filter Needs sorting' })
        .getByRole('radio', { name: 'Include Needs sorting' })
        .click();
    await panel
        .getByRole('radiogroup', { name: 'Filter Fragile' })
        .getByRole('radio', { name: 'Include Fragile' })
        .click();
    await expect(results.getByRole('listitem')).toHaveCount(4);
    await panel.getByRole('switch', { name: 'Show selected only (2)' }).check();
    await expect(panel.getByLabel('Tag catalog').getByRole('radiogroup')).toHaveCount(2);
    await panel
        .getByRole('radiogroup', { name: 'Filter Fragile' })
        .getByRole('radio', { name: 'No filter for Fragile' })
        .click();
    await expect(panel.getByRole('radiogroup', { name: 'Filter Fragile' })).toHaveCount(0);
    await expect(panel.getByRole('switch', { name: 'Show selected only (1)' })).toBeFocused();
    await expect(results.getByRole('listitem')).toHaveCount(2);
});

test('clearing the last selected tag restores the catalog and a useful focus target', async ({ page }) => {
    await page.goto(story('open'));
    const panel = page.getByRole('dialog', { name: 'Filter results' });
    await panel
        .getByRole('radiogroup', { name: 'Filter Needs sorting' })
        .getByRole('radio', { name: 'Include Needs sorting' })
        .click();
    await panel.getByRole('switch', { name: 'Show selected only (1)' }).check();
    await expect(panel.getByLabel('Tag catalog').getByRole('radiogroup')).toHaveCount(1);
    await panel
        .getByRole('radiogroup', { name: 'Filter Needs sorting' })
        .getByRole('radio', { name: 'No filter for Needs sorting' })
        .click();
    await expect(panel.getByRole('switch', { name: 'Show selected only (0)' })).toBeDisabled();
    await expect(panel.getByRole('switch', { name: 'Show selected only (0)' })).not.toBeChecked();
    await expect(panel.getByLabel('Tag catalog').getByRole('radiogroup')).toHaveCount(9);
    await expect(panel.getByRole('textbox', { name: 'Find a tag' })).toBeFocused();
});

test('popover can close with Escape and stays within a narrow viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(story('open'));
    await expect(page.getByRole('dialog', { name: 'Filter results' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('standalone-filter-narrow.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Filter results' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused();
});

for (const width of [1280, 820, 390]) {
    test(`open filter view does not cover results at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(story('open'));
        const panel = await page.getByRole('dialog', { name: 'Filter results' }).boundingBox();
        const results = await page.getByRole('region', { name: 'Results' }).boundingBox();
        expect(panel).not.toBeNull();
        expect(results).not.toBeNull();
        if (width > 740) expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThan(results?.x ?? 0);
        else expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThan(results?.y ?? 0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
}

test('Storybook manager preview stays mounted while changing a filter', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-standalone-filter-view--closed');
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByRole('region', { name: 'Results' }).getByRole('listitem')).toHaveCount(8);
    await preview.getByRole('button', { name: 'Filters' }).click();
    await preview
        .getByRole('dialog', { name: 'Filter results' })
        .getByRole('radiogroup', { name: 'Filter Needs sorting' })
        .getByRole('radio', { name: 'Include Needs sorting' })
        .click();
    await expect(preview.getByRole('region', { name: 'Results' }).getByRole('listitem')).toHaveCount(2);
    await expect(preview.getByRole('button', { name: 'Filters · 1' })).toHaveAttribute('aria-expanded', 'true');
});
