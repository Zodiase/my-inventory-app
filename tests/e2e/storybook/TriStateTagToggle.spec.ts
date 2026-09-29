/** Focused visual, motion, and input checks for the isolated tri-state Storybook proof. */
import { expect, test } from '@playwright/test';

const story = (state: string): string => `/iframe.html?id=prototypes-tri-state-tag-toggle--${state}&viewMode=story`;
const handleX = async (page: import('@playwright/test').Page): Promise<number> =>
    page.locator('.tri-state-handle').evaluate((element) => element.getBoundingClientRect().left);

for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 900 },
]) {
    for (const state of ['undecided', 'include', 'exclude']) {
        test(`${viewport.name} ${state} settles with one handle at its named position`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto(story(state));
            const rail = page.getByRole('radiogroup', { name: 'Filter Needs sorting' });
            await expect(rail).toHaveAttribute('data-state', state === 'undecided' ? 'neutral' : state);
            await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${state}-${viewport.name}.png`), fullPage: true });
        });
    }
}

test('one handle travels through the rail for direct end-to-end changes', async ({ page }, testInfo) => {
    await page.goto(story('undecided'));
    const center = await handleX(page);
    await page.getByRole('button', { name: 'Move to Include' }).click();
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeChecked();
    await page.waitForTimeout(300);
    const left = await handleX(page);
    expect(left).toBeLessThan(center - 35);

    await page.getByRole('button', { name: 'Move to Exclude' }).click();
    const early = await handleX(page);
    await page.waitForTimeout(100);
    const midway = await handleX(page);
    await page.screenshot({ path: testInfo.outputPath('travelling-include-to-exclude.png'), fullPage: true });
    await page.waitForTimeout(220);
    const right = await handleX(page);
    expect(early).toBeLessThan(midway);
    expect(midway).toBeLessThan(right);
    expect(right).toBeGreaterThan(center + 35);

    await page.getByRole('radio', { name: 'No filter for Needs sorting' }).click();
    await page.waitForTimeout(300);
    expect(await handleX(page)).toBeCloseTo(center, 0);
    await page.getByRole('radio', { name: 'Include Needs sorting' }).click();
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeChecked();
});

test('arrow keys change the same handle and reduced motion removes transition', async ({ page }) => {
    await page.goto(story('undecided'));
    await page.getByRole('radio', { name: 'No filter for Needs sorting' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'Include Needs sorting' })).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'No filter for Needs sorting' })).toBeChecked();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await page
        .locator('.tri-state-handle')
        .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(duration).toBe('0s');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Exclude Needs sorting' })).toBeChecked();
});

test('manager opens the dedicated interaction story', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-tri-state-tag-toggle--undecided');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('radiogroup', { name: 'Filter Needs sorting' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
