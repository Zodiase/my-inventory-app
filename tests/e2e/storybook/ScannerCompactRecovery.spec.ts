/** Bounded synthetic dock proof: truthful recovery, persistent navigation and unclipped short-phone status. */
import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { scaleScannerProof } from '../helpers/scanner-proof-text-scale';
const manager = process.env.SCANNER_STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const item = 'item: 11111111-1111-4111-8111-111111111111';
for (const [width, height] of [
    [390, 480],
    [390, 844],
    [820, 900],
    [1280, 720],
])
    for (const scale of [1, 1.25])
        test(`compact recovery ${width}x${height} text ${scale}`, async ({ page }, info) => {
            await page.setViewportSize({ width, height });
            await page.goto(`${manager}/?path=/story/scanner-move-simulation--compact-recovery`);
            const f = page.frameLocator('#storybook-preview-iframe');
            await expect(f.getByRole('heading', { name: 'Scanner simulation', exact: true })).toBeVisible();
            const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true });
            if (await hide.isVisible()) await hide.click();
            await scaleScannerProof(f, scale);
            const dock = f.getByRole('complementary', { name: 'Scanner capture dock' });
            const feedback = f.getByTestId('dock-feedback');
            const sink = f.getByRole('textbox', { name: 'Scanner capture input' });
            const leave = dock.getByRole('button', { name: 'Leave', exact: true });
            const measurements: unknown[] = [];
            async function capture(state: string) {
                const geometry = await dock.evaluate((el) => {
                    const box = el.getBoundingClientRect();
                    const p = el.querySelector<HTMLElement>('[data-testid="dock-feedback"]')!;
                    const status = p.getBoundingClientRect();
                    return {
                        dock: { x: box.x, y: box.y, w: box.width, h: box.height },
                        status: {
                            y: status.y,
                            bottom: status.bottom,
                            h: status.height,
                            scroll: p.scrollHeight,
                            client: p.clientHeight,
                        },
                        text: p.textContent,
                    };
                });
                expect(geometry.dock.h).toBeLessThanOrEqual(150);
                expect(geometry.status.bottom).toBeLessThanOrEqual(geometry.dock.y + geometry.dock.h);
                expect(geometry.status.scroll).toBeLessThanOrEqual(geometry.status.client + 1);
                for (const control of [sink, leave]) {
                    const b = await control.boundingBox();
                    expect(b!.height).toBeGreaterThanOrEqual(44);
                    expect(b!.y + b!.height).toBeLessThanOrEqual(height);
                }
                expect(await f.locator('html').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
                measurements.push({ state, geometry });
                const screenshot = await page.screenshot();
                await writeFile(info.outputPath(`${state}.png`), screenshot);
                await info.attach(state, { body: screenshot, contentType: 'image/png' });
            }
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await capture('ready');
            await page.keyboard.press('Tab');
            await expect(feedback).toHaveText('Paused. Resume to scan.');
            await capture('ordinary-paused');
            await dock.getByRole('button', { name: 'Resume', exact: true }).click();
            await expect(f.getByTestId('capture-state')).toHaveText('Ready');
            await page.keyboard.type('partial');
            await page.keyboard.press('Tab');
            await expect(feedback).toHaveText('Paused. Resume; next read discarded.');
            const resume = dock.getByRole('button', { name: 'Resume', exact: true });
            const a = await sink.boundingBox(),
                b = await resume.boundingBox();
            expect(Math.abs(a!.y + a!.height / 2 - b!.y - b!.height / 2)).toBeLessThan(1);
            await capture('partial-paused');
            await f.getByText('Show action QR codes', { exact: true }).click();
            for (const image of await f.locator('img[data-payload]').all()) {
                await image.scrollIntoViewIfNeeded();
                const qr = await image.boundingBox(),
                    d = await dock.boundingBox();
                expect(qr!.y + qr!.height).toBeLessThanOrEqual(d!.y + 1);
                await expect(leave).toBeInViewport();
                await expect(resume).toBeInViewport();
            }
            await capture('qr-scroll');
            await f.getByText('Developer diagnostics', { exact: true }).click();
            const note = f.getByRole('textbox', { name: 'Manual note' });
            await note.fill('ordinary editing');
            await expect(note).toBeFocused();
            await expect(sink).not.toBeFocused();
            await capture('diagnostics');
            await resume.click();
            await expect(sink).toBeFocused();
            await expect(f.getByTestId('capture-state')).toHaveText('Recovering');
            await expect(feedback).toHaveText('Recovering. Next read discarded; then scan again.');
            await capture('recovering');
            await page.keyboard.type(item);
            await page.keyboard.press('Enter');
            await expect(f.getByTestId('capture-state')).toHaveText('Ready');
            await expect(f.getByTestId('last-outcome').first()).toContainText('boundary cleared');
            await page.keyboard.type('inventory-action:v1:MOVE-DEMO');
            await page.keyboard.press('Enter');
            await expect(f.getByTestId('last-outcome').first()).toContainText('capitalization');
            await expect(feedback).toContainText('Last read rejected');
            await capture('long-outcome');
            await leave.focus();
            await expect(leave).toBeFocused();
            await capture('leave-focus');
            await leave.press('Enter');
            await expect(f.getByRole('heading', { name: 'Simulation left' })).toBeVisible();
            await expect(sink).toHaveCount(0);
            await page.keyboard.type(item);
            await page.keyboard.press('Enter');
            await expect(f.getByRole('heading', { name: 'Simulation left' })).toBeVisible();
            await info.attach('left', { body: await page.screenshot(), contentType: 'image/png' });
            await writeFile(info.outputPath('measurements.json'), JSON.stringify(measurements));
            await info.attach('measurements', { body: JSON.stringify(measurements), contentType: 'application/json' });
        });
