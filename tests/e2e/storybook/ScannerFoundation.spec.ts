import { test, expect, type FrameLocator, type Page } from '@playwright/test';
const codes = [
    'item: 11111111-1111-4111-8111-111111111111',
    'item: 22222222-2222-4222-8222-222222222222',
    'container: 33333333-3333-4333-8333-333333333333',
    '00012345678905',
];
const manager = process.env.SCANNER_STORYBOOK_URL ?? 'http://127.0.0.1:6006';
async function open(page: Page): Promise<FrameLocator> {
    await page.goto(`${manager}/?path=/story/scanner-foundation--interactive`);
    const frame = page.frameLocator('#storybook-preview-iframe');
    await expect(frame.getByRole('heading', { name: 'Scanner foundation', exact: true })).toBeVisible();
    return frame;
}
async function scan(page: Page, value: string): Promise<void> {
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
}
const state = (frame: FrameLocator) => frame.getByTestId('capture-state');
async function history(frame: FrameLocator): Promise<void> {
    await frame.getByText('Ordered capture evidence', { exact: true }).click();
    await frame.getByText('Dispatch and resolver history', { exact: true }).click();
}
test('scoped keyboard frames preserve repeats, paste provenance, invalid payloads and empty delimiters', async ({
    page,
}) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, codes[3]);
    await page.keyboard.press('Enter');
    await scan(page, codes[3]);
    await expect(f.getByTestId('counters')).toContainText('Captured 2');
    await expect(f.getByTestId('counters')).toContainText('Resolved 2');
    await scan(page, 'inventory-action:v2:exit');
    await expect(state(f)).toHaveText('ready');
    await expect(f.getByTestId('counters')).toContainText('Rejected 1');
    await f
        .getByRole('textbox', { name: 'Synthetic scan input', exact: true })
        .evaluate((input) => input.dispatchEvent(new Event('paste', { bubbles: true })));
    await scan(page, codes[0]);
    await history(f);
    await expect(f.getByTestId('read-record').last()).toContainText('paste');
    await expect(f.getByTestId('resolver-history')).toHaveText('Resolver calls: 1:1:1, 1:2:1, 1:4:1');
});
test('clean-boundary pause resumes ready; partial timeout drains and never resolves the recovery read', async ({
    page,
}) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.press('Tab');
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(state(f)).toHaveText('ready');
    await page.keyboard.type('item: 111');
    await page.clock.fastForward(2100);
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(state(f)).toHaveText('draining');
    await expect(f.getByRole('status')).toContainText('this read will not be added');
    await scan(page, codes[0]);
    await expect(f.getByTestId('counters')).toContainText('Captured 0');
    await scan(page, codes[1]);
    await page.clock.fastForward(200);
    await history(f);
    await expect(f.getByTestId('resolver-history')).toHaveText('Resolver calls: 1:3:1');
    await expect(f.getByTestId('counters')).toContainText('Discarded 1');
});
test('ordinary input, IME, navigation, dialog, window blur and visibility never auto-rearm', async ({ page }) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.type('partial');
    await f.getByRole('textbox', { name: 'Ordinary editing field' }).fill('inventory-action:v1:exit');
    await expect(state(f)).toHaveText('paused');
    await page.keyboard.press('Enter');
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.keyboard.press('Enter');
    await f
        .getByRole('textbox', { name: 'Synthetic scan input', exact: true })
        .evaluate((input) => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Open dialog', exact: true }).click();
    await f.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await f.locator('main').evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await f.locator('main').evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(state(f)).toHaveText('paused');
    await f.locator('main').evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(state(f)).toHaveText('paused');
    await history(f);
    await expect(f.getByTestId('resolver-history')).toHaveText('Resolver calls: none');
});
test('out-of-order resolution, retry, cancellation and exit keep capture evidence and session boundaries', async ({
    page,
}) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('reordered');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    for (const code of codes.slice(0, 3)) await scan(page, code);
    await page.clock.fastForward(2500);
    await history(f);
    await expect(f.getByTestId('read-record').nth(0)).toContainText(codes[0]);
    await expect(f.getByTestId('last-outcome')).toContainText('Synthetic container');
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('error');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, codes[0]);
    await page.clock.fastForward(200);
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('normal');
    await f.getByTestId('read-record').last().getByRole('button', { name: 'Retry', exact: true }).click();
    await page.clock.fastForward(200);
    await expect(f.getByTestId('read-record').last()).toContainText('attempt 2 · prior outcomes error');
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, codes[1]);
    await f.getByRole('button', { name: 'Exit', exact: true }).click();
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.fastForward(6000);
    await expect(f.getByTestId('read-record').last()).toContainText('cancelled');
    await expect(state(f)).toHaveText('ready');
    await page.reload();
    await expect(state(f)).toHaveText('off');
    await expect(f.getByTestId('counters')).toContainText('Captured 0');
});
test('command and tap share semantic dispatcher, wrong kinds remain classified, capacity is explicit', async ({
    page,
}) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('combobox', { name: 'Synthetic expected kind' }).selectOption('item');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, codes[2]);
    await page.clock.fastForward(200);
    await expect(f.getByTestId('last-outcome')).toContainText('Wrong kind');
    await scan(page, 'inventory-action:v1:show-actions');
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, 'inventory-action:v1:inspect-demo');
    await expect(state(f)).toHaveText('paused');
    await f.getByRole('button', { name: 'inspect-demo', exact: true }).click();
    await history(f);
    await expect(f.getByTestId('action-history')).toContainText('scan');
    await expect(f.getByTestId('action-history')).toContainText('tap');
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    for (let i = 0; i < 9; i++) await scan(page, codes[0]);
    await expect(state(f)).toHaveText('paused');
    await expect(f.getByRole('status')).toContainText('Capacity');
});

test('page navigation never replays reads or resumes capture on browser return', async ({ page }) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, codes[0]);
    await expect(f.getByTestId('counters')).toContainText('Resolved 1');
    await page.goto('about:blank');
    await page.goBack();
    await expect(state(f)).not.toHaveText('ready');
    await expect(state(f)).not.toHaveText('collecting');
    await expect(f.getByTestId('counters')).not.toContainText('Captured 2');
});

for (const viewport of [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 480 },
]) {
    test(`manager proof has readable controls, scroll access and no overflow ${viewport.width}x${viewport.height}`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        const f = await open(page);
        await f.getByRole('button', { name: 'Start', exact: true }).click();
        await scan(page, codes[0]);
        await expect(f.getByTestId('last-outcome')).toContainText('resolved');
        const overflow = await f
            .locator('main')
            .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow).toBe(false);
        await f.getByRole('button', { name: 'Open dialog', exact: true }).scrollIntoViewIfNeeded();
        await expect(f.getByRole('button', { name: 'Open dialog', exact: true })).toBeInViewport();
        await f.getByRole('button', { name: 'Exit', exact: true }).scrollIntoViewIfNeeded();
        await expect(f.getByRole('button', { name: 'Exit', exact: true })).toBeInViewport();
    });
}
