/** Component and composed-manager checks for the app's shared tag catalog. */
import { expect, test } from '@playwright/test';

test('grouped catalog keeps independent tag states, Find, and selected-only in one list', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-searchtagcatalog--full&viewMode=story');
    const catalog = page.getByRole('region', { name: 'Tag catalog' });
    await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
    await catalog.getByRole('radio', { name: 'Include Camera equipment' }).click();
    await expect(catalog.getByRole('radiogroup', { name: 'Filter Camera equipment' })).toHaveAttribute(
        'data-state',
        'include'
    );
    await expect(catalog.getByRole('radiogroup', { name: 'Filter Needs repair' })).toHaveAttribute(
        'data-state',
        'exclude'
    );
    await page.getByRole('switch', { name: 'Show selected only (3)' }).check();
    await expect(catalog.getByRole('radiogroup')).toHaveCount(3);
    await page.getByRole('searchbox', { name: 'Find a tag' }).fill('Workflow / Needs repair');
    await expect(catalog.getByRole('radiogroup')).toHaveCount(1);
    await page.getByRole('switch', { name: 'Show selected only (3)' }).uncheck();
    await expect(catalog.getByRole('radiogroup')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Find a tag' }).fill('');
    await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
});

for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 900 },
]) {
    test(`catalog and switch stay compact at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto('/?path=/story/ui-searchtagcatalog--full');
        const preview = page.frameLocator('#storybook-preview-iframe');
        const catalog = preview.getByRole('region', { name: 'Tag catalog' });
        await expect(catalog.getByRole('radiogroup')).toHaveCount(19);
        const geometry = await catalog.evaluate((element) => {
            const pill = element.querySelector('.tri-state-rail-compact')?.getBoundingClientRect();
            const row = element.querySelector('.search-tag-row')?.getBoundingClientRect();
            const track = element.parentElement?.querySelector('.selected-tags-switch-track')?.getBoundingClientRect();
            return {
                pill: { width: pill?.width, height: pill?.height },
                rowHeight: row?.height,
                track: { width: track?.width, height: track?.height },
            };
        });
        expect(geometry.pill).toEqual({ width: 162, height: 29 });
        expect(geometry.rowHeight).toBeGreaterThanOrEqual(48);
        expect(geometry.rowHeight).toBeLessThanOrEqual(52);
        expect(geometry.track).toEqual({ width: 35, height: 22 });
        const toggle = preview.getByRole('switch', { name: 'Show selected only (2)' });
        const readThumb = () =>
            toggle.evaluate((input) => {
                const track = input.nextElementSibling!;
                const style = getComputedStyle(track);
                const thumb = getComputedStyle(track, '::before');
                return {
                    width: parseFloat(thumb.width),
                    height: parseFloat(thumb.height),
                    travel: new DOMMatrix(thumb.transform === 'none' ? undefined : thumb.transform).m41,
                    inset: parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
                    focus: style.outlineStyle,
                };
            });
        await page.waitForTimeout(160);
        const off = await readThumb();
        expect(off).toMatchObject({ width: 14, height: 14, travel: 0, inset: 2 });
        await toggle.check();
        await page.waitForTimeout(160);
        await expect.poll(async () => (await readThumb()).travel).toBe(17);
        const on = await readThumb();
        expect(35 - on.inset - on.travel - on.width).toBe(2);
        await preview.getByRole('searchbox', { name: 'Find a tag' }).focus();
        await page.keyboard.press('Shift+Tab');
        await expect(toggle).toBeFocused();
        await expect.poll(async () => (await readThumb()).focus).toBe('solid');
        await toggle.uncheck();
        const find = preview.getByRole('searchbox', { name: 'Find a tag' });
        const before = await find.boundingBox();
        const scrolling = await catalog.evaluate((element) => {
            const geometry = { height: element.clientHeight, content: element.scrollHeight };
            element.scrollTop = element.scrollHeight;
            return geometry;
        });
        expect(scrolling.height).toBeLessThan(scrolling.content);
        expect(await find.boundingBox()).toEqual(before);
        await catalog.evaluate((element) => {
            element.scrollTop = 0;
        });
        for (const state of ['Include', 'No filter for', 'Exclude']) {
            await catalog.getByRole('radio', { name: `${state} Camera equipment`, exact: true }).click();
            await page.waitForTimeout(300);
            const alignment = await catalog
                .getByRole('radiogroup', { name: 'Filter Camera equipment' })
                .evaluate((rail) => {
                    const center = (rect: DOMRect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                    const label = rail.querySelector('input:checked')?.parentElement;
                    const text = label?.querySelector('span')?.getBoundingClientRect();
                    const hit = label?.getBoundingClientRect();
                    const handle = rail.querySelector('.tri-state-handle')?.getBoundingClientRect();
                    if (!text || !hit || !handle) throw new Error('Missing control geometry');
                    return {
                        text: center(text),
                        hit: center(hit),
                        handle: center(handle),
                        overlaps:
                            handle.left <= text.left &&
                            handle.right >= text.right &&
                            handle.top <= text.top &&
                            handle.bottom >= text.bottom,
                    };
                });
            expect(Math.abs(alignment.text.x - alignment.hit.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(alignment.text.y - alignment.hit.y)).toBeLessThanOrEqual(1);
            expect(Math.abs(alignment.text.x - alignment.handle.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(alignment.text.y - alignment.handle.y)).toBeLessThanOrEqual(1);
            expect(alignment.overlaps).toBe(true);
        }
        await page.screenshot({ path: testInfo.outputPath(`catalog-${viewport.width}.png`) });
    });
}
