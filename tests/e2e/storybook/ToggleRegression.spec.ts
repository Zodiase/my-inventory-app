import { expect, test, type FrameLocator } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const name = 'Camera equipment with a long descriptive name';
const radio = (frame: FrameLocator, state: string) =>
    frame.getByRole('radio', {
        name: `${state === 'neutral' ? 'No filter for' : state === 'include' ? 'Include' : 'Exclude'} ${name}`,
        exact: true,
    });

for (const viewport of [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 480 },
]) {
    test(`composed toggle keeps independent hit areas and reachable filters ${viewport.width}x${viewport.height}`, async ({
        page,
    }, info) => {
        await page.setViewportSize(viewport);
        await page.goto('/?path=/story/ui-searchpagelayout--toggle-regression');
        const frame = page.frameLocator('#storybook-preview-iframe');
        const banner = frame.getByRole('search', { name: 'Inventory search' });
        await expect(banner).toBeVisible();
        const opener = banner.getByRole('button', { name: /^(Tags:|Filters:|Scope: Rack A;)/u });
        await opener.click();
        const menu = frame.getByRole('dialog', { name: 'Search controls' });
        const find = menu.getByRole('searchbox', { name: 'Find a tag' });
        await expect(find).toBeVisible();
        await find.fill('Camera equipment');
        const rail = frame.getByRole('radiogroup', { name: `Filter ${name}`, exact: true });
        await expect(rail).toBeVisible();
        const wrapping = await menu.getByText(name, { exact: true }).evaluate((element) => {
            const text = element.getBoundingClientRect();
            const row = element.closest('.search-tag-row')!;
            const bounds = row.getBoundingClientRect();
            const control = row.querySelector('.tri-state-rail')!.getBoundingClientRect();
            const list = element.closest('.search-tag-list')!.getBoundingClientRect();
            const hits = [...row.querySelectorAll('.tri-state-position')].map((hit) => hit.getBoundingClientRect());
            return {
                whiteSpace: getComputedStyle(element).whiteSpace,
                height: text.height,
                fullyVisible: text.top >= list.top && text.bottom <= list.bottom,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                gap: control.left - text.right,
                centered: Math.abs(control.y + control.height / 2 - (bounds.y + bounds.height / 2)),
                clearance: Math.min(...hits.flatMap((hit) => [hit.top - bounds.top, bounds.bottom - hit.bottom])),
            };
        });
        expect(wrapping.whiteSpace).toBe('normal');
        expect(wrapping.fullyVisible).toBe(true);
        expect(wrapping.height).toBeGreaterThanOrEqual(40);
        expect(wrapping.scrollWidth).toBeLessThanOrEqual(wrapping.clientWidth + 1);
        expect(wrapping.gap).toBeGreaterThanOrEqual(7);
        expect(wrapping.centered).toBeLessThanOrEqual(1);
        expect(wrapping.clearance).toBeGreaterThanOrEqual(2);
        await info.attach('full-name-wrap-and-row-clearance', {
            body: JSON.stringify(wrapping),
            contentType: 'application/json',
        });
        const geometry = await rail.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const labels = [...el.querySelectorAll('label')].map((e) => {
                const b = e.getBoundingClientRect();
                return { left: b.left, right: b.right, width: b.width, height: b.height };
            });
            const h = el.querySelector('.tri-state-handle')!.getBoundingClientRect();
            return { rail: { width: r.width, height: r.height }, thumb: { width: h.width, height: h.height }, labels };
        });
        await info.attach('characterization-not-design-approval', {
            body: JSON.stringify(geometry),
            contentType: 'application/json',
        });
        expect(geometry.labels).toHaveLength(3);
        for (const [index, label] of geometry.labels.entries()) {
            expect(label.height).toBeGreaterThanOrEqual(44);
            expect(label.width).toBeGreaterThanOrEqual(44);
            if (index > 0) expect(label.left).toBeGreaterThanOrEqual(geometry.labels[index - 1].right - 1);
        }
        for (const state of ['include', 'exclude', 'neutral']) {
            await radio(frame, state).click();
            await expect(radio(frame, state)).toBeChecked();

            expect(await frame.locator('html').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(
                1
            );
        }
        await find.fill('');
        await expect(frame.getByRole('radio', { name: 'Include Tools', exact: true })).toBeChecked();
        const selected = menu.getByRole('switch', { name: /Show selected only/u });
        await selected.check();
        await expect(frame.getByRole('radiogroup', { name: `Filter ${name}`, exact: true })).toHaveCount(0);
        await expect(frame.getByRole('radio', { name: 'Include Tools', exact: true })).toBeChecked();
        await selected.uncheck();
        await menu.getByRole('radio', { name: 'Exclude Hardware part 19', exact: true }).scrollIntoViewIfNeeded();
        await expect(find).toBeVisible();
        const rowRects = await menu.locator('.search-tag-row').evaluateAll((es) =>
            es.map((e) => {
                const r = e.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom };
            })
        );
        for (let i = 1; i < rowRects.length; i++)
            expect(rowRects[i].top).toBeGreaterThanOrEqual(rowRects[i - 1].bottom - 1);
        await find.fill('Camera equipment');
        await radio(frame, 'neutral').focus();
        await expect(radio(frame, 'neutral')).toBeFocused();

        await page.screenshot({ path: info.outputPath('composed-menu.png') });
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(opener).toBeFocused();
        await expect(frame.getByTestId('unrelated-action')).toBeVisible();
    });
}

