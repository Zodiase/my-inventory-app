import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import jsQR from 'jsqr';
import { scaleScannerProof } from '../helpers/scanner-proof-text-scale';
const requireApp = createRequire(path.resolve(__dirname, '../../../meteor-app/package.json'));
const sharp = requireApp('sharp') as typeof import('../../../meteor-app/node_modules/sharp');
const manager = process.env.SCANNER_STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const expected = [
    'inventory-action:v1:inspect-demo',
    'inventory-action:v1:show-actions',
    'item: 11111111-1111-4111-8111-111111111111',
    'container: 33333333-3333-4333-8333-333333333333',
    '00012345678905',
];
async function open(page: import('@playwright/test').Page) {
    await page.goto(`${manager}/?path=/story/scanner-foundation--action-codes`);
    const frame = page.frameLocator('#storybook-preview-iframe');
    await expect(frame.getByRole('heading', { name: 'Scanner workspace', exact: true })).toBeVisible();
    const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true });
    if (await hide.isVisible()) await hide.click();
    const dismiss = page.getByRole('button', { name: 'Dismiss notification', exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    return frame;
}
async function scan(page: import('@playwright/test').Page, payload: string) {
    await page.keyboard.type(payload);
    await page.keyboard.press('Enter');
}
test('action QR payloads and taps share semantics; command then fixture continues without Resume', async ({ page }) => {
    const f = await open(page);
    await expect(f.getByRole('combobox', { name: 'Resolver fault' })).not.toBeVisible();
    await expect(f.getByTestId('capture-state')).toHaveText('Off');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, expected[1]);
    await expect(f.getByTestId('capture-state')).toHaveText('Ready');
    await expect(f.getByRole('textbox', { name: 'Scanner input', exact: true })).toBeFocused();
    await scan(page, expected[4]);
    await expect(f.getByTestId('last-outcome').first()).toContainText('Read-only demo result');
    await f.getByRole('button', { name: 'Inspect', exact: true }).click();
    await expect(f.getByTestId('mode')).toHaveText('Mode: Inspect');
    await expect(f.getByTestId('capture-state')).toHaveText('Paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, expected[2]);
    await expect(f.getByTestId('last-outcome').first()).toContainText('Read-only demo result');
    await f.getByText('Developer diagnostics', { exact: true }).click();
    await expect(f.getByTestId('action-history')).toContainText('scan');
    await expect(f.getByTestId('action-history')).toContainText('tap');
});
test('partial interruption and dialogs still need explicit Resume and discarded recovery boundary', async ({
    page,
}) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.type('partial');
    await page.keyboard.press('Tab');
    await expect(f.getByTestId('capture-state')).toHaveText('Paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(f.getByTestId('capture-state')).toHaveText('Recovering');
    await scan(page, expected[1]);
    await expect(f.getByTestId('mode')).toHaveText('Mode: Inspect');
    await expect(f.getByTestId('last-outcome').first()).toContainText('boundary cleared');
    await scan(page, expected[3]);
    await expect(f.getByTestId('last-outcome').first()).toContainText('Read-only demo result');
    await f.getByText('Developer diagnostics', { exact: true }).click();
    await f.getByRole('button', { name: 'Open dialog', exact: true }).click();
    await f.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(f.getByTestId('capture-state')).toHaveText('Paused');
});
for (const [width, height] of [
    [1280, 720],
    [820, 900],
    [390, 844],
    [390, 480],
])
    for (const scale of [1, 1.25])
        test(`actual rendered QR decode, quiet geometry and usable controls ${width}x${height} text${scale}`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height });
            const f = await open(page);
            const fonts = await scaleScannerProof(f, scale);
            for (const font of fonts) expect(font.after).toBeCloseTo(font.before * scale, 1);
            const images = f.locator('img');
            await expect(images).toHaveCount(5);
            for (let i = 0; i < 5; i++) {
                const img = images.nth(i);
                await img.scrollIntoViewIfNeeded();
                const box = await img.boundingBox();
                expect(box?.width).toBe(224);
                expect(box?.height).toBe(224);
                const content = await f.getByTestId('workspace-scroll').boundingBox();
                expect(content!.height).toBeGreaterThanOrEqual(224);
                expect(box!.y).toBeGreaterThanOrEqual(content!.y - 1);
                expect(box!.y + box!.height).toBeLessThanOrEqual(content!.y + content!.height + 1);
                const { data, info } = await sharp(await img.screenshot())
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });
                expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(expected[i]);
                const svg = decodeURIComponent((await img.getAttribute('src')) ?? '');
                const side = Number(svg.match(/viewBox="0 0 (\d+) \d+"/)?.[1]);
                expect(side).toBeGreaterThan(64);
                const quietPixels = Math.floor((info.width * 32) / side) - 2;
                // Element screenshots round fractional page coordinates at the outer pixel.
                // Check the interior of the four-module quiet zone strictly, on all sides.
                let nonwhiteQuietPixels = 0;
                for (let y = 2; y < info.height - 2; y++)
                    for (let x = 2; x < info.width - 2; x++) {
                        if (
                            x >= quietPixels &&
                            y >= quietPixels &&
                            x < info.width - quietPixels &&
                            y < info.height - quietPixels
                        )
                            continue;
                        if (
                            data
                                .subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)
                                .some((channel) => channel !== 255)
                        )
                            nonwhiteQuietPixels++;
                    }
                expect(nonwhiteQuietPixels).toBe(0);
            }
            for (const button of await f.getByRole('button').all())
                if (await button.isVisible()) {
                    await button.scrollIntoViewIfNeeded();
                    const box = await button.boundingBox();
                    expect(box?.height).toBeGreaterThanOrEqual(44);
                }
            expect(
                await f
                    .locator('main')
                    .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
            ).toBe(false);
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await scan(page, expected[1]);
            await scan(page, expected[4]);
            await expect(f.getByTestId('capture-state')).toHaveText('Ready');
            await expect(f.getByTestId('last-outcome').first()).toContainText('Read-only demo result');
            await f.getByRole('button', { name: 'Exit', exact: true }).click();
            await expect(f.getByTestId('capture-state')).toHaveText('Off');
        });

