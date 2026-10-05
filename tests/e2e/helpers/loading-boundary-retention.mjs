/** Proves native first-attempt trace retention on synthetic data; raw traces stay temporary. */

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
async function files(dir) {
    return (await readdir(dir, { withFileTypes: true }))
        .flatMap((e) => (e.isDirectory() ? [] : [join(dir, e.name)]))
        .concat(
            ...(await Promise.all(
                (await readdir(dir, { withFileTypes: true }))
                    .filter((e) => e.isDirectory())
                    .map((e) => files(join(dir, e.name)))
            ))
        );
}
export async function proveInitialFailureRetention(root) {
    const dir = await mkdtemp(join(tmpdir(), 'loading-initial-failure-'));
    try {
        const imports = JSON.stringify(join(root, 'node_modules/@playwright/test/index.mjs'));
        await writeFile(
            join(dir, 'capture.spec.mjs'),
            `import { test as base,expect } from ${imports};\nimport { observeMeteorLoading,loadingDiagnosticTrace } from ${JSON.stringify(join(root, 'tests/e2e/helpers/meteor-loading-diagnostics.mjs'))};\nconst test=base.extend({ evidence:[async({page},use,info)=>{const observer=observeMeteorLoading(page);await use();await observer.finish(info);for(const event of ['pageerror','console','framenavigated','websocket'])expect(page.listenerCount(event)).toBe(0);},{auto:true}] });\ntest.use({trace:loadingDiagnosticTrace});\ntest('initial failure',async({page})=>{await page.goto('data:text/html,<h1>Synthetic fixture</h1>');const error=page.waitForEvent('pageerror');await page.addScriptTag({content:'console.error("PRIVATE_SENTINEL");setTimeout(()=>{throw new TypeError("PRIVATE_SENTINEL")},0)'});await error;await expect(page.getByRole('heading',{name:'deliberately absent'})).toBeVisible({timeout:200});});\ntest('successful attempt',async({page})=>{await page.goto('data:text/html,<h1>Synthetic fixture</h1>');await expect(page.getByRole('heading')).toBeVisible();});`
        );
        await writeFile(
            join(dir, 'playwright.config.mjs'),
            `export default {testDir:${JSON.stringify(dir)},testMatch:'capture.spec.mjs',workers:1,retries:0,reporter:'json',outputDir:${JSON.stringify(join(dir, 'results'))},use:{browserName:'chromium',headless:true,trace:'on-first-retry'}};`
        );
        const run = spawnSync(
            process.execPath,
            [
                join(root, 'node_modules/@playwright/test/cli.js'),
                'test',
                '--config',
                join(dir, 'playwright.config.mjs'),
            ],
            { cwd: root, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 }
        );
        assert.equal(run.status, 1, run.stderr);
        const report = JSON.parse(run.stdout);
        assert.equal(report.stats.unexpected, 1);
        assert.equal(report.stats.expected, 1);
        const specs = report.suites.flatMap((s) => s.specs ?? []);
        const failure = specs.find((s) => s.title === 'initial failure');
        const attempt = failure.tests[0].results[0];
        assert.equal(attempt.retry, 0);
        assert.equal(attempt.status, 'failed');
        assert.match(attempt.errors[0].message, /deliberately absent/);
        const artifacts = await files(join(dir, 'results'));
        const traces = artifacts.filter((p) => p.endsWith('trace.zip'));
        assert.equal(traces.length, 1);
        assert.match(traces[0], /initial-failure/);
        assert.doesNotMatch(traces[0], /retry/);
        const diagnostics = artifacts.filter((p) => p.endsWith('meteor-loading-diagnostics.json'));
        assert.equal(diagnostics.length, 1);
        const text = await readFile(diagnostics[0], 'utf8');
        assert.doesNotMatch(text, /PRIVATE_SENTINEL|Synthetic fixture|data:text|stack|message/);
        const d = JSON.parse(text);
        assert.equal(d.publicErrors.complete, true);
        assert.equal(d.publicErrors.stopped, true);
        assert.equal(
            d.publicErrors.events.some((e) => e.kind === 'pageerror' && e.errorName === 'TypeError'),
            true
        );
        assert.equal(
            d.publicErrors.events.some((e) => e.kind === 'console' && e.level === 'error'),
            true
        );
        assert.equal(
            d.publicErrors.events.every((e) => e.documentEpoch === 'unknown'),
            true
        );
        // Verify this is an actual attempt-0 trace ZIP, not an empty placeholder.
        const names = spawnSync('unzip', ['-Z1', traces[0]], { encoding: 'utf8' });
        assert.equal(names.status, 0);
        assert.match(names.stdout, /\.trace/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
