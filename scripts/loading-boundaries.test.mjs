import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { sanitizeRenderCapture } from '../tests/e2e/helpers/meteor-loading-diagnostics.mjs';
import { createPublicErrorEvidence } from '../tests/e2e/helpers/loading-boundary-evidence.mjs';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const source = await readFile(new URL('../meteor-app/imports/utility/e2eLoadingEvidence.ts', import.meta.url), 'utf8');
const { createLoadingCapture } = await import(
    'data:text/javascript;base64,' +
        Buffer.from(
            ts.transpileModule(source, {
                compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
            }).outputText
        ).toString('base64')
);
const epoch = 'document-0123456789abcdef';
const ready = { tagsLoading: false, allItemsLoading: false, identitiesLoading: false };
function capture() {
    const c = createLoadingCapture(epoch, () => 1, true);
    const f = { instance: c.alias({}), rootFrame: 1, ...ready };
    return { c, f };
}
test('interrupted tracker path is valid; later shell commits cannot complete a missing route', () => {
    const { c, f } = capture();
    c.record('root-render', f);
    c.record('tracker-before', { ...f, boundary: 'tags' });
    c.record('shell-commit', { ...f, commitBatch: c.batchFor(10) });
    const d = sanitizeRenderCapture(c.snapshot());
    assert.equal(d.reason, 'no-completed-commit');
    assert.equal(d.events.length, 3);
    assert.equal(d.lastCommit, undefined);
    assert.equal(d.lastShellCommit.rootFrame, 1);
});
test('synthetic phase-before-exception retains an interrupted path and linked public category', () => {
    const { c, f } = capture();
    const errors = createPublicErrorEvidence();
    errors.link(errors.navigation(), epoch);
    // This synthetic callback is not App fault injection or a bd-rjd reproduction.
    function interruptedFixture() {
        c.record('root-render', f);
        c.record('tracker-before', { ...f, boundary: 'tags' });
        throw new TypeError('PRIVATE synthetic exception message');
    }
    try {
        interruptedFixture();
        assert.fail('fixture must throw before tracker-after');
    } catch (error) {
        assert.ok(error instanceof TypeError);
        errors.record('pageerror', error.name, 123);
    }
    errors.stop();
    const renderCapture = sanitizeRenderCapture(c.snapshot());
    const publicErrors = errors.snapshot(true);
    assert.deepEqual(
        renderCapture.events.map((event) => event.phase),
        ['root-render', 'tracker-before']
    );
    assert.equal(renderCapture.complete, false);
    assert.equal(renderCapture.reason, 'no-completed-commit');
    assert.equal(renderCapture.lastCommit, undefined);
    assert.equal(publicErrors.complete, true);
    assert.equal(publicErrors.events[0].errorName, 'TypeError');
    assert.equal(publicErrors.events[0].documentEpoch, renderCapture.documentEpoch);
    assert.doesNotMatch(JSON.stringify({ renderCapture, publicErrors }), /PRIVATE|message|stack/u);
});
test('route and shell commits share native batch but preserve their own immutable frames', () => {
    const { c, f } = capture();
    c.record('root-render', f);
    c.record('route-attempt', { ...f, routeAttempt: 1, decision: 'contents' });
    c.record('commit', { ...f, routeAttempt: 1, decision: 'contents', commitBatch: c.batchFor(10) });
    c.record('root-render', { ...f, rootFrame: 2 });
    c.record('tree-end', { ...f, rootFrame: 2 });
    c.record('shell-commit', { ...f, commitBatch: c.batchFor(10) });
    const d = sanitizeRenderCapture(c.snapshot());
    assert.equal(d.complete, true);
    assert.equal(d.lastCommit.rootFrame, 1);
    assert.equal(d.lastShellCommit.rootFrame, 1);
    assert.equal(d.lastCommit.commitBatch, d.lastShellCommit.commitBatch);
    for (const changed of [
        { lastCommit: d.lastShellCommit },
        { lastShellCommit: d.lastCommit },
        {
            events: [
                ...d.events,
                { phase: 'tracker-before', instance: f.instance, rootFrame: 2, at: 2, boundary: 'PRIVATE' },
            ],
        },
        { events: [...d.events, { phase: 'route-entry', at: 3 }] },
    ])
        assert.equal(sanitizeRenderCapture({ ...d, ...changed }).complete, false);
    assert.doesNotMatch(
        JSON.stringify(
            sanitizeRenderCapture({
                ...d,
                events: [...d.events, { phase: 'tree-end', ...f, at: 2, message: 'PRIVATE', url: 'PRIVATE' }],
            })
        ),
        /PRIVATE/
    );
});
test('stage2 expanded markers overflow honestly and v1 output remains identical', () => {
    const { c, f } = capture();
    c.record('commit', { ...f, routeAttempt: 1, decision: 'contents', commitBatch: c.batchFor(1) });
    for (let i = 0; i < 220; i++) c.record('tree-start', f);
    const d = sanitizeRenderCapture(c.snapshot());
    assert.equal(d.complete, false);
    assert.equal(d.dropped, 21);
    const old = createLoadingCapture(epoch, () => 1);
    old.record('commit', { ...f, routeAttempt: 1, decision: 'contents', commitBatch: old.batchFor(1) });
    assert.deepEqual(sanitizeRenderCapture(old.snapshot()), old.snapshot());
});
test('public errors never store private fields and early errors remain unlinked across rapid navigation', () => {
    const e = createPublicErrorEvidence();
    e.record('pageerror', 'PRIVATE_NAME', 0);
    e.navigate();
    e.record('pageerror', 'TypeError', 1);
    const old = e.navigation();
    e.navigate();
    e.link(old, epoch);
    e.record('console', 'error', 2);
    e.link(e.navigation(), epoch);
    e.record('pageerror', 'Error', 3);
    e.record('console', 'PRIVATE', 4);
    e.stop();
    e.record('pageerror', 'PRIVATE', 5);
    const d = e.snapshot(true);
    assert.equal(d.complete, true);
    assert.equal(d.unlinkedEvents, 3);
    assert.equal(d.events.length, 4);
    assert.deepEqual(
        d.events.map((x) => x.documentEpoch),
        ['unknown', 'unknown', 'unknown', epoch]
    );
    assert.equal(d.events[0].errorName, 'other');
    assert.doesNotMatch(JSON.stringify(d), /PRIVATE/);
    const overflow = createPublicErrorEvidence();
    for (let i = 0; i < 40; i++) overflow.record('console', 'warning', i);
    overflow.stop();
    assert.equal(overflow.snapshot(true).complete, false);
    assert.equal(overflow.snapshot(true).dropped, 8);
    assert.equal(e.snapshot(false).complete, false);
});
test('original hooks, reactive callbacks and getter evaluation order are unchanged from merged baseline', async () => {
    // Frozen merged-baseline AST data keeps this guard independent of checkout depth.
    const baseline = JSON.parse(
        await readFile(new URL('./fixtures/loading-app-baseline-calls.json', import.meta.url), 'utf8')
    );
    assert.equal(baseline.schema, 'loading-app-baseline-calls/v1');
    assert.equal(baseline.revision, '07e7001fdd7217add1fb98c8ae4dc326193b3562');
    assert.equal(baseline.path, 'meteor-app/imports/ui/App.tsx');
    assert.match(baseline.sourceSha256, /^[a-f0-9]{64}$/u);
    assert.equal(baseline.typescriptVersion, ts.version);
    assert.ok(baseline.calls.length > 0);
    const current = await readFile(new URL('../meteor-app/imports/ui/App.tsx', import.meta.url), 'utf8');
    const printer = ts.createPrinter({ removeComments: true });
    function calls(text) {
        const file = ts.createSourceFile('App.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
            out = [];
        function visit(n) {
            if (ts.isCallExpression(n) && /^(use[A-Z]|isLoading)/.test(n.expression.getText(file)))
                out.push(printer.printNode(ts.EmitHint.Unspecified, n, file));
            ts.forEachChild(n, visit);
        }
        visit(file);
        return out;
    }
    assert.deepEqual(calls(current), baseline.calls);
    assert.match(current, /const appTree =/);
    assert.match(current, /return appTree/);
});

test('public observer ignores subframes, never serializes errors or console handles, and removes listeners', async () => {
    const { EventEmitter } = await import('node:events');
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { observeMeteorLoading } = await import('../tests/e2e/helpers/meteor-loading-diagnostics.mjs');
    const dir = await mkdtemp(join(tmpdir(), 'loading-public-errors-'));
    const page = new EventEmitter();
    const main = {};
    page.mainFrame = () => main;
    page.evaluate = () => Promise.resolve({ available: false });
    const observer = observeMeteorLoading(page);
    page.emit('framenavigated', {});
    page.emit('console', {
        type: () => 'warning',
        args: () => {
            throw Error('handles must not be read');
        },
        text: () => 'PRIVATE',
    });
    page.emit('framenavigated', main);
    page.emit('pageerror', { name: 'PRIVATE', message: 'PRIVATE', stack: 'PRIVATE' });
    page.emit('framenavigated', {});
    page.emit('console', { type: () => 'error' });
    try {
        let file;
        await observer.finish({
            status: 'failed',
            outputPath: (n) => join(dir, n),
            attach: async (_, a) => {
                file = a.path;
            },
        });
        const text = await readFile(file, 'utf8'),
            d = JSON.parse(text);
        assert.doesNotMatch(text, /PRIVATE/);
        assert.deepEqual(
            d.publicErrors.events.map((e) => e.navigation),
            ['unknown', 'navigation-1', 'navigation-1']
        );
        assert.equal(d.publicErrors.complete, true);
        for (const name of ['framenavigated', 'console', 'pageerror', 'websocket'])
            assert.equal(page.listenerCount(name), 0);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
