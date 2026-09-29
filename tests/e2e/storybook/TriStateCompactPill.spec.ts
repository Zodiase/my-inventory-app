/** Browser geometry and behavior checks for the actual-size tri-state pill mock. */
import { expect, test } from '@playwright/test';

const story = (state: string): string => `/iframe.html?id=prototypes-tri-state-compact-pill--${state}&viewMode=story`;
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
        test(`${viewport.name} ${state} keeps every pill compact with an overlaid thumb`, async ({
            page,
        }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto(story(state));
            const rail = page.locator(mainRail);
            await expect(rail).toHaveAttribute('data-state', state === 'off' ? 'neutral' : state);
            await expect(rail.locator('.tri-state-handle')).toHaveText('');
            await expect(rail.locator('.tri-state-position > span')).toHaveText(['Include', 'Off', 'Exclude']);
            const rows = page.getByLabel('Compact tag rows').locator('.tri-lane-compact-row');
            await expect(rows).toHaveCount(6);
            const geometry = await page
                .locator(`${mainRail}, .tri-lane-compact-row .tri-state-rail`)
                .evaluateAll((elements) =>
                    elements.map((element) => {
                        const pill = element.getBoundingClientRect();
                        const thumb = element.querySelector('.tri-state-handle')?.getBoundingClientRect();
                        const choices = [...element.querySelectorAll('.tri-state-position')].map((choice) => {
                            const hit = choice.getBoundingClientRect();
                            const wordElement = choice.querySelector('span');
                            const word = wordElement?.getBoundingClientRect();
                            return {
                                hitWidth: hit.width,
                                hitHeight: hit.height,
                                wordFontSize: wordElement
                                    ? Number.parseFloat(getComputedStyle(wordElement).fontSize)
                                    : 0,
                                wordCenterY: word ? word.y + word.height / 2 : 0,
                                word: word
                                    ? { left: word.left, right: word.right, top: word.top, bottom: word.bottom }
                                    : null,
                            };
                        });
                        const rowElement = element.closest('.tri-lane-compact-row, .tri-lane-stage');
                        const row = rowElement?.getBoundingClientRect();
                        const rowLabel = rowElement
                            ?.querySelector(':scope > span:first-child')
                            ?.getBoundingClientRect();
                        return {
                            width: pill.width,
                            height: pill.height,
                            centerY: pill.y + pill.height / 2,
                            rowHeight: row?.height,
                            rowWidth: row?.width,
                            rowCenterY: row ? row.y + row.height / 2 : null,
                            rowLabelGap: rowLabel ? pill.left - rowLabel.right : null,
                            thumb: thumb
                                ? {
                                      left: thumb.left,
                                      right: thumb.right,
                                      top: thumb.top,
                                      bottom: thumb.bottom,
                                      width: thumb.width,
                                      height: thumb.height,
                                  }
                                : null,
                            choices,
                            state: element.getAttribute('data-state'),
                        };
                    })
                );
            expect(geometry).toHaveLength(7);
            for (const pill of geometry) {
                expect(pill.width).toBeGreaterThanOrEqual(156);
                expect(pill.width).toBeLessThanOrEqual(168);
                expect(pill.height).toBeGreaterThanOrEqual(28);
                expect(pill.height).toBeLessThanOrEqual(30);
                expect(Math.abs((pill.thumb?.width ?? 0) - pill.width / 3)).toBeLessThanOrEqual(4);
                expect(pill.thumb?.height).toBeGreaterThanOrEqual(22);
                expect(pill.thumb?.height).toBeLessThanOrEqual(26);
                for (const choice of pill.choices) {
                    expect(choice.hitWidth).toBeGreaterThanOrEqual(44);
                    expect(choice.hitHeight).toBeGreaterThanOrEqual(44);
                    expect(choice.wordFontSize).toBeGreaterThanOrEqual(11);
                    expect(Math.abs(choice.wordCenterY - pill.centerY)).toBeLessThanOrEqual(2);
                }
                const activeIndex = pill.state === 'include' ? 0 : pill.state === 'exclude' ? 2 : 1;
                const word = pill.choices[activeIndex]?.word;
                expect(word).not.toBeNull();
                expect(pill.thumb?.left).toBeLessThan(word?.right ?? 0);
                expect(pill.thumb?.right).toBeGreaterThan(word?.left ?? 0);
                expect(pill.thumb?.top).toBeLessThan(word?.bottom ?? 0);
                expect(pill.thumb?.bottom).toBeGreaterThan(word?.top ?? 0);
                if (pill.rowHeight !== undefined && pill.rowCenterY !== null) {
                    expect(pill.rowHeight).toBeGreaterThanOrEqual(48);
                    expect(pill.rowHeight).toBeLessThanOrEqual(52);
                    expect(pill.height / pill.rowHeight).toBeLessThanOrEqual(30 / 48);
                    expect(pill.width / (pill.rowWidth ?? 1)).toBeLessThan(0.5);
                    expect(Math.abs(pill.centerY - pill.rowCenterY)).toBeLessThanOrEqual(2);
                    expect(pill.rowLabelGap).toBeGreaterThanOrEqual(12);
                }
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: testInfo.outputPath(`${state}-${viewport.name}.png`), fullPage: true });
            await page
                .getByLabel('Compact tag rows')
                .screenshot({ path: testInfo.outputPath(`${state}-rows-${viewport.name}.png`) });
        });
    }
}

