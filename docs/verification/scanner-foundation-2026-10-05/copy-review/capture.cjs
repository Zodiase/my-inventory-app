/** Scoped recovery-copy evidence in the full manager; no inventory writes. */
const { chromium } = require('@playwright/test');
const fs = require('fs');
(async () => {
    const browser = await chromium.launch();
    const out = __dirname;
    const evidence = [];
    for (const [w, h] of [
        [1280, 720],
        [820, 900],
        [390, 844],
        [390, 480],
    ])
        for (const scale of [1, 1.25]) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            await page.goto('http://127.0.0.1:48430/?path=/story/scanner-foundation--interactive');
            const f = page.frameLocator('#storybook-preview-iframe');
            await f.getByRole('heading', { name: 'Scanner foundation', exact: true }).waitFor();
            if (await page.getByRole('button', { name: 'Hide addon panel', exact: true }).isVisible())
                await page.getByRole('button', { name: 'Hide addon panel', exact: true }).click();
            await f.locator('main').evaluate((main, scale) => {
                const nodes = [main, ...main.querySelectorAll('*')];
                const baseline = nodes.map((node) => ({ node, size: parseFloat(getComputedStyle(node).fontSize) }));
                main.setAttribute('data-proof-text-scale', String(scale));
                const style = document.createElement('style');
                style.textContent = `main[data-proof-text-scale] button, main[data-proof-text-scale] input, main[data-proof-text-scale] select {font-size:${16 * scale}px !important;}`;
                document.head.appendChild(style);
                if (scale !== 1)
                    for (const { node, size } of baseline)
                        node.style.setProperty('font-size', `${size * scale}px`, 'important');
            }, scale);
            await f.getByRole('combobox', { name: 'Resolver fault' }).selectOption('error');
            await f.getByRole('button', { name: 'Start', exact: true }).click();
            await page.keyboard.type('00012345678905');
            await page.keyboard.press('Enter');
            await f.getByTestId('last-outcome').filter({ hasText: 'Synthetic error' }).waitFor();
            await f.getByText('Ordered capture evidence', { exact: true }).click();
            const record = f.getByTestId('read-record').last();
            for (const state of ['failed', 'attempt-limit']) {
                if (state === 'attempt-limit')
                    for (let i = 0; i < 2; i++) {
                        await record.getByRole('button', { name: 'Retry', exact: true }).click();
                        await record.filter({ hasText: `attempt ${i + 2}` }).waitFor();
                        await record.getByRole('button', { name: 'Retry', exact: true }).isEnabled();
                        await page.waitForTimeout(200);
                    }
                await f.getByTestId('last-outcome').scrollIntoViewIfNeeded();
                await page.screenshot({ path: `${out}/manager-${w}x${h}-${scale}-${state}.png` });
                if (w === 390) await record.screenshot({ path: `${out}/record-${w}x${h}-${scale}-${state}.png` });
                const controls = await record
                    .getByRole('button')
                    .evaluateAll((nodes) =>
                        nodes.map((node) => ({
                            text: node.textContent,
                            size: parseFloat(getComputedStyle(node).fontSize),
                            disabled: node.disabled,
                            width: node.getBoundingClientRect().width,
                            height: node.getBoundingClientRect().height,
                        }))
                    );
                if (controls.some((x) => x.size !== 16 * scale || x.height < 44))
                    throw Error('Control text or target mismatch');
                await record.getByRole('button', { name: 'Mark correction', exact: true }).scrollIntoViewIfNeeded();
                if (!(await record.getByRole('button', { name: 'Mark correction', exact: true }).isVisible()))
                    throw Error('Correction unreachable');
                evidence.push({
                    w,
                    h,
                    scale,
                    state,
                    guidance: await f.getByTestId('last-recovery-guidance').innerText(),
                    controls,
                    overflow: await f
                        .locator('main')
                        .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
                });
            }
            await page.close();
        }
    fs.writeFileSync(`${out}/geometry.json`, JSON.stringify(evidence, null, 2));
    await browser.close();
})();
