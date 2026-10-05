import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { sanitizeRenderCapture } from '../tests/e2e/helpers/meteor-loading-diagnostics.mjs';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const source = await readFile(new URL('../meteor-app/imports/utility/e2eLoadingEvidence.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { createLoadingCapture, validCaptureCapability, captureLimits, recordExistingGetter } = await import(
    'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
const epoch = 'document-0123456789abcdef';

test('capability fails closed; recorder and drain exclude private payloads', () => {
    assert.equal(validCaptureCapability({ schema: 1, epoch }), true);
    assert.equal(validCaptureCapability({ schema: 1, epoch: 'PRIVATE_URL' }), false);
    const c = createLoadingCapture(epoch, () => 1);
    c.record('root-render', {
        instance: 'PRIVATE_ID',
        decision: 'PRIVATE_ERROR',
        props: 'PRIVATE_CONTENT',
        allItemsLoading: true,
    });
    c.record('commit', {
        instance: c.alias({}),
        routeAttempt: 1,
        rootFrame: 1,
        decision: 'root-loading',
        allItemsLoading: true,
    });
    const raw = c.snapshot();
    raw.events.push({ phase: 'commit', instance: 'PRIVATE_ID', url: 'PRIVATE_URL', allItemsLoading: true });
    raw.lastCommit.props = 'PRIVATE_CONTENT';
    const text = JSON.stringify(sanitizeRenderCapture(raw));
    assert.doesNotMatch(text, /PRIVATE/);
    assert.equal(sanitizeRenderCapture(raw).lastCommit.decision, 'root-loading');
    assert.equal(c.snapshot().lastCommit.props, undefined);
});

test('alias overflow and ring truncation cannot pretend to preserve exact identity', () => {
    const c = createLoadingCapture(epoch, () => 2);
    for (let i = 0; i < captureLimits.aliases; i++) assert.match(c.alias({}), /^instance-/);
    assert.equal(c.alias({}), undefined);
    for (let i = 0; i < 250; i++) c.record('commit', { routeAttempt: i });
    const state = c.snapshot();
    assert.equal(state.events.length, 200);
    assert.equal(state.dropped, 50);
    assert.equal(state.complete, false);
    assert.equal(state.reason, 'alias-overflow');
    assert.ok(Buffer.byteLength(JSON.stringify(state)) < captureLimits.bytes);
});

test('same native commit batch links child and gate without assuming parent means child', () => {
    const c = createLoadingCapture(epoch, () => 3);
    const batch = c.batchFor(123.45);
    c.record('commit', { childFrame: 1, decision: 'child-loading', commitBatch: batch });
    c.record('commit', { rootFrame: 1, routeAttempt: 2, decision: 'contents', commitBatch: c.batchFor(123.45) });
    assert.equal(c.snapshot().events[0].commitBatch, c.snapshot().lastCommit.commitBatch);
    assert.notEqual(c.batchFor(124.1), batch);
    const gateOnly = createLoadingCapture(epoch, () => 3);
    gateOnly.record('commit', { rootFrame: 1, routeAttempt: 1, decision: 'contents' });
    assert.equal(
        gateOnly.snapshot().events.some((e) => e.childFrame !== undefined),
        false
    );
    assert.equal(createLoadingCapture(epoch, () => 0).snapshot().reason, 'no-completed-commit');
});

test('hot reload, unsupported callback and stopped producer remain explicit', () => {
    const c = createLoadingCapture(epoch, () => 0);
    c.record('commit', { routeAttempt: 1 });
    c.markUnavailable('hot-reload');
    c.record('commit', { routeAttempt: 2 });
    assert.equal(c.snapshot().available, false);
    assert.equal(c.snapshot().lastCommit.routeAttempt, 1);
    const unsupported = createLoadingCapture(epoch, () => 0);
    unsupported.batchFor(NaN);
    assert.equal(unsupported.snapshot().reason, 'unsupported-commit');
    const stopped = createLoadingCapture(epoch, () => 0);
    stopped.stop();
    stopped.record('commit', {});
    assert.equal(stopped.snapshot().events.length, 0);
    assert.equal(stopped.snapshot().stopped, true);
});

test('records each original getter once and keeps OR short-circuit skips', () => {
    for (const firstTrue of [0, 1, 2, 3, 4]) {
        const frame = {};
        const calls = [];
        const getter = (i) => () => {
            calls.push(i);
            return i === firstTrue;
        };
        const loading =
            recordExistingGetter(frame, 'items', getter(0)) ||
            recordExistingGetter(frame, 'hoisted', getter(1)) ||
            recordExistingGetter(frame, 'tags', getter(2)) ||
            recordExistingGetter(frame, 'identities', getter(3));
        assert.equal(loading, firstTrue < 4);
        assert.deepEqual(calls, [0, 1, 2, 3].slice(0, Math.min(firstTrue + 1, 4)));
        assert.equal(Object.keys(frame).length, calls.length);
    }
    assert.equal(
        recordExistingGetter(undefined, 'items', () => true),
        true
    );
});

test('drain cannot promote malformed or truncated evidence to complete', () => {
    const c = createLoadingCapture(epoch, () => 0);
    c.record('commit', { routeAttempt: 1 });
    for (const changed of [
        { reason: 'PRIVATE_UNKNOWN' },
        { lastCommit: undefined },
        { dropped: 1 },
        { available: false },
        { events: [{}] },
    ])
        assert.equal(sanitizeRenderCapture({ ...c.snapshot(), ...changed }).complete, false);
});

test('malformed supplied metadata and damaged last-commit correlation fail closed', () => {
    const c = createLoadingCapture(epoch, () => 1);
    c.record('commit', {
        instance: c.alias({}),
        rootFrame: 1,
        routeAttempt: 1,
        commitBatch: c.batchFor(10),
        decision: 'contents',
        allItemsLoading: false,
    });
    const valid = c.snapshot();
    assert.equal(sanitizeRenderCapture(valid).complete, true);
    for (const key of ['dropped', 'aliasOverflow', 'byteOverflow']) {
        for (const bad of [-1, 1.5, 'INVALID', undefined, NaN, 1000000]) {
            assert.equal(sanitizeRenderCapture({ ...valid, [key]: bad }).complete, false);
        }
    }
    for (const [key, value] of [
        ['instance', 'PRIVATE_ID'],
        ['rootFrame', 'INVALID'],
        ['routeAttempt', -1],
        ['commitSequence', undefined],
        ['commitBatch', 0],
        ['at', 1.5],
        ['allItemsLoading', 'false'],
        ['decision', 'PRIVATE_ERROR'],
    ]) {
        const event = { ...valid.lastCommit, [key]: value };
        const output = sanitizeRenderCapture({ ...valid, events: [event], lastCommit: event });
        assert.equal(output.complete, false, key);
        assert.doesNotMatch(JSON.stringify(output), /PRIVATE/);
    }
    assert.equal(
        sanitizeRenderCapture({ ...valid, lastCommit: { ...valid.lastCommit, routeAttempt: 2 } }).complete,
        false
    );
    const reproduction = {
        schema: 'root-route-loading/v1',
        documentEpoch: epoch,
        available: true,
        complete: true,
        events: [{ phase: 'commit', routeAttempt: 'INVALID', instance: 'PRIVATE_ID' }],
        lastCommit: { phase: 'commit', routeAttempt: 'INVALID', instance: 'PRIVATE_ID' },
        dropped: -1,
        aliasOverflow: 'INVALID',
        byteOverflow: 0,
    };
    assert.equal(sanitizeRenderCapture(reproduction).complete, false);
});
