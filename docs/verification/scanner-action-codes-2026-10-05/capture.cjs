/** Captures the actual scanner composition, geometry and interaction states; no inventory writes. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch();
    const rows = [];
    for (const [w, h] of [
        [1280, 720],
        [820, 900],
        [390, 844],
        [390, 480],
    ])
        for (const scale of [1, 1.25]) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            await page.goto('http://127.0.0.1:48434/iframe.html?id=scanner-foundation--action-codes&viewMode=story');
            const f = page;
            await f.getByRole('heading', { name: 'Scanner workspace', exact: true }).waitFor();
            const fonts = await f.locator('main').evaluate((main, factor) => {
                const old = [main, ...main.querySelectorAll('*')].map((node) => ({
                    node,
                    before: parseFloat(getComputedStyle(node).fontSize),
                }));
                main.setAttribute('data-proof-text-scale', String(factor));
                const st = document.createElement('style');
                st.textContent = `main[data-proof-text-scale] button,main[data-proof-text-scale] input,main[data-proof-text-scale] select {font-size:${16 * factor}px !important;}`;
                document.head.appendChild(st);
                if (factor !== 1)
                    for (const { node, before } of old)
                        node.style.setProperty('font-size', `${before * factor}px`, 'important');
                return old.map(({ node, before }) => ({
                    tag: node.tagName,
                    before,
                    after: parseFloat(getComputedStyle(node).fontSize),
                }));
            }, scale);
            if (fonts.some((x) => Math.abs(x.after - x.before * scale) > 0.1)) throw Error('Font mismatch');
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await page.waitForTimeout(300);
            await page.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-ready.png` });
            const actions = f.getByRole('region', { name: 'Action codes', exact: true });
            await actions.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-actions.png` });
            const fixtures = f.getByRole('region', { name: 'Synthetic test codes', exact: true });
            await fixtures.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-fixtures.png` });
            const qr = await f.locator('img').evaluateAll((ns) =>
                ns.map((n) => ({
                    payload: n.getAttribute('data-payload'),
                    w: n.getBoundingClientRect().width,
                    h: n.getBoundingClientRect().height,
                    background: getComputedStyle(n).backgroundColor,
                }))
            );
            if (qr.some((x) => x.w !== 224 || x.h !== 224)) throw Error('QR geometry');
            // Scrolling to codes does not move focus. Native keyboard events feed the same sink.
            await page.keyboard.type('inventory-action:v1:show-actions');
            await page.keyboard.press('Enter');
            await page.keyboard.type('00012345678905');
            await page.keyboard.press('Enter');
            await f.getByTestId('last-outcome').first().filter({ hasText: 'Read-only demo result' }).waitFor();
            const session = f.getByRole('region', { name: 'Capture session', exact: true });
            await session.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-result.png` });
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);
            if ((await f.getByTestId('capture-state').innerText()) !== 'Paused') throw Error('Not paused');
            await session.screenshot({ path: `${__dirname}/${w}x${h}-${scale}-paused.png` });
            await f.getByRole('button', { name: 'Resume', exact: true }).click();
            if ((await f.getByTestId('capture-state').innerText()) !== 'Ready') throw Error('Resume failed');
            await f.getByText('Developer diagnostics', { exact: true }).click();
            await f.getByRole('combobox', { name: 'Resolver fault' }).scrollIntoViewIfNeeded();
            const overflow = await f
                .locator('main')
                .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
            if (overflow) throw Error('Diagnostics overflow');
            const controls = await f.getByRole('button').evaluateAll((ns) =>
                ns.map((n) => ({
                    text: n.textContent,
                    h: n.getBoundingClientRect().height,
                    size: parseFloat(getComputedStyle(n).fontSize),
                }))
            );
            if (controls.some((x) => x.h < 44 || x.size !== 16 * scale)) throw Error('Controls');
            rows.push({ w, h, scale, fonts, qr, controls, overflow });
            await page.close();
        }
    fs.writeFileSync(`${__dirname}/geometry.json`, JSON.stringify(rows, null, 2));
    await browser.close();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
