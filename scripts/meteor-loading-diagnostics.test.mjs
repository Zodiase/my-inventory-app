import assert from 'node:assert/strict';
import test from 'node:test';

import { createLoadingEvidence, diagnosticLimits } from '../tests/e2e/helpers/meteor-loading-diagnostics.mjs';

test('correlates DDP readiness with samples without retaining private payloads', () => {
    const capture = createLoadingEvidence();
    capture.frame(
        JSON.stringify({ msg: 'sub', id: 'private-id', name: 'inventory.identities', params: ['PRIVATE_ARGUMENT'] }),
        'sent',
        1
    );
    capture.sample(
        {
            available: true,
            route: 'container',
            loading: true,
            connected: true,
            subscriptionCount: 1,
            subscriptions: [
                {
                    id: 'private-id',
                    name: 'inventory.identities',
                    ready: false,
                    inactive: false,
                    parameterCount: 1,
                    params: ['PRIVATE_ARGUMENT'],
                },
            ],
        },
        2
    );
    capture.frame(
        'a' +
            JSON.stringify([
                JSON.stringify({ msg: 'ready', subs: ['private-id'] }),
                JSON.stringify({
                    msg: 'nosub',
                    id: 'private-id',
                    error: { error: 'PRIVATE_CODE', reason: 'PRIVATE_REASON' },
                }),
            ]),
        'received',
        3
    );
    capture.frame(
        JSON.stringify({
            msg: 'added',
            collection: 'items',
            fields: { name: 'PRIVATE_ITEM', password: 'PRIVATE_PASSWORD' },
        }),
        'received',
        4
    );
    capture.frame(JSON.stringify({ msg: 'result', id: 'private-method', result: 'PRIVATE_RESULT' }), 'received', 5);
    const evidence = capture.snapshot();
    assert.deepEqual(
        evidence.events.map((event) => event.type),
        ['sub', 'ready', 'nosub']
    );
    assert.equal(evidence.events[1].id, evidence.samples[0].subscriptions[0].id);
    assert.equal(evidence.events[2].errorPresent, true);
    assert.equal(evidence.samples[0].subscriptions[0].ready, false);
    assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE|private-id|private-method/);
});

test('bounds retained history, aliases and frames while keeping the latest failure state', () => {
    const capture = createLoadingEvidence();
    for (let i = 0; i < 200; i += 1) {
        capture.sample(
            {
                available: true,
                route: '/private-path',
                connected: false,
                loading: true,
                subscriptionCount: 1000,
                subscriptions: Array.from({ length: 100 }, (_, j) => ({
                    id: `private-${i}-${j}`,
                    name: 'PRIVATE_NAME',
                    ready: false,
                    parameterCount: 5000,
                })),
            },
            i
        );
        capture.frame(
            JSON.stringify({ msg: 'nosub', id: `private-${i}-0`, error: { reason: 'PRIVATE_ERROR' } }),
            'received',
            i
        );
    }
    capture.frame('x'.repeat(diagnosticLimits.frameBytes + 1), 'received', 201);
    capture.frame('malformed', 'received', 202);
    capture.frame(Buffer.from('PRIVATE_BINARY'), 'received', 203);
    const evidence = capture.snapshot();
    assert.equal(evidence.samples.length, diagnosticLimits.samples);
    assert.equal(evidence.events.length, diagnosticLimits.events);
    assert.equal(evidence.samples.at(-1).elapsedMs, 199);
    assert.equal(evidence.samples.at(-1).loading, true);
    assert.equal(evidence.samples.at(-1).subscriptions.length, diagnosticLimits.subscriptions);
    assert.equal(evidence.droppedSamples, 160);
    assert.equal(evidence.droppedEvents, 100);
    assert.equal(evidence.ignoredFrames, 3);
    assert.ok(evidence.samples.at(-1).subscriptions.every((sub) => sub.id === 'overflow'));
    assert.ok(Buffer.byteLength(JSON.stringify(evidence)) < 128 * 1024);
    assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE|private-/);
});

test(
    'a stalled browser cannot hang failure capture, and the artifact reports incomplete sampling',
    { timeout: 2000 },
    async () => {
        const { EventEmitter } = await import('node:events');
        const { mkdtemp, readFile, rm } = await import('node:fs/promises');
        const { tmpdir } = await import('node:os');
        const { join } = await import('node:path');
        const { observeMeteorLoading } = await import('../tests/e2e/helpers/meteor-loading-diagnostics.mjs');
        const directory = await mkdtemp(join(tmpdir(), 'loading-evidence-'));
        const page = new EventEmitter();
        let reads = 0;
        page.evaluate = () =>
            ++reads === 1
                ? Promise.resolve({
                      available: true,
                      renderCapture: {
                          schema: 'root-route-loading/v1',
                          documentEpoch: 'document-0123456789abcdef',
                          available: true,
                          complete: true,
                          stopped: false,
                          dropped: 0,
                          aliasOverflow: 0,
                          byteOverflow: 0,
                          events: [
                              {
                                  phase: 'commit',
                                  at: 1,
                                  instance: 'instance-1',
                                  rootFrame: 1,
                                  routeAttempt: 1,
                                  commitBatch: 1,
                                  commitSequence: 1,
                                  decision: 'contents',
                              },
                          ],
                          lastCommit: {
                              phase: 'commit',
                              at: 1,
                              instance: 'instance-1',
                              rootFrame: 1,
                              routeAttempt: 1,
                              commitBatch: 1,
                              commitSequence: 1,
                              decision: 'contents',
                          },
                      },
                  })
                : new Promise(() => {});
        const observer = observeMeteorLoading(page);
        let attachment;
        try {
            await observer.finish({
                status: 'timedOut',
                outputPath: (name) => join(directory, name),
                attach: async (_name, data) => {
                    attachment = data;
                },
            });
            const evidence = JSON.parse(await readFile(attachment.path, 'utf8'));
            assert.equal(evidence.finalSampleCompleted, false);
            assert.equal(evidence.renderCapture.complete, false);
            assert.equal(evidence.renderCapture.reason, 'drain-timeout');
            assert.equal(page.listenerCount('websocket'), 0);
            assert.equal(attachment.contentType, 'application/json');
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }
);

test('caps socket observers and removes all listeners after capture', async () => {
    const { EventEmitter } = await import('node:events');
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { observeMeteorLoading } = await import('../tests/e2e/helpers/meteor-loading-diagnostics.mjs');
    const directory = await mkdtemp(join(tmpdir(), 'loading-evidence-'));
    const page = new EventEmitter();
    page.evaluate = async () => ({ available: false });
    const observer = observeMeteorLoading(page);
    const sockets = Array.from({ length: diagnosticLimits.sockets + 3 }, () => new EventEmitter());
    sockets.forEach((socket) => page.emit('websocket', socket));
    let evidence,
        attachmentCount = 0;
    const info = {
        status: 'failed',
        outputPath: (name) => join(directory, name),
        attach: async (_name, data) => {
            evidence = JSON.parse(await readFile(data.path, 'utf8'));
            attachmentCount += 1;
        },
    };
    try {
        await observer.finish(info);
        await observer.finish(info);
        assert.equal(evidence.ignoredSockets, 3);
        assert.equal(attachmentCount, 1);
        assert.ok(
            sockets.every(
                (socket) => socket.listenerCount('framereceived') === 0 && socket.listenerCount('framesent') === 0
            )
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