test('six transitions and rapid reversals retain one contained thumb and stationary labels', async ({ page }, info) => {
    await page.goto('/iframe.html?id=ui-searchtagcatalog--full&viewMode=story');
    const rail = page.getByRole('radiogroup', { name: 'Filter Camera equipment', exact: true });
    await expect(rail).toBeVisible();
    const control = (state: string) =>
        page.getByRole('radio', {
            name: `${state === 'neutral' ? 'No filter for' : state === 'include' ? 'Include' : 'Exclude'} Camera equipment`,
            exact: true,
        });
    const results = [];
    for (const [from, to] of [
        ['include', 'neutral'],
        ['neutral', 'exclude'],
        ['exclude', 'include'],
        ['include', 'exclude'],
        ['exclude', 'neutral'],
        ['neutral', 'include'],
    ]) {
        await control(from).click();
        await page.waitForTimeout(300);
        const endpoints = await rail.evaluate((el, target) => {
            const r = el.getBoundingClientRect(),
                h = el.querySelector('.tri-state-handle')!.getBoundingClientRect(),
                label = el.querySelector(`label.${target}`)!.getBoundingClientRect();
            return { start: h.x - r.x, end: (label.left + label.right - h.width) / 2 - r.x };
        }, to);
        const sampling = rail.evaluate(async (el) => {
            const labels = () =>
                [...el.querySelectorAll('.tri-state-position > span')].map((e) => {
                    const r = e.getBoundingClientRect(),
                        p = el.getBoundingClientRect();
                    return { x: r.x - p.x, y: r.y - p.y };
                });
            const initial = labels(),
                samples = [];
            const start = performance.now();
            while (performance.now() - start < 500) {
                await new Promise(requestAnimationFrame);
                const r = el.getBoundingClientRect(),
                    h = el.querySelector('.tri-state-handle')!.getBoundingClientRect();
                samples.push({
                    x: h.x - r.x,
                    t: performance.now() - start,
                    timestamp: performance.now(),
                    requestedState: el.getAttribute('data-state'),
                    y: h.y - r.y,
                    inside:
                        h.left >= r.left - 1 &&
                        h.right <= r.right + 1 &&
                        h.top >= r.top - 1 &&
                        h.bottom <= r.bottom + 1,
                    count: el.querySelectorAll('.tri-state-handle').length,
                    labels: labels(),
                });
            }
            return { initial, samples };
        });
        await control(to).click();
        const result = await sampling;
        results.push({ from, to, endpoints, ...result });
        const progress = result.samples.map(
            (sample) => (sample.x - endpoints.start) / (endpoints.end - endpoints.start)
        );
        expect(
            progress.some((value) => value > 0.01 && value < 0.99),
            'transition must expose intermediate horizontal progress'
        ).toBe(true);
        for (let i = 1; i < progress.length; i++) {
            expect(result.samples[i].t).toBeGreaterThan(result.samples[i - 1].t);
            expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] - 0.02);
        }
        expect(Math.abs(result.samples.at(-1)!.x - endpoints.end)).toBeLessThanOrEqual(1);
        expect(result.samples.at(-1)!.requestedState).toBe(to);
        expect(result.samples.every((s) => s.inside && s.count === 1)).toBe(true);
        expect(
            Math.max(...result.samples.map((s) => s.y)) - Math.min(...result.samples.map((s) => s.y))
        ).toBeLessThanOrEqual(1);
        for (const sample of result.samples) expect(sample.labels).toEqual(result.initial);
        await expect(control(to)).toBeChecked();
    }
    const rapidSampling = rail.evaluate(async (el) => {
        const samples = [];
        const start = performance.now();
        while (performance.now() - start < 900) {
            await new Promise(requestAnimationFrame);
            const r = el.getBoundingClientRect(),
                h = el.querySelector('.tri-state-handle')!.getBoundingClientRect();
            samples.push({
                x: h.x - r.x,
                t: performance.now() - start,
                timestamp: performance.now(),
                requestedState: el.getAttribute('data-state'),
                y: h.y - r.y,
                inside:
                    h.left >= r.left - 1 && h.right <= r.right + 1 && h.top >= r.top - 1 && h.bottom <= r.bottom + 1,
                count: el.querySelectorAll('.tri-state-handle').length,
            });
        }
        return samples;
    });
    const requests = [];
    for (const state of ['exclude', 'include', 'neutral', 'exclude', 'include']) {
        requests.push({ state, timestamp: await page.evaluate(() => performance.now()) });
        await control(state).click();
        await page.waitForTimeout(45);
    }
    const rapid = await rapidSampling;
    expect(rapid.every((s) => s.inside && s.count === 1)).toBe(true);
    expect(new Set(rapid.map((s) => s.requestedState))).toEqual(new Set(['include', 'neutral', 'exclude']));
    expect(Math.max(...rapid.map((s) => s.x)) - Math.min(...rapid.map((s) => s.x))).toBeGreaterThan(1);
    for (let i = 1; i < rapid.length; i++) expect(rapid[i].t).toBeGreaterThan(rapid[i - 1].t);
    expect(rapid.at(-1)!.requestedState).toBe('include');
    expect(Math.max(...rapid.map((s) => s.y)) - Math.min(...rapid.map((s) => s.y))).toBeLessThanOrEqual(1);
    await writeFile(info.outputPath('rapid-reversal.json'), JSON.stringify({ requests, samples: rapid }, null, 2));
    await writeFile(info.outputPath('six-transitions.json'), JSON.stringify(results, null, 2));
    await info.attach('rapid-reversal-samples', {
        body: JSON.stringify({ requests, samples: rapid }),
        contentType: 'application/json',
    });
    await expect(control('include')).toBeChecked();
    await control('include').click();
    await expect(control('include')).toBeChecked();
    await expect
        .poll(() =>
            rail.evaluate((el) => {
                const h = el.querySelector('.tri-state-handle')!.getBoundingClientRect(),
                    l = el.querySelector('label.include')!.getBoundingClientRect();
                return Math.abs((h.left + h.right - l.left - l.right) / 2);
            })
        )
        .toBeLessThanOrEqual(1);
    await info.attach('motion-samples-not-aesthetic-approval', {
        body: JSON.stringify(results),
        contentType: 'application/json',
    });
});

