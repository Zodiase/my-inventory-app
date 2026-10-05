import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
const views = [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 480 },
];
for (const surface of ['manager', 'composition'])
    for (const story of ['many-tags', 'empty', 'selected-only'])
        for (const view of views)
            for (const scale of [1, 1.25]) {
                test(`compact proof ${surface} ${story} ${view.width}x${view.height} text${scale}`, async ({
                    page,
                }, info) => {
                    await page.setViewportSize(view);
                    await page.goto(
                        surface === 'manager'
                            ? `/?path=/story/prototypes-compactfilterproof--${story}`
                            : `/iframe.html?id=prototypes-compactfilterproof--${story}&viewMode=story`
                    );
                    if (surface === 'manager' && view.width > 600)
                        await page.getByRole('button', { name: 'Enter full screen', exact: true }).click();
                    const f = surface === 'manager' ? page.frameLocator('#storybook-preview-iframe') : page;
                    await f.getByRole('button', { name: 'Filters', exact: true }).click();
                    const sheet = f.getByRole('dialog', { name: 'Filters' });
                    await expect(sheet).toBeVisible();
                    await expect(sheet).toHaveAttribute('data-layout-ready', 'true');
                    if (scale !== 1)
                        await f.locator('body').evaluate((body, factor) => {
                            const els = [...body.querySelectorAll<HTMLElement>('*')].filter(
                                (el) =>
                                    [...el.childNodes].some(
                                        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
                                    ) || el.matches('input[type=search], input:not([type]), textarea, select')
                            );
                            const sizes = els.map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
                            for (const { el, size } of sizes) el.style.fontSize = `${size * factor}px`;
                        }, scale);
                    await expect
                        .poll(async () => sheet.evaluate((el) => el.querySelector('.search-tag-list')!.clientHeight))
                        .toBeGreaterThan(0);
                    await sheet.evaluate(
                        () =>
                            new Promise<void>((resolve) =>
                                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                            )
                    );
                    const hitTargets = sheet.locator(
                        'button, .selected-tags-switch, .search-tag-find, .tri-state-position'
                    );
                    for (const target of await hitTargets.all()) {
                        if (await target.isVisible())
                            expect(
                                await target.evaluate((el) => el.getBoundingClientRect().height)
                            ).toBeGreaterThanOrEqual(44);
                    }
                    for (const row of await sheet.locator('.search-tag-row').all()) {
                        expect(
                            await row.evaluate((el) => {
                                const r = el.getBoundingClientRect();
                                const rail = el.querySelector('.tri-state-rail')!.getBoundingClientRect();
                                return Math.abs(r.y + r.height / 2 - rail.y - rail.height / 2);
                            })
                        ).toBeLessThanOrEqual(1);
                    }
                    const geometry = await sheet.evaluate((el) => {
                        const list = el.querySelector('.search-tag-list')!;
                        const bounds = el.getBoundingClientRect();
                        const lb = list.getBoundingClientRect();
                        const owners = [el, list, ...el.querySelectorAll('*')].filter(
                            (n, i, a) =>
                                a.indexOf(n) === i &&
                                ['auto', 'scroll'].includes(getComputedStyle(n).overflowY) &&
                                n.scrollHeight > n.clientHeight + 1
                        );
                        const rows = [...el.querySelectorAll('.search-tag-row')].filter((n) => {
                            const r = n.getBoundingClientRect();
                            return r.top >= lb.top && r.bottom <= Math.min(lb.bottom, bounds.bottom);
                        });
                        return {
                            controls: [...el.querySelectorAll('.search-tag-row')].slice(0, 4).map((row) => {
                                const rect = (node: Element) => {
                                    const r = node.getBoundingClientRect();
                                    return { width: r.width, height: r.height };
                                };
                                return {
                                    row: rect(row),
                                    rail: rect(row.querySelector('.tri-state-rail')!),
                                    handle: rect(row.querySelector('.tri-state-handle')!),
                                    hit: rect(row.querySelector('.tri-state-position')!),
                                };
                            }),
                            height: list.clientHeight,
                            owners: owners.length,
                            completeRows: rows.length,
                            sheetBottom: bounds.bottom,
                            viewport: innerHeight,
                            viewportWidth: innerWidth,
                            sheet: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
                            header: el.querySelector('.compact-proof-summary')!.getBoundingClientRect().height,
                            catalogHeader: el.querySelector('.search-tag-catalog-head')!.getBoundingClientRect().height,
                            find: el.querySelector('.search-tag-find')!.getBoundingClientRect().height,
                            width: el.scrollWidth,
                            clientWidth: el.clientWidth,
                        };
                    });
                    expect(geometry.owners).toBeLessThanOrEqual(1);
                    expect(geometry.width).toBeLessThanOrEqual(geometry.clientWidth + 1);
                    expect(geometry.sheetBottom).toBeLessThanOrEqual(geometry.viewport - 7);
                    if (surface === 'composition' && story === 'many-tags' && view.height === 480 && scale === 1) {
                        expect(geometry.height).toBeGreaterThanOrEqual(200);
                        expect(geometry.completeRows).toBeGreaterThanOrEqual(3);
                    }
                    await writeFile(
                        info.outputPath('geometry.json'),
                        JSON.stringify({ browser: view, surface, scale, ...geometry }, null, 2)
                    );
                    await info.attach('geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
                    await page.screenshot({ path: info.outputPath('manager.png') });
                    if (story === 'many-tags') {
                        const find = f.getByRole('searchbox', { name: 'Find a tag' });
                        await find.fill('Camera');
                        const name = 'Camera equipment with a long descriptive name';
                        await f.getByRole('radio', { name: 'Include ' + name, exact: true }).check();
                        await f.getByRole('radio', { name: 'Exclude ' + name, exact: true }).check();
                        await f.getByRole('radio', { name: 'Exclude ' + name, exact: true }).press('ArrowLeft');
                        await expect(
                            f.getByRole('radio', { name: 'No filter for ' + name, exact: true })
                        ).toBeChecked();
                        await f.getByRole('radio', { name: 'No filter for ' + name, exact: true }).press('ArrowRight');
                        await expect(sheet).toBeVisible();
                        await f.getByRole('switch').check();
                        await expect(f.getByRole('radiogroup', { name: 'Filter ' + name, exact: true })).toBeVisible();
                        await find.fill('missing_xyz');
                        await expect(f.getByText('No matching tags.', { exact: false })).toBeVisible();
                        await f.getByRole('button', { name: 'Clear tag search' }).click();
                        await f.getByRole('button', { name: 'Scope: Rack A' }).click();
                        await f.getByRole('button', { name: 'Home', exact: true }).click();
                        await expect(f.getByRole('button', { name: 'Scope: Home' })).toBeVisible();
                        await f.getByRole('button', { name: 'Type: All types' }).click();
                        await f.getByRole('button', { name: 'Containers', exact: true }).click();
                        await expect(f.getByRole('button', { name: 'Type: Containers' })).toBeVisible();
                        await expect(f.getByRole('textbox', { name: 'Inventory query' })).toHaveValue('storage');
                        await expect(f.getByRole('radio', { name: 'Exclude ' + name, exact: true })).toBeChecked();
                    }
                    await page.keyboard.press('Escape');
                    await expect(sheet).not.toBeVisible();
                    await expect(f.getByRole('button', { name: 'Filters', exact: true })).toBeFocused();
                });
            }

for (const scale of [1, 1.25])
    test(`one-owner fallback composition390x240 text${scale}`, async ({ page }, info) => {
        await page.setViewportSize({ width: 390, height: 240 });
        await page.goto('/iframe.html?id=prototypes-compactfilterproof--many-tags&viewMode=story');
        await page.getByRole('button', { name: 'Filters', exact: true }).click();
        const sheet = page.getByRole('dialog', { name: 'Filters' });
        await expect(sheet).toHaveAttribute('data-layout-ready', 'true');
        if (scale !== 1)
            await sheet.evaluate((el, factor) => {
                const els = [...el.querySelectorAll<HTMLElement>('*')].filter(
                    (n) =>
                        [...n.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && c.textContent?.trim()) ||
                        n.matches('input[type=search]')
                );
                const sizes = els.map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
                for (const { el, size } of sizes) el.style.fontSize = `${size * factor}px`;
            }, scale);
        await expect(sheet).toHaveClass(/compact-proof-whole-scroll/);
        expect(await sheet.evaluate((el) => getComputedStyle(el.querySelector('.search-tag-list')!).overflowY)).toBe(
            'visible'
        );
        await page.getByRole('radio', { name: 'Exclude Hardware part 23', exact: true }).scrollIntoViewIfNeeded();
        await page.getByRole('radio', { name: 'Exclude Hardware part 23', exact: true }).press('Space');
        await expect(page.getByRole('radio', { name: 'Exclude Hardware part 23', exact: true })).toBeChecked();
        await page.screenshot({ path: info.outputPath('fallback-end.png') });
        await page.getByRole('button', { name: 'Close filters' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('fallback-header.png') });
        await page.getByRole('button', { name: 'Close filters' }).press('Escape');
        await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeFocused();
    });
