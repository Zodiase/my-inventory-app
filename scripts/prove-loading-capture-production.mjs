/** Verifies forged diagnostic opt-in is inert on a disposable production build. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [url, output] = process.argv.slice(2);
assert.ok(url && output, 'Usage: node scripts/prove-loading-capture-production.mjs LOOPBACK_URL OUTPUT_JSON');
const target = new URL(url);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'Use an explicitly disposable local build');
assert.ok(target.port, 'An explicit disposable port is required');
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(globalThis, 'inventoryE2eLoadingCapability', {
            value: Object.freeze({ schema: 1, epoch: 'document-0123456789abcdef' }),
            configurable: false,
            writable: false,
        });
    });
    await page.goto(url);
    await page.getByRole('heading', { name: 'All Items', exact: true }).waitFor();
    const proof = await page.evaluate(() => ({
        production: window.Meteor?.isProduction,
        development: window.Meteor?.isDevelopment,
        capabilityPresent: 'inventoryE2eLoadingCapability' in globalThis,
        capturePresent: 'inventoryE2eLoadingCapture' in globalThis,
        bootstrapPresent: 'inventoryE2eLoadingBootstrap' in globalThis,
        headingVisible: document.querySelector('main')?.textContent?.includes('All Items') === true,
    }));
    assert.equal(proof.production, true, 'This must be an actual production client');
    assert.equal(proof.development, false);
    assert.equal(proof.capabilityPresent, true);
    assert.equal(proof.capturePresent, false);
    assert.equal(proof.bootstrapPresent, false);
    assert.equal(proof.headingVisible, true);
    await writeFile(output, JSON.stringify({ schema: 'loading-capture-production-proof/v1', ...proof }, null, 2), {
        mode: 0o600,
    });
    console.log('Production client ignores forged capability; ordinary root content renders.');
} finally {
    await browser.close();
}
