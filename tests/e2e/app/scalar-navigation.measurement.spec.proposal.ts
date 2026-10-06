/** Reviewed measurement only; opt in through a dedicated test pattern, never general CI discovery. */
import { expect, test as base } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { observeMeteorLoading } from '../helpers/meteor-loading-diagnostics.mjs';
const test = base.extend<{ measurementMode: 'off' | 'scalar' | 'descendant'; evidence: void }>({
    measurementMode: ['off', { option: true }],
    evidence: [
        async ({ page, measurementMode }, use, testInfo) => {
            if (measurementMode !== 'off')
                await page.addInitScript((mode) => {
                    const bytes = crypto.getRandomValues(new Uint8Array(8));
                    const epoch = 'document-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
                    Object.defineProperty(
                        globalThis,
                        mode === 'scalar' ? 'inventoryE2eScalarCapability' : 'inventoryE2eLoadingCapability',
                        {
                            value: Object.freeze({ schema: 1, epoch }),
                            writable: false,
                            configurable: false,
                        }
                    );
                }, measurementMode);
            const observer = observeMeteorLoading(page);
            await use();
            // Every attempt is retained, including passes; public DDP collector also remains unchanged.
            const scalar = await Promise.race([
                page
                    .evaluate(() => {
                        const api = (
                            globalThis as unknown as {
                                inventoryE2eScalarCapture?: { read: () => unknown; stop: () => void };
                            }
                        ).inventoryE2eScalarCapture;
                        if (api === undefined)
                            return { schema: 'root-route-scalar/v1', complete: false, reason: 'not-enabled' };
                        api.stop();
                        return api.read();
                    })
                    .catch(() => ({ complete: false, reason: 'read-failed' })),
                new Promise((resolve) => setTimeout(() => resolve({ complete: false, reason: 'drain-timeout' }), 500)),
            ]);
            const evidencePath = testInfo.outputPath('scalar-evidence.json');
            await mkdir(dirname(evidencePath), { recursive: true });
            await writeFile(evidencePath, JSON.stringify(scalar), { mode: 0o600 });
            await testInfo.attach('scalar-evidence', { body: JSON.stringify(scalar), contentType: 'application/json' });
            await page.screenshot({ path: testInfo.outputPath('attempt.png'), timeout: 500 }).catch(async () => {
                await writeFile(
                    testInfo.outputPath('screenshot-unavailable.json'),
                    JSON.stringify({ reason: 'screenshot-unavailable' })
                );
            });
            // This existing collector writes only for status=failed. The retention adapter
            // saves every attempt without modifying Playwright's real status or assertions.
            await observer.finish({
                status: 'failed',
                outputPath: testInfo.outputPath.bind(testInfo),
                attach: testInfo.attach.bind(testInfo),
            });
        },
        { auto: true },
    ],
});
test.use({ trace: 'on' });
test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMeteorReady(page);
});
for (const [index, mode] of (
    ['off', 'descendant', 'scalar', 'scalar', 'descendant', 'off', 'descendant', 'off', 'scalar'] as const
).entries())
    test.describe('attempt-' + index + '-' + mode, () => {
        test.use({ measurementMode: mode });
        test('shows one root icon and parent names in nested breadcrumbs', async ({ page }) => {
            const firstFloorId = await callMeteorMethod<string>(page, 'createItem', {
                name: 'First floor',
                isContainer: true,
            });
            const livingRoomId = await callMeteorMethod<string>(page, 'createItem', {
                name: 'Living room',
                isContainer: true,
                containerId: firstFloorId,
            });

            await page.goto(`/container/${livingRoomId}`);
            await waitForMeteorReady(page);

            const breadcrumb = page.locator('.app-shell-breadcrumb');
            await expect(breadcrumb).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Living room', exact: true })).toBeVisible();
            await expect(breadcrumb.getByRole('button', { name: 'Navigate to all items' })).toBeVisible();
            await expect(breadcrumb.getByRole('button', { name: 'Navigate to First floor' })).toBeVisible();
            await expect(breadcrumb.locator('svg[aria-label="Home"]')).toHaveCount(1);

            const iconMetrics = await breadcrumb.locator('svg[aria-label="Home"]').evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { width: rect.width, height: rect.height, top: rect.top };
            });
            const labelMetrics = await breadcrumb
                .getByRole('button', { name: 'Navigate to all items' })
                .evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    return { top: rect.top, height: rect.height };
                });

            expect(iconMetrics.width).toBeGreaterThanOrEqual(20);
            expect(iconMetrics.width).toBeLessThanOrEqual(28);
            expect(iconMetrics.height).toBeGreaterThanOrEqual(20);
            expect(Math.abs(iconMetrics.top - labelMetrics.top)).toBeLessThanOrEqual(8);
        });
    });
