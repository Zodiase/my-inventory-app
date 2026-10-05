/** Verifies representative shared portal consumers and higher-priority loading overlay. */
import { expect, test } from '@playwright/test';
for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
]) {
    for (const kind of ['tag', 'delete-container']) {
        test(`${kind} stays above app header at ${viewport.width}`, async ({ page }, info) => {
            await page.setViewportSize(viewport);
            await page.goto(`/iframe.html?id=integration-layerconsumers--${kind}&viewMode=story`);
            const opener = page.getByRole('button', { name: 'Open consumer' });
            await opener.focus();
            await opener.press('Enter');
            const title = page.getByRole('heading', { name: kind === 'tag' ? 'Create New Tag' : 'Delete Container' });
            await expect(title).toBeVisible();
            await page.evaluate(async () => {
                await Promise.all(document.getAnimations().map((a) => a.finished));
            });
            await expect
                .poll(() =>
                    title.evaluate((el) => {
                        const r = el.getBoundingClientRect();
                        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                    })
                )
                .toBe(true);
            expect(
                await page
                    .locator('.app-shell-header')
                    .evaluate((el) => !el.contains(document.elementFromPoint(28, 20)))
            ).toBe(true);
            await page.screenshot({ path: info.outputPath('consumer.png'), fullPage: true });
            await page.getByRole('button', { name: 'Cancel', exact: true }).click();
            await expect(title).toHaveCount(0);
            await expect(opener).toBeFocused();
            await expect
                .poll(() =>
                    opener.evaluate((el) => {
                        const r = el.getBoundingClientRect();
                        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                    })
                )
                .toBe(true);
            await opener.press('Enter');
            await expect(title).toBeVisible();
            await page.evaluate(async () => {
                await Promise.all(document.getAnimations().map((a) => a.finished));
            });
            await page.getByRole('button', { name: 'Cancel', exact: true }).focus();
            await page.keyboard.press('Escape');
            await expect(title).toHaveCount(0);
            await expect(opener).toBeFocused();
        });
    }
}
test('loading overlay retains priority above ordinary layers', async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/iframe.html?id=integration-layerconsumers--loading-priority&viewMode=story');
    await page.getByRole('button', { name: 'Open consumer' }).click();
    const status = page.locator('[role="status"][aria-label="Loading priority"]');
    await expect(status).toBeVisible();
    await expect.poll(() => status.evaluate((el) => getComputedStyle(el.parentElement!).opacity)).toBe('1');
    const levels = await status.evaluate((el) => {
        const maxStack = (node: Element | null): number => {
            let max = 0;
            for (let current = node; current; current = current.parentElement) {
                max = Math.max(max, Number(getComputedStyle(current).zIndex) || 0);
            }
            return max;
        };
        const heading = Array.from(document.querySelectorAll('h3')).find(
            (node) => node.textContent === 'Delete Container'
        );
        return { loading: maxStack(el), dialog: maxStack(heading ?? null) };
    });
    expect(levels.dialog).toBeGreaterThan(30);
    expect(levels.loading).toBeGreaterThan(levels.dialog);
    expect(
        await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        })
    ).toBe(false);
    await page.screenshot({ path: info.outputPath('loading-priority.png'), fullPage: true });
});

for (const width of [1280, 390]) {
    test(`context menu keeps theme stacking and dismissal at ${width}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/iframe.html?id=integration-layerconsumers--context-menu&viewMode=story');
        const target = page.getByRole('button', { name: 'Hold for actions' });
        const bounds = await target.boundingBox();
        if (!bounds) throw new Error('Missing long-press target');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await expect(page.getByRole('button', { name: 'Inspect fixture' })).toBeVisible();
        await page.mouse.up();
        const action = page.getByRole('button', { name: 'Inspect fixture' });
        await expect
            .poll(() =>
                action.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
                })
            )
            .toBe(true);
        await page.screenshot({ path: info.outputPath('context.png'), fullPage: true });
        await action.focus();
        await page.keyboard.press('Escape');
        await expect(action).toHaveCount(0);
    });
}
