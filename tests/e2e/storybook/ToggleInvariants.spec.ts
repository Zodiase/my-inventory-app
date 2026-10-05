import { expect, test, type Page, type Locator } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const label = 'Camera equipment with a long descriptive name';
const views = [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 480 },
];
const states = ['neutral', 'include', 'exclude', 'focused-neutral'] as const;

async function composed(page: Page, tag = label) {
    await page.goto('/?path=/story/ui-searchpagelayout--toggle-regression');
    const frame = page.frameLocator('#storybook-preview-iframe');
    await frame.getByRole('search', { name: 'Inventory search' }).waitFor();
    await frame.getByRole('button', { name: /^(Tags:|Filters:|Scope: Rack A;)/u }).click();
    await frame.getByRole('searchbox', { name: 'Find a tag' }).fill(tag);
    const rail = frame.getByRole('radiogroup', { name: `Filter ${tag}`, exact: true });
    await rail.waitFor();
    return { frame, rail };
}

// Opt-in, browser-local negative controls; never alter product files or live data.
async function mutant(rail: Locator) {
    const mutation = process.env.TOGGLE_INVARIANT_MUTANT;
    if (!mutation) return;
    await rail.evaluate((el, kind) => {
        if (kind === 'jump') {
            el.addEventListener('change', () => {
                const h = el.querySelector<HTMLElement>('.tri-state-handle')!;
                h.style.transition = 'none';
                h.style.insetInlineStart = '70px';
                void h.offsetWidth;
                queueMicrotask(() => {
                    h.style.removeProperty('transition');
                    h.style.removeProperty('inset-inline-start');
                });
            });
        } else if (kind === 'remount') {
            el.addEventListener('change', () => {
                const h = el.querySelector('.tri-state-handle')!;
                h.replaceWith(h.cloneNode(true));
            });
        } else if (kind === 'text-overflow') {
            for (const e of el.querySelectorAll<HTMLElement>('.tri-state-position > span')) e.style.fontSize = '48px';
        } else throw Error(`Unknown negative control ${kind}`);
    }, mutation);
}

