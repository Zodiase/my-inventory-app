import { test, expect, type FrameLocator, type Page } from '@playwright/test';
import { scaleScannerProof } from '../helpers/scanner-proof-text-scale';
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
    await f.getByRole('combobox', { name: 'Resolver fault' }).focus();
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
    const sink = f.getByRole('textbox', { name: 'Synthetic scan input', exact: true });
    const originalSink = await sink.elementHandle();
    await scan(page, 'inventory-action:v1:show-actions');
    await expect(state(f)).toHaveText('ready');
    await expect(sink).toBeFocused();
    await scan(page, 'inventory-action:v1:inspect-demo');
    await expect(state(f)).toHaveText('ready');
    expect(await sink.evaluate((input, original) => input === original, originalSink)).toBe(true);
    await scan(page, codes[0]);
    await page.clock.fastForward(200);
    await expect(f.getByTestId('last-outcome')).toContainText('resolved');
    await f.getByRole('button', { name: 'inspect-demo', exact: true }).click();
    await history(f);
    await expect(f.getByTestId('action-history')).toContainText('scan');
    await expect(f.getByTestId('action-history')).toContainText('tap');
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    for (let i = 0; i < 9; i++) await scan(page, codes[0]);
    await expect(state(f)).toHaveText('paused');
    await expect(f.getByRole('status').filter({ hasText: 'Capacity reached' })).toContainText('Capacity');
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

test('nonterminating keys, modifiers and key repeat do not complete a frame', async ({ page }) => {
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.type(codes[3]);
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await expect(f.getByTestId('counters')).toContainText('Captured 0');
    await f
        .getByRole('textbox', { name: 'Synthetic scan input', exact: true })
        .evaluate((input) =>
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }))
        );
    await expect(f.getByTestId('counters')).toContainText('Captured 0');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(f.getByTestId('counters')).toContainText('Captured 1');
    await page.keyboard.type('badX');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Escape');
    await expect(state(f)).toHaveText('paused');
});
test('textarea and contenteditable focus pause capture while retaining ordinary editing', async ({ page }) => {
    const f = await open(page);
    await f.locator('main').evaluate((main) => {
        const text = document.createElement('textarea');
        text.setAttribute('aria-label', 'Textarea fixture');
        main.appendChild(text);
        const editable = document.createElement('div');
        editable.contentEditable = 'true';
        editable.setAttribute('role', 'textbox');
        editable.setAttribute('aria-label', 'Editable fixture');
        main.appendChild(editable);
    });
    for (const name of ['Textarea fixture', 'Editable fixture']) {
        const startOrResume = (await state(f).textContent()) === 'off' ? 'Start' : 'Resume';
        await f.getByRole('button', { name: startOrResume, exact: true }).click();
        await page.keyboard.type('partial');
        await f.getByRole('textbox', { name }).fill('inventory-action:v1:exit');
        await expect(state(f)).toHaveText('paused');
        if (name === 'Editable fixture')
            await expect(f.getByRole('textbox', { name })).toHaveText('inventory-action:v1:exit');
        else await expect(f.getByRole('textbox', { name })).toHaveValue('inventory-action:v1:exit');
    }
    await history(f);
    await expect(f.getByTestId('resolver-history')).toHaveText('Resolver calls: none');
});
test('unknown identity, offline and timeout faults remain resolution failures without navigation or writes', async ({
    page,
}) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, 'container: 44444444-4444-4444-8444-444444444444');
    await page.clock.fastForward(200);
    await expect(f.getByTestId('last-outcome')).toContainText('unknown');
    for (const fault of ['offline', 'timeout']) {
        await f.getByRole('combobox', { name: 'Resolver fault' }).focus();
        await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption(fault);
        await f.getByRole('button', { name: 'Resume', exact: true }).click();
        await scan(page, codes[0]);
        await page.clock.fastForward(3200);
        await expect(f.getByTestId('last-outcome')).toContainText(`Synthetic ${fault}`);
    }
    await f.getByRole('combobox', { name: 'Resolver fault' }).focus();
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    await scan(page, codes[1]);
    await f.getByText('Ordered capture evidence', { exact: true }).click();
    await f.getByTestId('read-record').last().getByRole('button', { name: 'Cancel', exact: true }).click();
    await f.getByTestId('read-record').last().getByRole('button', { name: 'Mark correction', exact: true }).click();
    await page.clock.fastForward(6000);
    await expect(f.getByTestId('read-record').last()).toContainText('cancelled');
    await expect(f.getByTestId('read-record').last()).toContainText('marked for correction');
});

