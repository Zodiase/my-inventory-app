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
    await expect(page.getByTestId('dock-feedback')).toContainText('No-op');
    expect(sent.filter((frame) => frame.includes('method'))).toEqual([]);
    await page.reload();
    await expect(page.getByTestId('move-count')).toHaveText('Simulated moves: 0');
    await expect(page.getByTestId('capture-state')).toHaveText('Off');
    await page.getByRole('button', { name: 'Leave simulation' }).click();
    await expect(page).toHaveURL(/\/items$/u);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
});
