import { test, expect } from '@playwright/test';
const destination = 'container: 33333333-3333-4333-8333-333333333333';
const item = 'item: 11111111-1111-4111-8111-111111111111';
test('actual app navigation enters isolated scanner demo, moves once, leaves, and reload starts Off', async ({
    page,
}) => {
    const sent: string[] = [];
    page.on('websocket', (socket) =>
        socket.on('framesent', (frame) => {
            sent.push(String(frame.payload));
        })
    );
    await page.goto('/items');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('link', { name: 'Scanner simulation', exact: true }).click();
    await expect(page).toHaveURL(/\/scanner\/demo$/u);
    await expect(page.getByText('Temporary demo · no household inventory changes')).toBeVisible();
    const subscriptions = await page.evaluate(() =>
        Object.values((window as any).Meteor.connection._subscriptions).map((s: any) => s.name)
    );
    expect(subscriptions.filter((name: string) => name.startsWith('inventory'))).toEqual([]);
    sent.length = 0;
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (const code of ['inventory-action:v1:move-demo', destination, item]) {
        await page.keyboard.type(code);
        await page.keyboard.press('Enter');
    }
    await expect(page.getByTestId('move-count')).toHaveText('Simulated moves: 1');
    await page.keyboard.type(item);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('last-outcome').first()).toContainText('No-op');
    expect(sent.filter((frame) => frame.includes('method'))).toEqual([]);
    await page.reload();
    await expect(page.getByTestId('move-count')).toHaveText('Simulated moves: 0');
    await expect(page.getByTestId('capture-state')).toHaveText('Off');
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page).toHaveURL(/\/items$/u);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
});

test('Leave cancels a delayed synthetic lookup and remount stays inert', async ({ page }) => {
    await page.goto('/scanner/demo');
    await expect(page.getByTestId('capture-state')).toHaveText('Off');
    await page.getByText('Developer diagnostics', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Next lookup behavior' }).selectOption('slow');
    // Observe the actual existing delayed timer cleanup, without replacing its callback or clock.
    await page.evaluate(() => {
        const originalSet = window.setTimeout.bind(window);
        const originalClear = window.clearTimeout.bind(window);
        const ids = new Set<number>();
        const probe = { scheduled: 0, cleared: 0, fired: 0 };
        (window as any).__scannerLeaveTimers = probe;
        window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) => {
            if (delay !== 2500 || typeof handler !== 'function') return originalSet(handler, delay, ...args);
            probe.scheduled++;
            const id = originalSet(() => {
                probe.fired++;
                handler(...args);
            }, delay);
            ids.add(id);
            return id;
        }) as typeof window.setTimeout;
        window.clearTimeout = ((id?: number) => {
            if (id !== undefined && ids.delete(id)) probe.cleared++;
            originalClear(id);
        }) as typeof window.clearTimeout;
    });
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    for (const code of ['inventory-action:v1:move-demo', destination, item]) {
        await page.keyboard.type(code);
        await page.keyboard.press('Enter');
    }
    await expect(page.getByTestId('simulation-read').last()).toContainText('pending');
    expect(await page.evaluate(() => (window as any).__scannerLeaveTimers.scheduled)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page).toHaveURL(/\/items$/u);
    await expect(page.getByRole('textbox', { name: 'Scanner capture input' })).toHaveCount(0);
    const probe = await page.evaluate(() => (window as any).__scannerLeaveTimers);
    expect(probe.cleared).toBe(probe.scheduled);
    expect(probe.fired).toBe(0);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('link', { name: 'Scanner simulation', exact: true }).click();
    // Wait past the old callback deadline on the new mounted session.
    await page.waitForTimeout(2700);
    await expect(page.getByTestId('capture-state')).toHaveText('Off');
    await expect(page.getByTestId('move-count')).toHaveText('Simulated moves: 0');
    await expect(page.getByTestId('simulation-read')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__scannerLeaveTimers.fired)).toBe(0);
});