for (const direction of ['ltr', 'rtl']) {
    test(`keyboard and reduced motion preserve selected-state geometry ${direction}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/iframe.html?id=ui-searchtagcatalog--full&viewMode=story');
        await page.locator('html').evaluate((el, dir) => {
            el.setAttribute('dir', dir);
        }, direction);
        const rail = page.getByRole('radiogroup', { name: 'Filter Camera equipment', exact: true });
        const include = page.getByRole('radio', { name: 'Include Camera equipment', exact: true });
        const neutral = page.getByRole('radio', { name: 'No filter for Camera equipment', exact: true });
        await include.check();
        await include.focus();
        await page.keyboard.press(direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        await expect(neutral).toBeChecked();
        await expect(neutral).toBeFocused();
        await expect(rail.locator('.tri-state-handle')).toHaveCSS('transition-duration', '0s');
        const alignment = await rail.evaluate((el) => {
            const h = el.querySelector('.tri-state-handle')!.getBoundingClientRect(),
                l = el.querySelector('label.neutral')!.getBoundingClientRect();
            return Math.abs((h.left + h.right - l.left - l.right) / 2);
        });
        expect(alignment).toBeLessThanOrEqual(1);
    });
}

test('real toggle stylesheet order does not change catalog neighbors', async ({ page }, info) => {
    await page.goto('/iframe.html?id=ui-searchtagcatalog--full&viewMode=story');
    await expect(page.getByRole('radiogroup', { name: 'Filter Camera equipment', exact: true })).toBeVisible();
    const measure = () =>
        page.locator('.search-tag-group, .selected-tags-switch-track').evaluateAll((es) =>
            es.map((e) => {
                const s = getComputedStyle(e),
                    r = e.getBoundingClientRect();
                return {
                    class: e.className,
                    border: s.borderWidth,
                    radius: s.borderRadius,
                    width: r.width,
                    height: r.height,
                    padding: s.padding,
                    background: s.backgroundColor,
                };
            })
        );
    const initial = await measure();
    expect(initial.filter((e) => e.class === 'search-tag-group').every((e) => e.border === '0px')).toBe(true);
    for (const position of ['first', 'last']) {
        const count = await page.evaluate((pos) => {
            const styles = [...document.querySelectorAll('style')].filter((s) =>
                s.textContent?.includes('.tri-state-rail {')
            );
            for (const s of styles) {
                if (pos === 'first') document.head.prepend(s);
                else document.head.append(s);
            }
            return styles.length;
        }, position);
        expect(count).toBeGreaterThan(0);
        expect(await measure()).toEqual(initial);
    }
    await info.attach('intended-neighbor-style-comparison', {
        body: JSON.stringify(initial),
        contentType: 'application/json',
    });
});

test('toggle stylesheet keeps intended borders throughout the real composition', async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/iframe.html?id=ui-searchpagelayout--toggle-regression&viewMode=story');
    await page.getByRole('button', { name: /^Tags:/u }).click();
    const selectors =
        '[role="search"] button, [role="search"] a, .search-tag-group, .selected-tags-switch-track, [data-testid="unrelated-action"], .search-applied-chip, button[aria-label^="Actions for "]';
    const measure = () =>
        page.locator(selectors).evaluateAll((es) =>
            es.map((e) => {
                const s = getComputedStyle(e),
                    r = e.getBoundingClientRect();
                return {
                    name: e.getAttribute('aria-label') || e.textContent,
                    border: s.borderWidth,
                    background: s.backgroundColor,
                    padding: s.padding,
                    radius: s.borderRadius,
                    width: r.width,
                    height: r.height,
                };
            })
        );
    await expect(page.getByRole('button', { name: 'Remove include filter for Tools', exact: true })).toHaveCSS(
        'border-width',
        '1px'
    );
    await expect(page.locator('.search-applied-chip')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Actions for Storage item/u })).toHaveCount(3);
    const original = await measure();
    const actions = original.filter((e) => e.name?.startsWith('Actions for Storage item'));
    expect(actions).toHaveLength(3);
    expect(actions.every((e) => e.border === '0px')).toBe(true);
    expect(original.find((e) => e.name === 'Unrelated action')?.border).toBe('0px');
    expect(original.filter((e) => e.name?.includes('Equipment with')).every((e) => e.border === '0px')).toBe(true);
    expect(
        await page.getByRole('link', { name: 'Return to Rack A' }).evaluate((e) => getComputedStyle(e).borderWidth)
    ).toBe('0px');
    expect(await page.getByRole('button', { name: /^Tags:/u }).evaluate((e) => getComputedStyle(e).borderWidth)).toBe(
        '1px'
    );
    for (const order of ['first', 'last']) {
        const count = await page.evaluate((order) => {
            const styles = [...document.querySelectorAll('style')].filter((e) =>
                e.textContent?.includes('.tri-state-rail {')
            );
            for (const e of styles) {
                if (order === 'first') document.head.prepend(e);
                else document.head.append(e);
            }
            return styles.length;
        }, order);
        expect(count).toBeGreaterThan(0);
        expect(await measure()).toEqual(original);
    }
    await writeFile(info.outputPath('composed-neighbor-styles.json'), JSON.stringify(original, null, 2));
    await info.attach('real-composition-style-isolation', {
        body: JSON.stringify(original),
        contentType: 'application/json',
    });
});

test('visiting enlarged and compact proofs does not leak their styles into Search', async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?path=/story/ui-searchpagelayout--toggle-regression');
    const frame = page.frameLocator('#storybook-preview-iframe');
    const banner = frame.getByRole('search', { name: 'Inventory search' });
    await expect(banner).toBeVisible();
    const metrics = () =>
        banner.locator('button, a, input').evaluateAll((es) =>
            es.map((e) => {
                const s = getComputedStyle(e),
                    r = e.getBoundingClientRect();
                return {
                    name: e.getAttribute('aria-label'),
                    border: s.borderWidth,
                    padding: s.padding,
                    radius: s.borderRadius,
                    width: r.width,
                    height: r.height,
                };
            })
        );
    const fresh = await metrics();
    await page.getByRole('button', { name: 'Tri-state Tag Toggle', exact: true }).click();
    await page.locator('a[href$="prototypes-tri-state-tag-toggle--undecided"]').click();
    await expect(frame.getByTestId('tri-state-toggle-proof')).toBeVisible();
    await page.getByRole('button', { name: 'Tri-state Compact Pill', exact: true }).click();
    await page.locator('a[href$="prototypes-tri-state-compact-pill--off"]').click();
    await expect(frame.getByTestId('tri-state-lane-proof')).toBeVisible();
    await page.getByRole('link', { name: 'Toggle Regression', exact: true }).click();
    await expect(banner).toBeVisible();
    expect(await metrics()).toEqual(fresh);
    await info.attach('fresh-versus-proof-visit-order', {
        body: JSON.stringify(fresh),
        contentType: 'application/json',
    });
});
