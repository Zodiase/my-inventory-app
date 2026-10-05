/** Proves opted-in loading capture observes real child commits without remounting it. */
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { observeMeteorLoading } from '../helpers/meteor-loading-diagnostics.mjs';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';

test('links real gate and child commits and retains the child across root updates', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(globalThis, 'inventoryE2eLoadingCapability', {
            value: Object.freeze({ schema: 1, epoch: 'document-0123456789abcdef' }),
            configurable: false,
            writable: false,
        });
    });
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    const containerId = await callMeteorMethod<string>(page, 'createItem', {
        name: 'Capture fixture',
        isContainer: true,
    });
    await page.goto(`/container/${containerId}`);
    await expect(page.getByRole('heading', { name: 'Capture fixture', exact: true })).toBeVisible();
    const read = () =>
        page.evaluate(() =>
            (
                globalThis as unknown as {
                    inventoryE2eLoadingCapture: {
                        read: () => { complete: boolean; events: Array<Record<string, unknown>> };
                    };
                }
            ).inventoryE2eLoadingCapture.read()
        );
    await expect.poll(async () => (await read()).events.filter((e) => e.phase === 'passive-mount').length).toBe(1);
    const before = await read();
    expect(before.complete).toBe(true);
    const childCommit = before.events.findLast(
        (e) => e.phase === 'commit' && e.childFrame !== undefined && e.decision === 'contents'
    );
    expect(childCommit).toBeDefined();
    expect(
        before.events.some(
            (e) =>
                e.phase === 'commit' &&
                e.routeAttempt !== undefined &&
                e.decision === 'contents' &&
                e.commitBatch === childCommit?.commitBatch
        )
    ).toBe(true);
    await callMeteorMethod(page, 'createItem', { name: 'Capture added item', containerId });
    await expect(page.getByText('Capture added item', { exact: true })).toBeVisible();
    const after = await read();
    expect(after.complete).toBe(true);
    expect(after.events.filter((e) => e.phase === 'passive-mount')).toHaveLength(1);
    expect(after.events.filter((e) => e.phase === 'passive-unmount')).toHaveLength(0);
    expect(
        after.events.filter((e) => e.phase === 'child-render').every((e) => e.instance === childCommit?.instance)
    ).toBe(true);
});

test('no opt-in exposes no capture API', async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
    expect(await page.evaluate(() => 'inventoryE2eLoadingCapture' in globalThis)).toBe(false);
});

test('a failed real-browser assertion persists the opted-in ring alongside DDP evidence', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(globalThis, 'inventoryE2eLoadingCapability', {
            value: Object.freeze({ schema: 1, epoch: 'document-0123456789abcdef' }),
            configurable: false,
            writable: false,
        });
    });
    const observer = observeMeteorLoading(page);
    try {
        await page.goto('/');
        await waitForMeteorReady(page);
        await resetDatabase(page);
        const id = await callMeteorMethod<string>(page, 'createItem', {
            name: 'Failure capture fixture',
            isContainer: true,
        });
        await page.goto(`/container/${id}`);
        await expect(page.getByRole('heading', { name: 'Failure capture fixture', exact: true })).toBeVisible();
        let failedAssertion: unknown;
        try {
            await expect(page.getByRole('heading', { name: 'Deliberately absent fixture' })).toBeVisible({
                timeout: 300,
            });
        } catch (error) {
            failedAssertion = error;
        }
        expect(failedAssertion).toBeInstanceOf(Error);
        let artifact: string | undefined;
        await observer.finish({
            status: 'failed',
            outputPath: test.info().outputPath.bind(test.info()),
            attach: async (_name: string, attachment: { path: string }) => {
                artifact = await readFile(attachment.path, 'utf8');
            },
        });
        expect(artifact).toBeDefined();
        const evidence = JSON.parse(artifact!);
        expect(evidence.finalSampleCompleted).toBe(true);
        expect(evidence.renderCapture).toMatchObject({ available: true, complete: true, stopped: true });
        expect(evidence.renderCapture.lastCommit).toMatchObject({ phase: 'commit' });
        expect(
            evidence.renderCapture.events.some(
                (event: { phase: string; childFrame?: number }) =>
                    event.phase === 'commit' && event.childFrame !== undefined
            )
        ).toBe(true);
        expect(evidence.events.some((event: { type: string }) => event.type === 'sub')).toBe(true);
        expect(artifact).not.toContain(id);
        expect(artifact).not.toContain('Failure capture fixture');
        await test.info().attach('controlled-real-app-failure-evidence', {
            body: Buffer.from(artifact!),
            contentType: 'application/json',
        });
    } finally {
        await observer.finish({ status: 'passed', attach: async () => {} });
    }
});