for (const tag of [label, 'Spare']) {
    for (const view of views) {
        for (const textScale of [1, 1.25]) {
            test(`composed relationships and text fit ${view.width}x${view.height} text${textScale} ${tag === label ? 'wrapped' : 'short'}`, async ({
                page,
            }, info) => {
                await page.setViewportSize(view);
                const { frame, rail } = await composed(page, tag);
                const baseFont = await rail
                    .locator('.tri-state-position > span')
                    .first()
                    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
                if (textScale !== 1) {
                    // Text-only enlargement leaves artwork and hit areas unchanged, unlike whole-page zoom.
                    await frame.locator('body').evaluate((body, factor) => {
                        const text = [...body.querySelectorAll<HTMLElement>('*')].filter((el) =>
                            [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
                        );
                        const sizes = text.map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
                        for (const { el, size } of sizes) el.style.fontSize = `${size * factor}px`;
                    }, textScale);
                }
                if (textScale !== 1)
                    expect(
                        await rail
                            .locator('.tri-state-position > span')
                            .first()
                            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
                    ).toBeCloseTo(baseFont * textScale, 1);
                await mutant(rail);
                const measurements = [];
                for (const state of states) {
                    const selectedState = state === 'focused-neutral' ? 'neutral' : state;
                    await rail.locator(`input[value="${selectedState}"]`).check();
                    if (state === 'focused-neutral') {
                        await rail.locator('input[value="neutral"]').focus();
                        await rail.locator('input[value="neutral"]').press('Tab');
                        await rail.locator('input[value="exclude"]').press('Shift+Tab');
                        await expect(rail.locator('input[value="neutral"]')).toBeFocused();
                        await expect(rail).not.toHaveCSS('outline-style', 'none');
                    }
                    await expect
                        .poll(() =>
                            rail.evaluate((el) => el.querySelector('.tri-state-handle')!.getAnimations().length)
                        )
                        .toBe(0);
                    const m = await rail.evaluate((el) => {
                        const r = el.getBoundingClientRect(),
                            h = el.querySelector('.tri-state-handle')!.getBoundingClientRect();
                        const row = el.closest('.search-tag-row')!.getBoundingClientRect();
                        const name = el.closest('.search-tag-row')!.querySelector('.search-tag-identity')!;
                        return {
                            rail: { width: r.width, height: r.height },
                            handle: { width: h.width, height: h.height },
                            centered: Math.abs(h.y + h.height / 2 - r.y - r.height / 2),
                            rowCenter: Math.abs(r.y + r.height / 2 - row.y - row.height / 2),
                            nameFits: name.scrollWidth <= name.clientWidth + 1,
                            labels: [...el.querySelectorAll('.tri-state-position')].map((e) => {
                                const hit = e.getBoundingClientRect(),
                                    text = e.querySelector('span')!.getBoundingClientRect();
                                return {
                                    width: hit.width,
                                    height: hit.height,
                                    fits: text.width <= hit.width && text.height <= hit.height,
                                    font: parseFloat(getComputedStyle(e.querySelector('span')!).fontSize),
                                    center: Math.abs(text.x + text.width / 2 - hit.x - hit.width / 2),
                                    crossCenter: Math.abs(text.y + text.height / 2 - r.y - r.height / 2),
                                };
                            }),
                            selectedCenter: (() => {
                                const l = el
                                    .querySelector(`label.${el.getAttribute('data-state')}`)!
                                    .getBoundingClientRect();
                                return Math.abs(h.x + h.width / 2 - l.x - l.width / 2);
                            })(),
                        };
                    });
                    measurements.push({ state, ...m });
                    // Structural relationships, not an approved 162/29/52/24 pixel golden.
                    expect(m.handle.width).toBeLessThanOrEqual(m.rail.width / 3 + 1);
                    expect(m.handle.height).toBeLessThan(m.rail.height);
                    expect(m.centered).toBeLessThanOrEqual(1);
                    expect(m.rowCenter).toBeLessThanOrEqual(1);
                    expect(m.selectedCenter).toBeLessThanOrEqual(1);
                    expect(m.nameFits).toBe(true);
                    for (const text of m.labels) {
                        expect(text.width).toBeGreaterThanOrEqual(44);
                        expect(text.height).toBeGreaterThanOrEqual(44);
                        expect(text.fits, 'choice text fits its independent target').toBe(true);
                        expect(text.center).toBeLessThanOrEqual(1);
                        expect(text.crossCenter).toBeLessThanOrEqual(2);
                    }
                    await expect(frame.getByRole('button', { name: /^(Tags:|Filters:|Scope: Rack A;)/u })).toHaveCSS(
                        'border-top-width',
                        '1px'
                    );
                    await expect(frame.getByRole('link', { name: 'Return to Rack A' })).toHaveCSS(
                        'border-top-width',
                        '0px'
                    );
                    await expect(frame.getByTestId('unrelated-action')).toHaveCSS('border-top-width', '0px');
                    await expect(frame.getByRole('button', { name: 'Actions for Storage item 01' })).toHaveCSS(
                        'border-top-width',
                        '0px'
                    );
                    await expect(frame.getByRole('button', { name: 'Remove include filter for Tools' })).toHaveCSS(
                        'border-top-width',
                        '1px'
                    );
                }
                const neighbors = await frame
                    .locator('[role="search"] button, [role="search"] a, button[aria-label^="Actions for "]')
                    .evaluateAll((es) =>
                        es.map((el) => {
                            const r = el.getBoundingClientRect();
                            return {
                                name: el.getAttribute('aria-label'),
                                width: r.width,
                                height: r.height,
                                fits: el.scrollWidth <= el.clientWidth + 1,
                            };
                        })
                    );
                for (const n of neighbors.filter(
                    (n) =>
                        n.name?.startsWith('Scope:') ||
                        n.name?.startsWith('Type:') ||
                        n.name?.startsWith('Actions for') ||
                        n.name === 'Return to Rack A'
                )) {
                    expect(n.width).toBeGreaterThanOrEqual(44);
                    expect(n.height).toBeGreaterThanOrEqual(44);
                    expect(n.fits).toBe(true);
                }
                await info.attach('neighbor-target-relationships', {
                    body: JSON.stringify(neighbors),
                    contentType: 'application/json',
                });
                await info.attach('composed-relationships-characterization', {
                    body: JSON.stringify(measurements),
                    contentType: 'application/json',
                });
                await page.screenshot({ path: info.outputPath('composed-text.png') });
            });
        }
    }
}

for (const direction of ['ltr', 'rtl']) {
    test(`CSS-timed in-flight reversals preserve handle identity and destination ${direction}`, async ({
        page,
    }, info) => {
        await page.setViewportSize(views[0]);
        const { frame, rail } = await composed(page);
        await frame.locator('html').evaluate((el, dir) => el.setAttribute('dir', dir), direction);
        await rail.locator('input[value="include"]').check();
        await expect
            .poll(() => rail.evaluate((el) => el.querySelector('.tri-state-handle')!.getAnimations().length))
            .toBe(0);
        await mutant(rail);
        const trace = rail.evaluate(async (el) => {
            const original = el.querySelector('.tri-state-handle')!;
            const style = getComputedStyle(original);
            const duration = parseFloat(style.transitionDuration) * 1000;
            const easing = style.transitionTimingFunction;
            const requests: { state: string; t: number; x: number; afterX?: number; activeBefore: boolean }[] = [];
            const start = performance.now();
            const animationIds = new WeakMap<Animation, number>();
            let nextId = 1;
            const endpoints = new WeakMap<Animation, { fromX: number; toX: number }>();
            const resolveX = (value: string) => {
                // Resolve native calc()/logical endpoints without moving the observed handle.
                const probe = original.cloneNode(true) as HTMLElement;
                probe.style.transition = 'none';
                probe.style.visibility = 'hidden';
                probe.style.insetInlineStart = value;
                el.appendChild(probe);
                const x = probe.getBoundingClientRect().x - el.getBoundingClientRect().x;
                probe.remove();
                return x;
            };
            const animationTiming = () =>
                original.getAnimations().map((a) => {
                    if (!animationIds.has(a)) animationIds.set(a, nextId++);
                    const keyframes = (a.effect as KeyframeEffect).getKeyframes();
                    if (!endpoints.has(a)) {
                        const value = (frame: ComputedKeyframe) => String(frame.left ?? frame.right);
                        endpoints.set(a, {
                            fromX: resolveX(value(keyframes[0])),
                            toX: resolveX(value(keyframes.at(-1)!)),
                        });
                    }
                    return {
                        id: animationIds.get(a),
                        currentTime: a.currentTime,
                        startTime: a.startTime,
                        timelineTime: a.timeline?.currentTime,
                        timing: a.effect!.getComputedTiming(),
                        keyframes,
                        ...endpoints.get(a)!,
                    };
                });
            const ends = [...el.querySelectorAll('label')].map((l) => ({
                state: l.className.split(' ').at(-1)!,
                x:
                    l.getBoundingClientRect().x +
                    (l.getBoundingClientRect().width - original.getBoundingClientRect().width) / 2 -
                    el.getBoundingClientRect().x,
            }));
            const position = () => original.getBoundingClientRect().x - el.getBoundingClientRect().x;
            const listener = (event: Event) => {
                const input = event.target as HTMLInputElement;
                const request = {
                    state: input.value,
                    t: performance.now() - start,
                    x: position(),
                    activeBefore: original.getAnimations().some((a) => a.playState === 'running'),
                    animationsBefore: animationTiming(),
                    afterX: undefined as number | undefined,
                };
                requests.push(request);
                queueMicrotask(() => {
                    request.afterX = position();
                });
            };
            const afterListener = () => {
                // Microtasks may run between native listeners: sample again after the
                // bubbling handlers, including injected mutation and React update.
                const request = requests.at(-1);
                if (request) request.afterX = position();
            };
            el.addEventListener('change', listener, true);
            el.addEventListener('change', afterListener);
            const samples = [];
            while (performance.now() - start < duration * 7) {
                const raf = await new Promise<number>(requestAnimationFrame);
                const r = el.getBoundingClientRect(),
                    h = el.querySelector('.tri-state-handle')!.getBoundingClientRect();
                const animations = animationTiming();
                const active = animations.find((a) => typeof a.timing.progress === 'number');
                samples.push({
                    t: performance.now() - start,
                    raf,
                    documentTime: document.timeline.currentTime,
                    animations,
                    expectedX: active
                        ? active.fromX + (active.toX - active.fromX) * active.timing.progress!
                        : ends.find((e) => e.state === el.getAttribute('data-state'))!.x,
                    x: h.x - r.x,
                    sameNode: el.querySelector('.tri-state-handle') === original,
                    state: el.getAttribute('data-state'),
                    inside: h.left >= r.left - 1 && h.right <= r.right + 1,
                });
            }
            el.removeEventListener('change', listener, true);
            el.removeEventListener('change', afterListener);
            return { duration, easing, requests, samples, ends };
        });
        const sequence = ['exclude', 'include', 'neutral', 'exclude', 'include'];
        let requestFailure: unknown;
        try {
            for (const [index, state] of sequence.entries()) {
                if (index > 0) {
                    await expect
                        .poll(
                            () =>
                                rail.evaluate((el) => {
                                    const a = el
                                        .querySelector('.tri-state-handle')!
                                        .getAnimations()
                                        .find((a) => a.playState === 'running');
                                    if (!a || typeof a.currentTime !== 'number') return false;
                                    const timing = a.effect!.getComputedTiming();
                                    return (
                                        a.currentTime > Number(timing.duration) * 0.08 &&
                                        a.currentTime < Number(timing.duration) * 0.8
                                    );
                                }),
                            { intervals: [10, 15, 20], timeout: 1000 }
                        )
                        .toBe(true);
                }
                await rail.locator(`input[value="${state}"]`).check();
            }
        } catch (error) {
            requestFailure = error;
        }
        const result = await trace;
        const curve = result.easing.match(/cubic-bezier\(([^)]+)\)/u);
        expect(curve, 'motion model retains the declared CSS cubic-bezier').not.toBeNull();
        const tracePath = info.outputPath('request-correlated-trace.json');
        writeFileSync(tracePath, JSON.stringify(result, null, 2));
        await info.attach('request-correlated-trace', {
            path: tracePath,
            contentType: 'application/json',
        });
        expect(
            result.samples.every((s) => s.sameNode),
            'one persistent slider node'
        ).toBe(true);
        if (requestFailure) throw requestFailure;
        expect(result.requests.map((r) => r.state)).toEqual(sequence);
        expect(
            result.requests.slice(1).every((r) => r.activeBefore),
            'every reversal is in-flight'
        ).toBe(true);
        expect(
            result.samples.every((s) => s.sameNode),
            'one persistent slider node'
        ).toBe(true);
        expect(result.samples.every((s) => s.inside)).toBe(true);
        expect(result.duration).toBeGreaterThan(0);
        const travel = Math.max(...result.ends.map((e) => e.x)) - Math.min(...result.ends.map((e) => e.x));
        expect(
            result.samples.some((s) => s.animations.length > 0),
            'sampled active transition segments'
        ).toBe(true);
        for (const sample of result.samples) {
            // Native iteration progress is eased and uses each actual transition duration,
            // including shortened reversals. Callback wall time is only diagnostic.
            expect(
                Math.abs(sample.x - sample.expectedX),
                'position follows active animation segment'
            ).toBeLessThanOrEqual(1);
        }
        for (let i = 1; i < result.samples.length; i++) {
            const a = result.samples[i - 1],
                b = result.samples[i];
            expect(
                Math.abs(b.x - a.x - (b.expectedX - a.expectedX)) / travel,
                'continuous movement agrees with the animation timeline'
            ).toBeLessThanOrEqual(0.025);
        }
        for (const r of result.requests)
            expect(Math.abs(r.afterX! - r.x) / travel, 'request boundary has no teleport').toBeLessThanOrEqual(0.025);
        const final = result.samples.at(-1)!;
        expect(final.state).toBe(sequence.at(-1));
        expect(
            Math.abs(final.x - result.ends.find((e) => e.state === sequence.at(-1))!.x),
            'final destination before any corrective click'
        ).toBeLessThanOrEqual(1);
        await expect(rail.locator('input[value="include"]')).toBeChecked();
    });
}
