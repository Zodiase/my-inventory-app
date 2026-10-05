/** Reviews modal stacking over the real header using visible pixels and hit targets. */
import { expect, test } from '@playwright/test';
const sizes = [
    { width: 1280, height: 800 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 1600, height: 1000 },
    { width: 640, height: 720 },
    { width: 641, height: 720 },
    { width: 390, height: 240 },
];
for (const viewport of sizes) {
    test(`modal covers app chrome and recovers at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.setViewportSize(viewport);
        await page.goto('/iframe.html?id=ui-itemdialog--in-app-shell&viewMode=story');
        const trigger = page.getByRole('button', { name: 'Create Item', exact: true });
        await trigger.focus();
        await trigger.press('Enter');
        const dialog = page.getByRole('dialog', { name: 'Create New Item dialog' });
        await expect(dialog).toBeVisible();
        await dialog.evaluate(async (el) => {
            await Promise.all(el.getAnimations().map((a) => a.finished));
        });
        const close = dialog.getByRole('button', { name: 'Close Create New Item dialog' });
        const title = dialog.getByRole('heading', { name: 'Create New Item' });
        for (const control of [title, close]) {
            await expect(control).toBeInViewport();
            expect(
                await control.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                })
            ).toBe(true);
        }
        expect(
            await page.locator('.app-shell-header').evaluate((el) => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(28, r.y + 20);
                return !el.contains(hit);
            })
        ).toBe(true);
        await page.screenshot({ path: info.outputPath('modal-open.png'), fullPage: true });
        const name = dialog.getByPlaceholder('Enter item name', { exact: true });
        await name.fill('Unsaved fixture');
        await expect(name).toBeFocused();
        const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
        await cancel.focus();
        await expect(cancel).toBeInViewport();
        const scroll = await page
            .locator('.item-dialog-content')
            .evaluate((el) => ({ scroll: el.scrollTop, client: el.clientHeight, total: el.scrollHeight }));
        if (viewport.height === 240) expect(scroll.scroll).toBeGreaterThan(0);
        expect(
            await page.evaluate(() => ({
                width: document.documentElement.scrollWidth,
                viewport: innerWidth,
                scroll: document.scrollingElement?.scrollTop,
            }))
        ).toEqual({ width: viewport.width, viewport: viewport.width, scroll: 0 });
        await cancel.click();
        await expect(dialog).toHaveCount(0);
        await expect
            .poll(async () =>
                trigger.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                })
            )
            .toBe(true);
        await expect(trigger).toBeFocused();
        await trigger.focus();
        await trigger.press('Enter');
        await name.focus();
        await expect(name).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect
            .poll(async () =>
                trigger.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                })
            )
            .toBe(true);
        await expect(trigger).toBeFocused();
        await trigger.focus();
        await trigger.press('Enter');
        await close.click();
        await expect(dialog).toHaveCount(0);
        await expect
            .poll(async () =>
                trigger.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                })
            )
            .toBe(true);
        await expect(trigger).toBeFocused();
        if (viewport.width === 1280) {
            await trigger.press('Enter');
            await expect(dialog).toBeVisible();
            await page.evaluate(async () => {
                await Promise.all(document.getAnimations().map((a) => a.finished));
            });
            await page.mouse.click(20, 100);
            await expect(dialog).toHaveCount(0);
            await expect(trigger).toBeFocused();
        }
        expect(errors).toEqual([]);
    });
}
test('modal opens and closes in full Storybook manager', async ({ page }) => {
    await page.goto('/?path=/story/ui-itemdialog--in-app-shell');
    const frame = page.frameLocator('#storybook-preview-iframe');
    const trigger = frame.getByRole('button', { name: 'Create Item', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    await expect(frame.getByRole('dialog')).toBeVisible();
    await frame.getByRole('button', { name: 'Close Create New Item dialog' }).click();
    await expect(frame.getByRole('dialog')).toHaveCount(0);
    await expect
        .poll(async () =>
            trigger.evaluate((el) => {
                const r = el.getBoundingClientRect();
                return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            })
        )
        .toBe(true);
    await expect(trigger).toBeFocused();
});
