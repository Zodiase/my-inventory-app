import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import jsQR from 'jsqr';
import { scaleScannerProof } from '../helpers/scanner-proof-text-scale';
const requireApp = createRequire(path.resolve(__dirname, '../../../meteor-app/package.json'));
const sharp = requireApp('sharp') as typeof import('../../../meteor-app/node_modules/sharp');
const manager = process.env.SCANNER_STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const item = 'item: 11111111-1111-4111-8111-111111111111';
const dest = 'container: 33333333-3333-4333-8333-333333333333';
const other = 'container: 44444444-4444-4444-8444-444444444444';
async function open(page: Page) {
    await page.goto(`${manager}/?path=/story/scanner-move-simulation--interactive`);
    const f = page.frameLocator('#storybook-preview-iframe');
    await expect(f.getByRole('heading', { name: 'Scanner simulation', exact: true })).toBeVisible();
    const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true });
    if (await hide.isVisible()) await hide.click();
    return f;
}
async function scan(page: Page, code: string) {
    await page.keyboard.type(code);
    await page.keyboard.press('Enter');
}
test('destination-first moves, visible duplicate no-op and product rejection with raw zeros', async ({ page }) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, 'inventory-action:v1:move-demo');
    await scan(page, item);
    await expect(f.getByTestId('dock-feedback')).toContainText('container first');
    await scan(page, dest);
    await scan(page, item);
    await expect(f.getByTestId('move-count')).toHaveText('Simulated moves: 1');
    await scan(page, item);
    await expect(f.getByTestId('dock-feedback')).toContainText('No-op');
    await scan(page, '00012345678905');
    await expect(f.getByTestId('dock-feedback')).toContainText('product codes cannot move');
    await expect(f.getByTestId('destination')).toContainText('Demo shelf A');
    await expect(f.getByRole('textbox', { name: 'Scanner capture input' })).toBeFocused();
});
test('delayed item is cancelled by new destination and Pause; manual editing remains ordinary', async ({ page }) => {
    const f = await open(page);
    await f.getByText('Developer diagnostics', { exact: true }).click();
    await f.getByRole('combobox', { name: 'Next lookup behavior' }).selectOption('slow');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, 'inventory-action:v1:move-demo');
    await scan(page, dest);
    await scan(page, item);
    await scan(page, other);
    await expect(f.getByTestId('destination')).toContainText('Demo shelf B');
    await page.waitForTimeout(2700);
    await expect(f.getByTestId('move-count')).toHaveText('Simulated moves: 0');
    await scan(page, item);
    await f.getByRole('textbox', { name: 'Manual note' }).fill('ordinary text');
    await expect(f.getByTestId('capture-state')).toHaveText('Paused');
    await page.waitForTimeout(2700);
    await expect(f.getByTestId('move-count')).toHaveText('Simulated moves: 0');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(f.getByTestId('destination')).toContainText('Demo shelf B');
    await scan(page, 'inventory-action:v1:exit');
    await expect(f.getByTestId('destination')).toContainText('None selected');
    await expect(f.getByTestId('capture-state')).toHaveText('Off');
});
for (const [w, h] of [
    [1280, 720],
    [820, 900],
    [390, 844],
    [390, 480],
])
    for (const scale of [1, 1.25]) {
        test(`viewport dock and every QR pixels ${w}x${h} text ${scale}`, async ({ page }) => {
            await page.setViewportSize({ width: w, height: h });
            const f = await open(page);
            await scaleScannerProof(f, scale);
            await f.getByText('Show action QR codes', { exact: true }).click();
            const images = f.locator('img[data-payload]');
            const count = await images.count();
            expect(count).toBe(8);
            for (let i = 0; i < count; i++) {
                const image = images.nth(i);
                await image.scrollIntoViewIfNeeded();
                const bounds = await image.boundingBox();
                const dock = await f.getByRole('complementary', { name: 'Scanner capture dock' }).boundingBox();
                expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(dock!.y + 1);
                const { data, info } = await sharp(await image.screenshot())
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });
                const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
                expect(qr?.data).toBe(await image.getAttribute('data-payload'));
                for (const index of [0, (info.width - 1) * 4, (info.height - 1) * info.width * 4])
                    expect(Array.from(data.subarray(index, index + 3))).toEqual([255, 255, 255]);
            }
            const overflow = await f.locator('html').evaluate((el) => el.scrollWidth > el.clientWidth);
            expect(overflow).toBe(false);
            await expect(f.getByRole('textbox', { name: 'Scanner capture input' })).toBeVisible();
        });
    }
