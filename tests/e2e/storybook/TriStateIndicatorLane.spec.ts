/** Isolated Storybook checks for the separate-lane tri-state visual alternative. */
import { expect, test } from '@playwright/test';

const story = (state: string): string => `/iframe.html?id=prototypes-tri-state-indicator-lane--${state}&viewMode=story`;
const mainRail = '.tri-lane-stage .tri-state-rail';
const indicatorBox = async (page: import('@playwright/test').Page): Promise<{ x: number; y: number }> =>
    page.locator(`${mainRail} .tri-state-handle`).evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y };
    });

for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 900 },
]) {
    for (const state of ['off', 'include', 'exclude']) {
        test(`${viewport.name} ${state} keeps labels separate from the indicator`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto(story(state));
            const rail = page.locator(mainRail);
            await expect(rail).toHaveAttribute('data-state', state === 'off' ? 'neutral' : state);
            await expect(rail.locator('.tri-state-handle')).toHaveText('');
            await expect(rail.locator('.tri-state-position > span')).toHaveText(['Include', 'Off', 'Exclude']);
            const compactRail = page.getByLabel('Compact tag rows').locator('.tri-state-rail').first();
            const compactDimensions = await compactRail.evaluate((element) => ({
                hitHeight: element.getBoundingClientRect().height,
                visualHeight: Number.parseFloat(getComputedStyle(element, '::before').height),
            }));
            expect(compactDimensions.hitHeight).toBe(44);
            expect(compactDimensions.visualHeight).toBeLessThanOrEqual(36);
            const geometry = await rail.evaluate((element) => {
                const handle = element.querySelector('.tri-state-handle')?.getBoundingClientRect();
                const label = element.querySelector('.tri-state-position > span')?.getBoundingClientRect();
                return { handleTop: handle?.top ?? 0, labelBottom: label?.bottom ?? 0 };
            });
            expect(geometry.handleTop).toBeGreaterThan(geometry.labelBottom + 8);
            await expect(page.getByLabel('Compact tag rows').locator('.tri-lane-compact-row')).toHaveCount(6);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${state}-${viewport.name}.png`), fullPage: true });
        });
    }
}

test('indicator moves horizontally only, including direct end-to-end travel', async ({ page }) => {
    await page.goto(story('include'));
    const start = await indicatorBox(page);
    await page.getByRole('button', { name: 'Move to Exclude' }).click();
    const early = await indicatorBox(page);
    await page.waitForTimeout(100);
    const middle = await indicatorBox(page);
    await page.waitForTimeout(220);
    const end = await indicatorBox(page);
    expect(early.x).toBeLessThan(middle.x);
    expect(middle.x).toBeLessThan(end.x);
    expect(end.x).toBeGreaterThan(start.x + 100);
    expect(Math.abs(end.y - start.y)).toBeLessThanOrEqual(1);
    await expect(page.locator(`${mainRail} .tri-state-position > span`)).toHaveText(['Include', 'Off', 'Exclude']);
});

test('neutral compact indicators are quieter than selected while retaining direct input', async ({ page }) => {
    await page.goto(story('include'));
    const rows = page.getByLabel('Compact tag rows');
    const selected = rows.getByRole('radiogroup', { name: 'Filter Needs sorting' });
    const neutral = rows.getByRole('radiogroup', { name: 'Filter Needs repair' });
    const selectedOpacity = await selected
        .locator('.tri-state-handle')
        .evaluate((element) => +getComputedStyle(element).opacity);
    const neutralOpacity = await neutral
        .locator('.tri-state-handle')
        .evaluate((element) => +getComputedStyle(element).opacity);
    expect(neutralOpacity).toBeLessThan(selectedOpacity);
    await neutral.getByRole('radio', { name: 'Exclude Needs repair' }).click();
    await expect(neutral).toHaveAttribute('data-state', 'exclude');
    await neutral.getByRole('radio', { name: 'No filter for Needs repair' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(neutral.getByRole('radio', { name: 'Include Needs repair' })).toBeChecked();
});

test('reduced motion disables travel and RTL mirrors the indicator', async ({ page }) => {
    await page.goto(story('off'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await page
        .locator(`${mainRail} .tri-state-handle`)
        .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(duration).toBe('0s');
    await page.getByTestId('tri-state-lane-proof').evaluate((element) => element.setAttribute('dir', 'rtl'));
    await page.getByRole('button', { name: 'Move to Include' }).click();
    const include = await indicatorBox(page);
    await page.getByRole('button', { name: 'Move to Exclude' }).click();
    const exclude = await indicatorBox(page);
    expect(include.x).toBeGreaterThan(exclude.x + 100);
});

test('manager opens the comparison story without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-tri-state-indicator-lane--off');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('radiogroup', { name: 'Filter Example tag' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
