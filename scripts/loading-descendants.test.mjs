import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { sanitizeRenderCapture } from '../tests/e2e/helpers/meteor-loading-diagnostics.mjs';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const evidenceSource = await readFile(
    new URL('../meteor-app/imports/utility/e2eLoadingEvidence.ts', import.meta.url),
    'utf8'
);
const captureSource = await readFile(
    new URL('../meteor-app/imports/utility/e2eLoadingCapture.tsx', import.meta.url),
    'utf8'
);
const compile = (source) =>
    ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            jsx: ts.JsxEmit.React,
            esModuleInterop: true,
        },
    }).outputText;
const epoch = 'document-0123456789abcdef';
function load(enabled = false, production = false) {
    const evidence = { exports: {} };
    vm.runInNewContext(compile(evidenceSource), { exports: evidence.exports });
    const context = {
        exports: {},
        performance: { now: () => 1 },
        inventoryE2eLoadingCapability: enabled ? { schema: 1, epoch } : undefined,
        require: (name) =>
            name === 'meteor/meteor'
                ? { Meteor: { isClient: true, isDevelopment: !production } }
                : name === './e2eLoadingEvidence'
                  ? evidence.exports
                  : require('../meteor-app/node_modules/react'),
    };
    vm.runInNewContext(compile(captureSource), context);
    return { context, api: context.exports, evidence: evidence.exports };
}
test('production and non-opted-in paths return the exact original tree without adding observers', () => {
    for (const [enabled, production] of [
        [false, false],
        [true, true],
    ]) {
        const { context, api } = load(enabled, production);
        const element = Object.freeze({ original: true });
        assert.equal(api.loadingCaptureEnabled, false);
        assert.equal(api.captureDescendant({ instance: 'instance-1', rootFrame: 1 }, 'grommet', element), element);
        assert.equal(api.captureDocumentRoot({}, element), element);
        assert.equal(context.inventoryE2eLoadingCapture, undefined);
        // No document/MutationObserver was provided: disabled instrumentation cannot touch DOM.
    }
});
test('entry without commit, missing entry and old-frame commit remain distinct evidence', () => {
    const { evidence } = load();
    const c = evidence.createLoadingCapture(epoch, () => 1, true, true);
    const frame = { instance: c.alias({}), rootFrame: 5 };
    c.record('commit', { ...frame, routeAttempt: 1, decision: 'root-loading', commitBatch: c.batchFor(1) });
    c.record('tree-end', { ...frame, rootFrame: 6 });
    c.record('root-profiler-commit', { instance: c.alias({}), boundary: 'document-root', commitBatch: c.batchFor(2) });
    let d = sanitizeRenderCapture(c.snapshot());
    assert.equal(d.schema, 'root-route-loading/v3');
    assert.equal(d.complete, true); // complete recorder is not successful frame6.
    assert.equal(
        d.events.some((e) => e.phase === 'descendant-entry' && e.rootFrame === 6),
        false
    );
    c.record('descendant-entry', { ...frame, rootFrame: 6, boundary: 'grommet' });
    c.record('descendant-layout', { ...frame, boundary: 'grommet' });
    d = sanitizeRenderCapture(c.snapshot());
    assert.equal(
        d.events.some((e) => e.phase === 'descendant-entry' && e.rootFrame === 6),
        true
    );
    assert.equal(
        d.events.some((e) => e.phase === 'descendant-layout' && e.rootFrame === 6),
        false
    );
    assert.equal(d.lastCommit.rootFrame, 5);
});
test('v3 boundary/error privacy, malformed correlation and overflow fail closed', () => {
    const { evidence } = load();
    const c = evidence.createLoadingCapture(epoch, () => 1, true, true);
    const f = { instance: c.alias({}), rootFrame: 1 };
    c.record('commit', { ...f, routeAttempt: 1, decision: 'contents', commitBatch: c.batchFor(1) });
    c.record('root-recoverable-error', {
        boundary: 'document-root',
        errorName: 'TypeError',
        message: 'PRIVATE',
        stack: 'PRIVATE',
    });
    const valid = sanitizeRenderCapture(c.snapshot());
    assert.equal(valid.complete, true);
    assert.doesNotMatch(JSON.stringify(valid), /PRIVATE/);
    for (const event of [
        { phase: 'descendant-entry', boundary: 'PRIVATE', ...f, at: 1 },
        { phase: 'descendant-layout', boundary: 'switch', instance: f.instance, at: 1 },
        { phase: 'root-profiler-commit', boundary: 'document-root', instance: f.instance, commitBatch: 0, at: 1 },
        { phase: 'root-recoverable-error', boundary: 'document-root', errorName: 'PRIVATE', at: 1 },
    ])
        assert.equal(sanitizeRenderCapture({ ...valid, events: [...valid.events, event] }).complete, false);
    for (let i = 0; i < 210; i++) c.record('descendant-entry', { ...f, boundary: 'grommet' });
    assert.equal(sanitizeRenderCapture(c.snapshot()).complete, false);
    assert.ok(Buffer.byteLength(JSON.stringify(c.snapshot())) < evidence.captureLimits.bytes);
});
test('legacy capture cannot silently accept descendant phases', () => {
    const { evidence } = load();
    for (const boundary of [false, true]) {
        const c = evidence.createLoadingCapture(epoch, () => 1, boundary);
        c.record('descendant-entry', { instance: c.alias({}), rootFrame: 1, boundary: 'grommet' });
        assert.equal(c.snapshot().events.length, 0);
    }
});

test('root observation is bounded and disconnected on drain; errors preserve native reporting with redacted evidence', () => {
    const { context, api } = load(true);
    let callback,
        disconnects = 0,
        reports = 0;
    context.MutationObserver = class {
        constructor(cb) {
            callback = cb;
        }
        observe() {}
        disconnect() {
            disconnects++;
        }
    };
    context.document = { documentElement: {} };
    context.reportError = () => {
        reports++;
    };
    const target = { isConnected: true };
    api.captureDocumentRoot(target, require('../meteor-app/node_modules/react').createElement('div'));
    target.isConnected = false;
    callback();
    api.captureRecoverableError('PRIVATE message');
    assert.equal(reports, 1);
    const capture = context.inventoryE2eLoadingCapture;
    assert.equal(capture.read().events.filter((e) => e.phase === 'root-removed').length, 1);
    assert.doesNotMatch(JSON.stringify(capture.read()), /PRIVATE/);
    capture.stop();
    const count = capture.read().events.length;
    callback();
    assert.equal(capture.read().events.length, count);
    assert.equal(disconnects, 3); // removal, drain, manually invoked disconnected callback
    assert.equal(capture.read().stopped, true);
});
