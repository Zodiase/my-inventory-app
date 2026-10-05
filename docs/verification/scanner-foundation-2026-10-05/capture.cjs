/** Developer evidence capture: full manager, text-only scaling and computed-font assertions; no inventory writes. */
const { chromium } = require('@playwright/test');
const fs = require('fs');
(async () => {
    const browser = await chromium.launch();
    const results = [];
    const out = __dirname;
    for (const [w, h] of [
        [1280, 720],
        [820, 900],
        [390, 844],
        [390, 480],
    ])
        for (const scale of [1, 1.25]) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            const errors = [];
            page.on('pageerror', (e) => errors.push(e.message));
            await page.goto('http://127.0.0.1:48430/?path=/story/scanner-foundation--interactive');
            const f = page.frameLocator('#storybook-preview-iframe');
            await f.getByRole('heading', { name: 'Scanner foundation', exact: true }).waitFor();
            if (await page.getByRole('button', { name: 'Hide addon panel', exact: true }).isVisible())
                await page.getByRole('button', { name: 'Hide addon panel', exact: true }).click();
            const fonts = await f.locator('main').evaluate((main, scale) => {
                const nodes = [main, ...main.querySelectorAll('*')];
                const baseline = nodes.map((node) => ({ node, before: parseFloat(getComputedStyle(node).fontSize) }));
                const style = document.createElement('style');
                main.setAttribute('data-proof-text-scale', String(scale));
                style.textContent = `main[data-proof-text-scale] button, main[data-proof-text-scale] input, main[data-proof-text-scale] select {font-size:${16 * scale}px !important;}`;
                document.head.appendChild(style);
                if (scale !== 1)
                    for (const { node, before } of baseline)
                        node.style.setProperty('font-size', `${before * scale}px`, 'important');
                return baseline.map(({ node, before }) => ({
                    tag: node.tagName,
                    text: node.textContent?.slice(0, 80),
                    before,
                    after: parseFloat(getComputedStyle(node).fontSize),
                }));
            }, scale);
            for (const font of fonts)
                if (Math.abs(font.after - font.before * scale) > 0.001) throw Error(`Font scaling failed ${font.tag}`);
            await f.locator('main').evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: `${out}/manager-${w}x${h}-${scale}-overview.png` });
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await page.keyboard.type('partial');
            await page.keyboard.press('Tab');
            await f.getByRole('button', { name: 'Resume', exact: true }).click();
            await page.screenshot({ path: `${out}/manager-${w}x${h}-${scale}-recovery.png` });
            await page.keyboard.type('discard');
            await page.keyboard.press('Enter');
            await page.keyboard.type('00012345678905');
            await page.keyboard.press('Enter');
            await f.getByTestId('last-outcome').filter({ hasText: 'resolved' }).waitFor();
            await f.getByText('Ordered capture evidence', { exact: true }).click();
            await f.getByText('Dispatch and resolver history', { exact: true }).click();
            await f.getByRole('button', { name: 'Open dialog', exact: true }).scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${out}/manager-${w}x${h}-${scale}-controls.png` });
            await f.getByRole('button', { name: 'Exit', exact: true }).scrollIntoViewIfNeeded();
            await f.getByTestId('last-outcome').scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${out}/manager-${w}x${h}-${scale}-outcome.png` });
            const geometry = await f
                .locator('main')
                .evaluate(() => ({
                    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    buttons: [...document.querySelectorAll('main button')]
                        .filter((b) => b.getBoundingClientRect().width)
                        .map((b) => ({
                            text: b.textContent,
                            width: b.getBoundingClientRect().width,
                            height: b.getBoundingClientRect().height,
                            fontSize: getComputedStyle(b).fontSize,
                        })),
                    focus: document.activeElement?.getAttribute('aria-label'),
                }));
            for (const b of geometry.buttons)
                if (parseFloat(b.fontSize) !== 16 * scale)
                    throw Error(`Post-capture font failed ${b.text} ${b.fontSize}`);
            results.push({ w, h, scale, fonts, geometry, errors });
            await page.close();
        }
    fs.writeFileSync(`${out}/geometry.json`, JSON.stringify(results, null, 2));
    await browser.close();
})();