test('mobile capture opts out of text transformation and explains uppercase rejection without normalization', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const f = await open(page);
    const input = f.getByRole('textbox', { name: 'Scanner input', exact: true });
    await expect(input).toHaveAttribute('autocapitalize', 'none');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await expect(input).toHaveAttribute('spellcheck', 'false');
    await expect(input).toHaveAttribute('autocomplete', 'off');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, 'Inventory-action:v1:show-actions');
    await expect(f.getByTestId('mode')).toHaveText('Mode: Inspect');
    await expect(f.getByTestId('dock-feedback')).toContainText('capitalization differs');
    await expect(f.getByTestId('dock-feedback')).toContainText(expected[1]);
    await f.getByText('Developer diagnostics', { exact: true }).click();
    await expect(f.getByTestId('raw-capture')).toContainText('Inventory-action:v1:show-actions');
    await expect(f.getByTestId('action-history')).not.toContainText('show-actions');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, expected[1]);
    await expect(f.getByTestId('mode')).toHaveText('Mode: Show actions');
});

test('fixed capture field keeps code browsing stable during keystrokes and never steals editing focus', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 480 });
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    const image = f.locator('[data-testid="action-card"] img').last();
    await image.scrollIntoViewIfNeeded();
    const imagePosition = await f.locator('[data-testid="action-card"] img').last().boundingBox();
    const input = f.getByRole('textbox', { name: 'Scanner input', exact: true });
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(480);
    await page.keyboard.type(expected[1], { delay: 5 });
    expect((await f.locator('[data-testid="action-card"] img').last().boundingBox())!.y).toBeCloseTo(
        imagePosition!.y,
        0
    );
    await page.keyboard.press('Enter');
    await expect(input).toBeFocused();
    expect((await f.locator('[data-testid="action-card"] img').last().boundingBox())!.y).toBeCloseTo(
        imagePosition!.y,
        0
    );
    await f.getByText('Developer diagnostics', { exact: true }).click();
    const editor = f.getByRole('textbox', { name: 'Ordinary editing field', exact: true });
    await editor.fill('ordinary edit');
    await expect(editor).toBeFocused();
    await expect(f.getByTestId('capture-state')).toHaveText('Paused');
    await expect(input).not.toBeFocused();
});

test('raw rejected text is escaped and timeout recovery reason stays visible', async ({ page }) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.type('<img src=x onerror=alert(1)>');
    await expect(f.getByTestId('capture-state')).toHaveText('Paused', { timeout: 5000 });
    await expect(f.getByTestId('dock-feedback')).toContainText('Incomplete read timed out');
    await expect(f.getByTestId('dock-feedback')).toContainText('Resume');
    await f.getByText('Developer diagnostics', { exact: true }).click();
    await expect(f.getByTestId('raw-capture')).toContainText('<img src=x onerror=alert(1)>');
    await expect(f.getByTestId('raw-capture').locator('img')).toHaveCount(0);
});

for (const scale of [1, 1.25])
    test(`standalone short-phone viewport keeps dock anchored and complete QR visible text${scale}`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 480 });
        await page.goto(`${manager}/iframe.html?id=scanner-foundation--action-codes&viewMode=story`);
        await expect(page.getByRole('heading', { name: 'Scanner workspace', exact: true })).toBeVisible();
        // The scaling helper accepts the same locator operations as this standalone page.
        await scaleScannerProof(page, scale);
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        const image = page.locator('[data-testid="action-card"] img').last();
        await image.scrollIntoViewIfNeeded();
        const before = await image.boundingBox();
        const content = await page.getByTestId('workspace-scroll').boundingBox();
        const dock = page.getByRole('complementary', { name: 'Scanner capture dock' });
        const dockBefore = await dock.boundingBox();
        expect(dockBefore!.y + dockBefore!.height).toBeCloseTo(480, 0);
        expect(before!.y).toBeGreaterThanOrEqual(content!.y - 1);
        expect(before!.y + before!.height).toBeLessThanOrEqual(content!.y + content!.height + 1);
        await scan(page, expected[1]);
        await scan(page, expected[2]);
        await expect(page.getByRole('textbox', { name: 'Scanner input', exact: true })).toBeFocused();
        expect((await image.boundingBox())!.y).toBeCloseTo(before!.y, 0);
        expect((await dock.boundingBox())!.y).toBeCloseTo(dockBefore!.y, 0);
        await page.evaluate(() => window.scrollTo(0, 1000));
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        expect((await dock.boundingBox())!.y).toBeCloseTo(dockBefore!.y, 0);
    });