test('indicator moves horizontally only, including direct end-to-end travel', async ({ page }) => {
    await page.goto(story('include'));
    const start = await indicatorBox(page);
    await page
        .getByRole('radiogroup', { name: 'Filter Example tag' })
        .getByRole('radio', { name: 'Exclude Example tag' })
        .click();
    const early = await indicatorBox(page);
    await page.waitForTimeout(100);
    const middle = await indicatorBox(page);
    await page.waitForTimeout(220);
    const end = await indicatorBox(page);
    expect(early.x).toBeLessThan(middle.x);
    expect(middle.x).toBeLessThan(end.x);
    expect(end.x).toBeGreaterThan(start.x + 95);
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
    await page
        .getByRole('radiogroup', { name: 'Filter Example tag' })
        .getByRole('radio', { name: 'Include Example tag' })
        .click();
    const include = await indicatorBox(page);
    await page
        .getByRole('radiogroup', { name: 'Filter Example tag' })
        .getByRole('radio', { name: 'Exclude Example tag' })
        .click();
    const exclude = await indicatorBox(page);
    expect(include.x).toBeGreaterThan(exclude.x + 95);
});

test('narrow story keeps the six-row list and pill reachable without horizontal overflow', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(story('off'));
    await expect(page.getByLabel('Compact tag rows').locator('.tri-lane-compact-row')).toHaveCount(6);
    await expect(page.getByRole('radiogroup', { name: 'Filter Hardware' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('off-narrow.png'), fullPage: true });
});

test('all three positions remain directly tappable at iPad width', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 820, height: 900 },
        hasTouch: true,
        baseURL: process.env.STORYBOOK_BASE_URL ?? 'http://localhost:6006',
    });
    try {
        const page = await context.newPage();
        await page.goto(story('off'));
        const rail = page.getByRole('radiogroup', { name: 'Filter Needs sorting' });
        await rail.getByRole('radio', { name: 'Include Needs sorting' }).tap();
        await expect(rail).toHaveAttribute('data-state', 'include');
        await rail.getByRole('radio', { name: 'Exclude Needs sorting' }).tap();
        await expect(rail).toHaveAttribute('data-state', 'exclude');
        await rail.getByRole('radio', { name: 'No filter for Needs sorting' }).tap();
        await expect(rail).toHaveAttribute('data-state', 'neutral');
    } finally {
        await context.close();
    }
});

test('manager opens the comparison story without an error overlay', async ({ page }) => {
    await page.goto('/?path=/story/prototypes-tri-state-compact-pill--off');
    await expect(
        page.frameLocator('#storybook-preview-iframe').getByRole('radiogroup', { name: 'Filter Example tag' })
    ).toBeVisible();
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