test('full history retries the existing record; full pending queue visibly blocks until cancellation', async ({
    page,
}) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('error');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    const input = f.getByRole('textbox', { name: 'Synthetic scan input', exact: true });
    for (let i = 0; i < 100; i++) {
        await input.fill(codes[0]);
        await input.press('Enter');
        await page.clock.fastForward(200);
    }
    await f.getByText('Ordered capture evidence', { exact: true }).click();
    await expect(f.getByTestId('read-record')).toHaveCount(100);
    const last = f.getByTestId('read-record').last();
    await expect(last.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
    await expect(last.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await expect(f.getByTestId('last-recovery-guidance')).toHaveText(
        'Retry this failed read. Mark correction to flag this record.'
    );
    await expect(f.getByTestId('last-outcome')).not.toContainText('cancel');
    await last.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.clock.fastForward(200);
    await expect(last).toContainText('attempt 2');
    await expect(last).toContainText('prior outcomes error');
    await expect(f.getByTestId('read-record')).toHaveCount(100);
    await last.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.clock.fastForward(200);
    await expect(last).toContainText('Retry attempt limit reached.');
    await expect(f.getByTestId('last-recovery-guidance')).toHaveText(
        'Retry attempt limit reached. Mark correction to flag this record.'
    );
    await expect(last.getByTestId('read-recovery-guidance')).toHaveText(
        'Retry attempt limit reached. Mark correction to flag this record.'
    );
    await last.getByRole('button', { name: 'Mark correction', exact: true }).click();
    await expect(f.getByTestId('last-recovery-guidance')).toHaveText(
        'Retry attempt limit reached. Correction already marked.'
    );
    await expect(last.getByRole('button', { name: 'Mark correction', exact: true })).toBeDisabled();
    await expect(last.getByRole('button', { name: 'Retry', exact: true })).toBeDisabled();
    await page.reload();
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('error');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await input.fill(codes[0]);
    await input.press('Enter');
    await page.clock.fastForward(200);
    await f.getByRole('combobox', { name: 'Resolver fault' }).focus();
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Resume', exact: true }).click();
    for (let i = 0; i < 8; i++) {
        await input.fill(codes[1]);
        await input.press('Enter');
    }
    await f.getByText('Ordered capture evidence', { exact: true }).click();
    const failed = f.getByTestId('read-record').first();
    await expect(f.getByTestId('last-recovery-guidance')).toHaveText(
        'Wait for the result, or cancel this pending read.'
    );
    await expect(
        f.getByTestId('read-record').last().getByRole('button', { name: 'Cancel', exact: true })
    ).toBeEnabled();
    await expect(failed).toContainText('Pending queue full');
    await expect(failed.getByRole('button', { name: 'Retry', exact: true })).toBeDisabled();
    await f.getByTestId('read-record').last().getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(failed.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
    await failed.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(failed).toContainText('attempt 2');
    await expect(f.getByTestId('read-record')).toHaveCount(9);
});

for (const viewport of [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 480 },
]) {
    for (const textScale of [1, 1.25]) {
        test(`manager proof has readable controls, scroll access and no overflow ${viewport.width}x${viewport.height} text ${textScale}`, async ({
            page,
        }, info) => {
            await page.setViewportSize(viewport);
            const f = await open(page);
            const fonts = await scaleScannerProof(f, textScale);
            const controls = fonts.filter((entry) => ['BUTTON', 'INPUT', 'SELECT', 'LABEL'].includes(entry.tag));
            expect(controls.length).toBeGreaterThan(0);
            for (const font of fonts)
                expect(font.after, `${font.tag} ${font.text}`).toBeCloseTo(font.before * textScale, 3);
            for (const control of controls.filter((entry) => entry.tag === 'BUTTON' && entry.width > 0)) {
                expect(control.width).toBeGreaterThanOrEqual(44);
                expect(control.height).toBeGreaterThanOrEqual(44);
            }
            await info.attach('computed-text-scaling', {
                body: JSON.stringify({ textScale, fonts }, null, 2),
                contentType: 'application/json',
            });
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await scan(page, codes[0]);
            await expect(f.getByTestId('last-outcome')).toContainText('resolved');
            await f.getByText('Ordered capture evidence', { exact: true }).click();
            const lateControls = await f
                .locator('main button, main input, main select')
                .evaluateAll((nodes) =>
                    nodes.map((node) => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize) }))
                );
            for (const control of lateControls)
                expect(control.size, `post-capture ${control.text}`).toBeCloseTo(16 * textScale, 3);
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
}

test('same-input command cancels pending epoch and immediately captures next scan without a tap', async ({ page }) => {
    await page.clock.install();
    const f = await open(page);
    await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('slow');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await scan(page, codes[0]);
    await scan(page, 'inventory-action:v1:show-actions');
    await expect(state(f)).toHaveText('ready');
    await expect(f.getByRole('region', { name: 'Capture session' })).toContainText('Session 2');
    await scan(page, codes[1]);
    await page.clock.fastForward(6000);
    await history(f);
    await expect(f.getByTestId('read-record').first()).toContainText('cancelled');
    await expect(f.getByTestId('read-record').last()).toContainText('resolved');
    await expect(f.getByTestId('read-record').last()).toContainText(codes[1]);
});
for (const interrupted of ['hidden', 'unfocused-document', 'dialog'] as const)
    test(`live ${interrupted} context refuses a command even before lifecycle pause fires`, async ({ page }) => {
        const f = await open(page);
        await f.getByRole('button', { name: 'Start', exact: true }).click();
        await page.keyboard.type('inventory-action:v1:show-actions');
        await f.getByRole('textbox', { name: 'Synthetic scan input', exact: true }).evaluate((input, interrupted) => {
            if (interrupted === 'hidden')
                Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            if (interrupted === 'unfocused-document') document.hasFocus = () => false;
            if (interrupted === 'dialog') {
                const dialog = document.createElement('dialog');
                dialog.setAttribute('open', '');
                document.body.appendChild(dialog);
            }
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        }, interrupted);
        await expect(state(f)).toHaveText('paused');
        await expect(f.getByRole('region', { name: 'Capture session' })).toContainText('Session 1');
        await expect(f.getByTestId('counters')).toContainText('Rejected 1');
        await history(f);
        await expect(f.getByTestId('action-history')).not.toContainText('show-actions');
    });
