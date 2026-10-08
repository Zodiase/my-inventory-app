/** Collects reproducible app and manager renders for the separate visual self-review. */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('./', import.meta.url));
const browser = await chromium.launch({ headless: true });
const records = [];
for (const [w, h] of [
    [1280, 720],
    [820, 900],
    [390, 844],
    [390, 480],
])
    for (const scale of [1, 1.25]) {
        for (const story of [
            'scanner-move-simulation--interactive',
            'scanner-foundation--action-codes',
            'scanner-foundation--interactive',
            'app',
        ]) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            const isApp = story === 'app';
            await page.goto(
                isApp ? 'http://127.0.0.1:48440/scanner/demo' : `http://127.0.0.1:48438/?path=/story/${story}`
            );
            const f = isApp ? page : page.frameLocator('#storybook-preview-iframe');
            await f.getByRole('button', { name: 'Start', exact: true }).waitFor();
            if (!isApp) {
                const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true });
                if (await hide.isVisible()) await hide.click();
            }
            if (scale !== 1)
                await f.locator('main').evaluate((main, factor) => {
                    const nodes = [main, ...main.querySelectorAll('*')];
                    const sizes = nodes.map((node) => [node, parseFloat(getComputedStyle(node).fontSize)]);
                    for (const [node, size] of sizes)
                        node.style.setProperty('font-size', `${size * factor}px`, 'important');
                }, scale);
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            if (story === 'app' || story === 'scanner-move-simulation--interactive') {
                for (const code of [
                    'inventory-action:v1:move-demo',
                    'container: 33333333-3333-4333-8333-333333333333',
                    'item: 11111111-1111-4111-8111-111111111111',
                ]) {
                    await page.keyboard.type(code);
                    await page.keyboard.press('Enter');
                }
                await f.getByTestId('move-count').filter({ hasText: '1' }).waitFor();
            }
            await f.getByRole('button', { name: 'Pause', exact: true }).click();
            const viewport = await f.locator('main').evaluate((main) => {
                const scroll = main.querySelector('[data-testid="workspace-scroll"]');
                if (scroll) scroll.scrollTop = 0;
                else window.scrollTo(0, 0);
                const dock = main.querySelector('aside')?.getBoundingClientRect();
                return {
                    mainHeight: main.getBoundingClientRect().height,
                    dockTop: dock?.top,
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                };
            });
            const name = `${story}-${w}x${h}-${scale}.png`;
            await page.screenshot({ path: output + name });
            records.push({ story, w, h, scale, file: name, ...viewport });
            if (story === 'scanner-move-simulation--interactive') {
                await f.getByText('Show action QR codes', { exact: true }).click();
                await f
                    .getByRole('img', { name: 'Move simulation action QR code', exact: true })
                    .scrollIntoViewIfNeeded();
                await page.screenshot({ path: output + `codes-${w}x${h}-${scale}.png` });
            }
            await page.close();
        }
    }
await writeFile(output + 'geometry.json', JSON.stringify(records, null, 2));
await browser.close();
