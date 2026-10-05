/** Captures same-input mode continuation and explicit interruption in the actual manager. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch();
    const evidence = [];
    for (const [w, h] of [
        [1280, 720],
        [820, 900],
        [390, 844],
        [390, 480],
    ])
        for (const scale of [1, 1.25]) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            await page.goto('http://127.0.0.1:48432/?path=/story/scanner-foundation--interactive');
            const f = page.frameLocator('#storybook-preview-iframe');
            await f.getByRole('heading', { name: 'Scanner foundation', exact: true }).waitFor();
            const hide = page.getByRole('button', { name: 'Hide addon panel', exact: true });
            if (await hide.isVisible()) await hide.click();
            const fonts = await f.locator('main').evaluate((main, scale) => {
                const baseline = [main, ...main.querySelectorAll('*')].map((node) => ({
                    node,
                    size: parseFloat(getComputedStyle(node).fontSize),
                }));
                main.setAttribute('data-proof-text-scale', String(scale));
                const style = document.createElement('style');
                style.textContent = `main[data-proof-text-scale] button,main[data-proof-text-scale] input,main[data-proof-text-scale] select {font-size:${16 * scale}px !important;}`;
                document.head.appendChild(style);
                if (scale !== 1)
                    for (const { node, size } of baseline)
                        node.style.setProperty('font-size', `${size * scale}px`, 'important');
                return baseline.map(({ node, size }) => ({
                    tag: node.tagName,
                    before: size,
                    after: parseFloat(getComputedStyle(node).fontSize),
                }));
            }, scale);
            if (fonts.some((x) => Math.abs(x.after - x.before * scale) > 0.1)) throw Error('Text enlargement failed');
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await page.keyboard.type('inventory-action:v1:show-actions');
            await page.keyboard.press('Enter');
            const session = f.getByRole('region', { name: 'Capture session' });
            if ((await f.getByTestId('capture-state').innerText()) !== 'ready') throw Error('Not ready');
            await page.waitForTimeout(300);
            await session.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-ready.png` });
            await page.keyboard.press('Tab');
            if ((await f.getByTestId('capture-state').innerText()) !== 'paused') throw Error('Not paused');
            await page.waitForTimeout(300);
            await session.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-paused.png` });
            if (h === 480) await session.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-session.png` });
            const controls = await session.getByRole('button').evaluateAll((nodes) =>
                nodes.map((n) => ({
                    text: n.textContent,
                    width: n.getBoundingClientRect().width,
                    height: n.getBoundingClientRect().height,
                    font: parseFloat(getComputedStyle(n).fontSize),
                }))
            );
            if (controls.some((x) => x.height < 44 || x.font !== 16 * scale)) throw Error('Control geometry mismatch');
            await session.getByRole('button', { name: 'Resume', exact: true }).scrollIntoViewIfNeeded();
            await session.getByRole('button', { name: 'Resume', exact: true }).click();
            if ((await f.getByTestId('capture-state').innerText()) !== 'ready') throw Error('Resume failed');
            const overflow = await f
                .locator('main')
                .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
            if (overflow) throw Error('Horizontal overflow');
            evidence.push({ w, h, scale, fonts, controls, overflow });
            await page.close();
        }
    fs.writeFileSync(`${__dirname}/geometry.json`, JSON.stringify(evidence, null, 2));
    await browser.close();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
