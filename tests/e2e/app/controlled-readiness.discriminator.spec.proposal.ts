/** Review-gated four-document controlled actual-App fixture; not natural DDP reproduction. */
import { expect, test as base } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { observeMeteorLoading } from '../helpers/meteor-loading-diagnostics.mjs';
import { verifyControlledChain, verifyControlledTimeout } from '../helpers/controlled-readiness-oracle.mjs';
type Variant = 'equal-pending' | 'changed-state' | 'flush-first' | 'retained-pending';
interface Snapshot {
    epoch: string;
    variant: Variant;
    complete: boolean;
    dropped: number;
    gateOpen: boolean;
    primed: boolean;
    triggered: boolean;
    actualReady: Record<string, boolean>;
    renderedFilterBuilder: boolean;
    events: Array<Record<string, unknown>>;
}
interface Api {
    prime: () => void;
    trigger: () => void;
    drain: () => void;
    read: () => Snapshot;
    stop: () => void;
}
const test = base.extend<{ variant: Variant; evidence: ReturnType<typeof observeMeteorLoading> }>({
    variant: ['equal-pending', { option: true }],
    evidence: [
        async ({ page, variant }, use, info) => {
            await page.addInitScript((variant) => {
                const epoch =
                    'document-' +
                    Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join(
                        ''
                    );
                for (const [name, value] of [
                    ['inventoryE2eScalarCapability', { schema: 1, epoch }],
                    ['inventoryE2eControlledCapability', { schema: 1, epoch, variant }],
                    ...(variant === 'retained-pending'
                        ? [['inventoryE2eRetainedCapability', { schema: 1, epoch }]]
                        : []),
                ] as readonly (readonly [string, unknown])[])
                    Object.defineProperty(globalThis, name, {
                        value: Object.freeze(value),
                        writable: false,
                        configurable: false,
                    });
            }, variant);
            const observer = observeMeteorLoading(page);
            try {
                await use(observer);
            } finally {
                try {
                    const evidence = await Promise.race([
                        page
                            .evaluate(() => {
                                const host = globalThis as unknown as {
                                    inventoryE2eControlledApp?: Api;
                                    inventoryE2eControlledBootstrap?: unknown;
                                    inventoryE2eRetainedBootstrap?: unknown;
                                    inventoryE2eScalarCapture?: { read: () => unknown; stop: () => void };
                                    inventoryE2eLoadingCapture?: unknown;
                                };
                                host.inventoryE2eControlledApp?.stop();
                                host.inventoryE2eScalarCapture?.stop();
                                return {
                                    controlled: host.inventoryE2eControlledApp?.read(),
                                    controlledBootstrap: host.inventoryE2eControlledBootstrap,
                                    retainedBootstrap: host.inventoryE2eRetainedBootstrap,
                                    scalar: host.inventoryE2eScalarCapture?.read(),
                                    descendantApiAbsent: host.inventoryE2eLoadingCapture === undefined,
                                };
                            })
                            .catch(() => ({ reason: 'read-failed' })),
                        new Promise((resolve) => setTimeout(() => resolve({ reason: 'read-timeout' }), 700)),
                    ]);
                    await writeFile(info.outputPath('controlled-evidence.json'), JSON.stringify(evidence), {
                        mode: 0o600,
                    });
                    await page
                        .screenshot({ path: info.outputPath('final.png'), timeout: 700 })
                        .catch(async () =>
                            writeFile(
                                info.outputPath('screenshot-unavailable.json'),
                                JSON.stringify({ reason: 'screenshot-unavailable' })
                            )
                        );
                } finally {
                    await observer.finish({
                        status: 'failed',
                        outputPath: info.outputPath.bind(info),
                        attach: info.attach.bind(info),
                    });
                }
            }
        },
        { auto: true },
    ],
});
test.use({ trace: 'on' });
async function api(page, command: 'read' | 'prime' | 'trigger' | 'drain') {
    return page.evaluate((command) => {
        const api = (globalThis as unknown as { inventoryE2eControlledApp?: Api }).inventoryE2eControlledApp;
        if (api === undefined) throw new Error('Controlled API absent');
        return api[command]();
    }, command);
}
for (const variant of ['equal-pending', 'changed-state', 'flush-first', 'retained-pending'] as const)
    test.describe(variant, () => {
        test.use({ variant });
        test('requires Loading before trigger and discriminates recovery at original deadline', async ({
            page,
            evidence,
        }, info) => {
            await page.goto('/');
            await waitForMeteorReady(page);
            await resetDatabase(page);
            await page.reload({ waitUntil: 'networkidle' });
            await waitForMeteorReady(page);
            const first = await callMeteorMethod<string>(page, 'createItem', {
                name: 'First floor',
                isContainer: true,
            });
            const living = await callMeteorMethod<string>(page, 'createItem', {
                name: 'Living room',
                isContainer: true,
                containerId: first,
            });
            await page.goto(`/container/${living}`);
            await waitForMeteorReady(page);
            await page.waitForFunction(() => {
                const a = (
                    globalThis as unknown as { inventoryE2eControlledApp?: Api }
                ).inventoryE2eControlledApp?.read();
                return (
                    a !== undefined && ['tags.all', 'items.all', 'inventory.identities'].every((n) => a.actualReady[n])
                );
            });
            await api(page, 'drain');
            const main = page.locator('.app-shell-main'),
                loading = main.getByText('Loading…', { exact: true }),
                heading = main.getByRole('heading', { name: 'Living room', exact: true });
            await expect(loading).toBeVisible();
            await expect(heading).toHaveCount(0);
            const topology = await page.evaluate(() => {
                const host = globalThis as unknown as {
                    inventoryE2eControlledApp?: Api;
                    inventoryE2eRetainedBootstrap?: { enabled: boolean };
                    inventoryE2eScalarCapture?: { read: () => { epoch: string } };
                    inventoryE2eLoadingCapture?: unknown;
                };
                return {
                    epoch: host.inventoryE2eControlledApp?.read().epoch,
                    scalarEpoch: host.inventoryE2eScalarCapture?.read().epoch,
                    retained: host.inventoryE2eRetainedBootstrap?.enabled,
                    descendantAbsent: host.inventoryE2eLoadingCapture === undefined,
                };
            });
            expect(topology.epoch).toBe(topology.scalarEpoch);
            expect(topology.retained).toBe(variant === 'retained-pending');
            expect(topology.descendantAbsent).toBe(true);
            await writeFile(info.outputPath('topology-before-trigger.json'), JSON.stringify(topology), { mode: 0o600 });
            await api(page, 'prime');
            await expect(loading).toBeVisible();
            const before = (await api(page, 'read')) as Snapshot;
            expect(before.gateOpen).toBe(false);
            expect(before.primed).toBe(true);
            expect(before.renderedFilterBuilder).toBe(true);
            await writeFile(info.outputPath('before-trigger.json'), JSON.stringify(before), { mode: 0o600 });
            await page.screenshot({ path: info.outputPath('before-trigger.png') });
            await api(page, 'trigger');
            const afterDrain = (await api(page, 'read')) as Snapshot;
            verifyControlledChain(afterDrain, variant);
            await writeFile(info.outputPath('after-drain.json'), JSON.stringify(afterDrain), { mode: 0o600 });
            await page.screenshot({ path: info.outputPath('after-drain.png') });
            const started = Date.now();
            let recovered = false;
            let visibilityError: unknown;
            try {
                await expect(heading).toBeVisible({ timeout: 5000 });
                recovered = true;
            } catch (error) {
                if (variant !== 'equal-pending') throw error;
                visibilityError = error;
            }
            const visibilityElapsedMs = Date.now() - started;
            expect(recovered).toBe(variant !== 'equal-pending');
            if (variant === 'equal-pending') {
                const finalLoading = await loading.isVisible();
                const finalHeading = await heading.isVisible();
                const pageClosed = page.isClosed();
                await evidence.finish({
                    status: 'failed',
                    outputPath: info.outputPath.bind(info),
                    attach: info.attach.bind(info),
                });
                const diagnostics = JSON.parse(
                    await readFile(info.outputPath('meteor-loading-diagnostics.json'), 'utf8')
                );
                verifyControlledTimeout({
                    error: visibilityError,
                    elapsedMs: visibilityElapsedMs,
                    headingLocator: heading.toString(),
                    finalLoading,
                    finalHeading,
                    pageClosed,
                    publicErrors: diagnostics.publicErrors,
                });
            } else await expect(loading).toHaveCount(0);
            await writeFile(
                info.outputPath('outcome.json'),
                JSON.stringify({
                    variant,
                    recovered,
                    elapsedMs: Date.now() - started,
                    controlledBaselineTimeout: variant === 'equal-pending' && !recovered,
                }),
                { mode: 0o600 }
            );
        });
    });
