/** Verify the mock-only task-based Search filter proof at desktop and iPad widths. */
import { expect, test } from '@playwright/test';

const story = (name: string): string => `/iframe.html?id=prototypes-task-based-search-filters--${name}&viewMode=story`;

const visualStories = [
    'open-tags-desktop',
    'open-tags-i-pad',
    'open-type-i-pad',
    'excluding-fragile',
    'match-all',
    'search-by-path',
];

for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 1100 },
]) {
    test(`visual review matrix at ${viewport.name} width`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        for (const name of visualStories) {
            await page.goto(story(name));
            await expect(page.getByTestId('search-filter-prototype')).toBeVisible();
            await expect(
                page.getByRole('dialog', { name: name === 'open-type-i-pad' ? 'Type filter' : 'Tag filters' })
            ).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
            await page.screenshot({ path: testInfo.outputPath(`${name}-${viewport.name}.png`) });
        }
    });
}

for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 1100 },
]) {
    test(`open Tags and Type stay anchored at ${viewport.name} width`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(story('open-tags-desktop'));
        const trigger = page.getByRole('button', { name: 'Tags: 0 selected' });
        const panel = page.getByRole('dialog', { name: 'Tag filters' });
        await expect(panel).toBeVisible();
        const button = await trigger.boundingBox();
        const box = await panel.boundingBox();
        expect(button).not.toBeNull();
        expect(box).not.toBeNull();
        expect(box!.width).toBeLessThanOrEqual(420);
        expect(box!.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.66, 520) + 2);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(Math.abs(box!.y - (button!.y + button!.height + 8))).toBeLessThanOrEqual(2);
        expect(box!.x).toBeGreaterThan(button!.x - box!.width);
        await page.screenshot({ path: testInfo.outputPath(`open-tags-${viewport.name}.png`) });
        await page.getByRole('button', { name: 'Type: Any' }).click();
        const typePanel = page.getByRole('dialog', { name: 'Type filter' });
        await expect(typePanel).toBeVisible();
        const typeButton = await page.getByRole('button', { name: 'Type: Any' }).boundingBox();
        const typeBox = await typePanel.boundingBox();
        expect(Math.abs(typeBox!.y - (typeButton!.y + typeButton!.height + 8))).toBeLessThanOrEqual(2);
        expect(typeBox!.x + typeBox!.width).toBeLessThanOrEqual(viewport.width);
        await page.screenshot({ path: testInfo.outputPath(`open-type-${viewport.name}.png`) });
        await page.keyboard.press('Escape');
        await expect(typePanel).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Type: Any' })).toBeFocused();
    });
}

test('either tag, both tags, and removing a sparse constraint', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 820, height: 1100 });
    await page.goto(story('open-tags-desktop'));
    const panel = page.getByRole('dialog', { name: 'Tag filters' });
    await panel.getByRole('checkbox', { name: 'Include Needs sorting' }).check();
    await panel.getByRole('checkbox', { name: 'Include Needs location detail' }).check();
    await expect(panel).toBeVisible();
    await expect(page.getByText('4 mock results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Has any', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Remove Has any: Needs sorting' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('selected-any-ipad.png') });
    await panel.getByRole('button', { name: 'Has all' }).click();
    await expect(page.getByText('1 mock results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Has all: Needs location detail' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('selected-all-ipad.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Remove Has all: Needs location detail' }).first().click();
    await expect(page.getByText('3 mock results')).toBeVisible();
});

test('exclude a tag without duplicating the catalog', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(story('open-tags-desktop'));
    const panel = page.getByRole('dialog', { name: 'Tag filters' });
    await panel.getByRole('button', { name: 'Exclude' }).click();
    await panel.getByRole('checkbox', { name: 'Exclude Fragile' }).check();
    await expect(page.getByRole('button', { name: 'Remove Does not have: Fragile' })).toBeVisible();
    await expect(page.getByText('5 mock results')).toBeVisible();
    await expect(panel.getByRole('checkbox', { name: 'Exclude Fragile' })).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('exclude-desktop.png') });
});

test('find by parent path, select many tags, and scroll only the catalog', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto(story('search-by-path'));
    const panel = page.getByRole('dialog', { name: 'Tag filters' });
    const search = panel.getByRole('textbox', { name: 'Find a tag' });
    await expect(search).toHaveValue('hardware');
    await expect(panel.getByRole('checkbox', { name: 'Include Fastener 01' })).toBeVisible();
    await expect(panel.getByText('Equipment / Hardware').first()).toBeVisible();
    const catalog = panel.getByLabel('Tag catalog');
    const before = await catalog.evaluate((element) => ({
        scroll: element.scrollTop,
        height: element.clientHeight,
        full: element.scrollHeight,
    }));
    expect(before.full).toBeGreaterThan(before.height);
    await catalog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    const after = await catalog.evaluate((element) => element.scrollTop);
    expect(after).toBeGreaterThan(0);
    await expect(search).toBeVisible();
    await panel.getByRole('checkbox', { name: 'Include Fastener 28' }).check();
    await expect(panel).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('path-search-ipad.png') });
    await panel.getByRole('button', { name: 'Clear tag search' }).click();
    await expect(search).toHaveValue('');
    await panel.getByRole('button', { name: 'Hardware' }).click();
    await expect(panel.getByRole('checkbox', { name: 'Include Fastener 01' })).toBeVisible();
});

test('compact applied summary expands and removes a named constraint', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1100 });
    await page.goto(story('excluding-fragile'));
    await page.getByRole('textbox', { name: 'Find a tag' }).focus();
    await page.keyboard.press('Escape');
    const summary = page.getByLabel('Applied filters');
    await expect(summary.getByRole('button', { name: 'Show all filters (3)' })).toBeVisible();
    await summary.getByRole('button', { name: 'Show all filters (3)' }).click();
    await summary.getByRole('button', { name: 'Remove Does not have: Fragile' }).click();
    await expect(summary.getByRole('button', { name: 'Remove Does not have: Fragile' })).toHaveCount(0);
});

test('Storybook manager loads the mock proof without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-task-based-search-filters--open-tags-desktop');
    await expect(page.locator('#storybook-preview-iframe')).toBeVisible();
    await expect(page.getByText('Unable to render the story')).toHaveCount(0);
});
