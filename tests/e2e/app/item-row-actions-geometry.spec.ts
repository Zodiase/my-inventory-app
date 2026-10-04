import { test, expect } from '@playwright/test';
import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

test('integrated geometry, actual touch, identity and return context', async ({ page }, info) => {
    test.setTimeout(90000);
    await page.goto('/items');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    const tag = await createTag(page, { name: 'Verification tools' });
    const home = await createItem(page, { name: 'Verification home', isContainer: true });
    const floor = await createItem(page, {
        name: 'Verification floor',
        isContainer: true,
        containerId: home,
        properties: { childrenPresentation: 'hoist-in-parent' },
    });
    const room = await createItem(page, { name: 'Verification room', isContainer: true, containerId: floor });
    await createItem(page, {
        name: 'Verification long-name portable household tool',
        description: 'An independently seeded representative item with a long description',
        tagIds: [tag],
    });
    await createItem(page, { name: 'Verification short tagged item', tagIds: [tag] });
    await createItem(page, {
        name: 'Verification multiline tagged item with a substantially longer name',
        description: 'Long descriptive content '.repeat(16),
        tagIds: [tag],
    });
    const modelId = 'stack-tower-2col-5tier-v1';
    const stack = await createItem(page, {
        name: 'Verification stack',
        isContainer: true,
        properties: { storageLayout: { modelId, tierCount: 5, positions: ['left', 'right'] } },
    });
    await createItem(page, {
        name: 'Verification top left storage bin with a long name',
        isContainer: true,
        containerId: stack,
        properties: { storagePlacement: { modelId, tier: 1, position: 'left' } },
    });
    await createItem(page, { name: 'Verification unplaced item', containerId: stack });
    for (const [surface, url] of [
        ['ordinary', '/items'],
        ['hoisted', `/container/${home}`],
        ['physical', `/container/${stack}`],
        ['search', '/search?q=Verification&run=1'],
        ['tags', `/tags/${tag}`],
    ]) {
        await page.goto(url);
        const triggers = page.getByRole('button', { name: /^Actions for / });
        await expect(triggers.first()).toBeVisible();
        expect(await page.locator('a button').count()).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (surface === 'ordinary')
            for (const name of ['Filter Add Filters', 'Add Create Item'])
                expect(
                    await page
                        .getByRole('button', { name, exact: true })
                        .evaluate((e) => getComputedStyle(e).borderWidth)
                ).toBe('0px');
        for (const trigger of await triggers.all()) {
            const box = await trigger.boundingBox();
            expect(box?.width).toBe(44);
            expect(box?.height).toBe(44);
            expect(await trigger.evaluate((e) => getComputedStyle(e).borderWidth)).toBe('0px');
            const link = trigger.locator('..').getByRole('link').first();
            const l = await link.boundingBox();
            expect(l?.width).toBeGreaterThan(44);
            expect(l?.height).toBeGreaterThanOrEqual(44);
            if (l && box) expect(l.x + l.width <= box.x + 1 || l.y + l.height <= box.y + 1).toBe(true);
        }
        if (surface === 'search' || surface === 'tags') {
            const bounds = await triggers.evaluateAll((es) =>
                es.map((e) => e.parentElement!.querySelector('a')!.getBoundingClientRect().toJSON())
            );
            for (let i = 0; i < bounds.length; i++)
                for (let j = i + 1; j < bounds.length; j++)
                    expect(
                        bounds[i].right <= bounds[j].left ||
                            bounds[j].right <= bounds[i].left ||
                            bounds[i].bottom <= bounds[j].top ||
                            bounds[j].bottom <= bounds[i].top,
                        `${surface} cards ${i}/${j} overlap`
                    ).toBe(true);
        }
        if (surface === 'physical') {
            const occupied = await page
                .getByRole('link', { name: /Open container Verification top left/ })
                .boundingBox();
            const next = await page.getByRole('row', { name: 'Tier 2', exact: true }).boundingBox();
            expect(occupied!.y + occupied!.height).toBeLessThanOrEqual(next!.y);
        }
        const trigger = triggers.first(),
            label = await trigger.getAttribute('aria-label'),
            before = page.url();
        if (info.project.use.hasTouch) await trigger.tap();
        else await trigger.click();
        expect(page.url()).toBe(before);
        const dialog = page.getByRole('dialog', { name: label! });
        const action = dialog.getByRole('button', { name: 'View Details' });
        await expect(action).toBeFocused();
        const menu = await dialog.boundingBox(),
            viewport = page.viewportSize()!;
        expect(menu!.x).toBeGreaterThanOrEqual(0);
        expect(menu!.y).toBeGreaterThanOrEqual(0);
        expect(menu!.x + menu!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(menu!.y + menu!.height).toBeLessThanOrEqual(viewport.height + 1);
        await page.screenshot({ path: info.outputPath(`${surface}-open.png`) });
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        await expect(dialog).not.toBeVisible();
        if (info.project.use.hasTouch) await trigger.tap();
        else await trigger.click();
        if (info.project.use.hasTouch) await action.tap();
        else await action.click();
        await expect(page).toHaveURL(/\/items\//);
        await expect(page.getByRole('heading').filter({ hasText: label!.replace('Actions for ', '') })).toBeVisible();
        if (surface === 'search') {
            await page.getByRole('link', { name: '← Back to search' }).click();
            await expect(page).toHaveURL(/search\?q=Verification&run=1$/);
        }
    }
});
