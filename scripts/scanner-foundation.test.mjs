import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const source = await readFile(new URL('../meteor-app/imports/ui/ScannerFoundation/model.ts', import.meta.url), 'utf8');
async function load(text = source) {
    const compiled = ts.transpileModule(text, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}
const { reduce, initialState, classify, fixtures, limits, retryBlockReason } = await load();
const codes = Object.keys(fixtures);
const action = (state, value, origin = 'tap') =>
    reduce(state, { type: 'action', action: value, origin, localGesture: origin === 'tap' });
const start = () => action(initialState(), 'start');
const scan = (state, value) => reduce(reduce(state, { type: 'input', value }), { type: 'delimiter' });
const result = (state, read, outcome = 'resolved', detail = read.value) =>
    reduce(state, { type: 'result', id: read.id, epoch: read.epoch, attempt: read.attempt, outcome, detail });

test('F01/F09 new epoch cancels pending and rejects old results; repeated mode entry is idempotent', () => {
    let s = scan(start(), codes[0]);
    const old = s.reads[0];
    assert.equal(action(s, 'inspect-demo').epoch, s.epoch);
    s = action(action(s, 'exit'), 'start');
    s = scan(s, codes[1]);
    assert.equal(s.reads[0].outcome, 'cancelled');
    assert.deepEqual(result(s, old), s);
    assert.equal(s.reads[1].outcome, 'pending');
});
test('F02 literal UUID case and numeric zeros survive, product is not an owned identity', () => {
    for (const code of codes) {
        const s = scan(start(), code);
        assert.equal(s.reads[0].value, code);
        assert.equal(s.reads[0].kind, fixtures[code].kind);
    }
    const upper = 'item: ABCDEFAB-ABCD-4ABC-8ABC-ABCDEFABCDEF';
    assert.equal(scan(start(), upper).reads[0].value, upper);
    assert.equal(classify('00012345678905').kind, 'product');
});
test('F03 grammar rejects empty, whitespace, truncated, control, URLs and unknown action versions', () => {
    for (const code of [
        '',
        ' ',
        'item: ab606489',
        'https://example.com',
        '<script>',
        'abc\n',
        'x'.repeat(513),
        'inventory-action:v2:exit',
        'inventory-action:v1:resume',
        'NETUM setup',
    ])
        assert.equal(classify(code).kind, 'invalid', code);
});
test('F04 clean pause resumes immediately; interrupted partial requires a discarded boundary', () => {
    let s = action(reduce(start(), { type: 'pause', reason: 'blur' }), 'resume');
    assert.equal(s.capture, 'ready');
    s = reduce(s, { type: 'input', value: codes[0].slice(0, 12) });
    s = reduce(s, { type: 'timeout' });
    assert.equal(s.capture, 'paused');
    assert.equal(s.reads[0].outcome, 'rejected');
    s = action(s, 'resume');
    assert.equal(s.capture, 'draining');
    s = scan(s, codes[0]);
    assert.equal(s.reads.at(-1).outcome, 'discarded');
    s = scan(s, codes[1]);
    assert.equal(s.reads.at(-1).value, codes[1]);
    assert.equal(s.reads.at(-1).outcome, 'pending');
});
test('F05/F07 doubled empty delimiters never duplicate; identical reads remain distinct', () => {
    let s = scan(start(), codes[3]);
    s = reduce(s, { type: 'delimiter' });
    assert.equal(s.reads.length, 1);
    s = scan(s, codes[3]);
    assert.equal(s.reads.length, 2);
    assert.notEqual(s.reads[0].id, s.reads[1].id);
});
test('F08 capture ABC resolves C/A/B without reordering or replacing latest evidence', () => {
    let s = start();
    for (const code of codes.slice(0, 3)) s = scan(s, code);
    s = result(s, s.reads[2]);
    s = result(s, s.reads[0], 'error', 'offline');
    s = result(s, s.reads[1]);
    assert.deepEqual(
        s.reads.map((r) => r.value),
        codes.slice(0, 3)
    );
    assert.equal(s.reads[0].outcome, 'error');
    assert.equal(s.reads.at(-1).detail, codes[2]);
});
test('F12 scan commands are unavailable off/paused, reserved invalid verbs never reach resolution', () => {
    for (const s of [initialState(), action(start(), 'pause')]) {
        assert.deepEqual(action(s, 'exit', 'scan'), s);
        assert.deepEqual(action(s, 'resume', 'scan'), s);
        assert.deepEqual(scan(s, 'inventory-action:v1:exit'), s);
    }
    const s = scan(start(), 'inventory-action:v2:exit');
    assert.equal(s.capture, 'ready');
    assert.equal(s.reads[0].outcome, 'rejected');
    assert.equal(s.actions.length, 1);
});
test('F13 every allowlisted command and tap have matching semantic mode and capture effects', () => {
    for (const verb of ['inspect-demo', 'show-actions', 'pause', 'exit']) {
        const tap = action(start(), verb);
        const scanned = scan(start(), `inventory-action:v1:${verb}`);
        assert.equal(scanned.capture, tap.capture);
        assert.equal(scanned.mode, tap.mode);
        assert.equal(scanned.epoch, tap.epoch);
        assert.equal(scanned.actions.at(-1).action, tap.actions.at(-1).action);
    }
    assert.deepEqual(reduce(initialState(), { type: 'action', action: 'start', origin: 'tap' }), initialState());
});
test('F15 retry links original, retains failed outcome, rejects previous attempt and cancellation results', () => {
    let s = scan(start(), codes[0]);
    const original = s.reads[0];
    s = result(s, original, 'error', 'offline');
    s = reduce(s, { type: 'retry', id: original.id });
    assert.equal(s.reads.length, 1);
    assert.equal(s.reads[0].attempt, 2);
    assert.equal(s.reads[0].attempts[0].detail, 'offline');
    assert.deepEqual(result(s, original), s);
    s = reduce(s, { type: 'correct', id: original.id });
    assert.equal(s.reads[0].corrected, true);
    s = reduce(s, { type: 'cancel', id: original.id });
    assert.deepEqual(result(s, s.reads[0]), s);
});
test('F16 pending backpressure is visible and no unseen queued read survives resume', () => {
    let s = start();
    for (let i = 0; i < limits.pending; i++) s = scan(s, codes[0]);
    s = scan(s, codes[1]);
    assert.equal(s.capture, 'paused');
    assert.match(s.reason, /Capacity/);
    assert.equal(s.reads.length, limits.pending);
    s = result(s, s.reads[0]);
    s = action(s, 'resume');
    s = scan(s, codes[1]);
    assert.equal(s.reads.length, limits.pending + 1);
});
test('record bound also applies to repeated interruptions and discarded reads', () => {
    let s = start();
    for (let i = 0; i < 110; i++) {
        s = scan(s, 'bad');
        if (s.capture === 'paused') s = action(s, 'resume');
    }
    assert.equal(s.reads.length, limits.records);
});
test('targeted negative controls fail at partial concat, stale epoch, outside command and duplicate delimiter guards', async () => {
    const changes = [
        [
            "capture: state.uncertain ? 'draining' : 'ready'",
            "capture: 'ready'",
            (m) => {
                let s = reduce(start(), { type: 'input', value: 'partial' });
                s = reduce(s, { type: 'timeout' });
                s = m.reduce(s, { type: 'action', action: 'resume', origin: 'tap', localGesture: true });
                assert.equal(s.capture, 'draining');
            },
        ],
        [
            'event.epoch === state.epoch &&',
            '',
            (m) => {
                let s = scan(start(), codes[0]);
                const old = s.reads[0];
                s = { ...s, epoch: s.epoch + 1 };
                assert.equal(
                    m.reduce(s, {
                        type: 'result',
                        id: old.id,
                        epoch: old.epoch,
                        attempt: 1,
                        outcome: 'resolved',
                        detail: 'bad',
                    }).reads[0].outcome,
                    'pending'
                );
            },
        ],
        [
            "if (origin === 'scan' && state.capture !== 'ready' && state.capture !== 'collecting') return state;",
            '',
            (m) => {
                const s = action(start(), 'pause');
                assert.deepEqual(m.reduce(s, { type: 'action', action: 'exit', origin: 'scan' }), s);
            },
        ],
        [
            "if (state.buffer === '') return state;",
            '',
            (m) => {
                const s = scan(start(), codes[0]);
                assert.equal(m.reduce(s, { type: 'delimiter' }).reads.length, 1);
            },
        ],
    ];
    for (const [before, after, check] of changes) {
        assert(source.includes(before), before);
        const m = await load(source.replace(before, after));
        assert.throws(() => check(m), assert.AssertionError);
    }
});

test('F15/F16 existing-record retry retains full history and shares explicit pending/attempt guards', () => {
    let s = start();
    for (let i = 0; i < limits.records; i++) {
        s = scan(s, codes[0]);
        s = result(s, s.reads.at(-1), 'error', 'Synthetic failure');
    }
    const read = s.reads.at(-1);
    assert.equal(retryBlockReason(s, read), undefined);
    s = reduce(s, { type: 'retry', id: read.id });
    assert.equal(s.reads.length, limits.records);
    assert.equal(s.reads.at(-1).id, read.id);
    assert.equal(s.reads.at(-1).attempt, 2);
    assert.deepEqual(s.reads.at(-1).attempts, [{ attempt: 1, outcome: 'error', detail: 'Synthetic failure' }]);
    s = result(s, s.reads.at(-1), 'error');
    s = reduce(s, { type: 'retry', id: read.id });
    s = result(s, s.reads.at(-1), 'error');
    assert.match(retryBlockReason(s, s.reads.at(-1)), /attempt limit/);
    assert.deepEqual(reduce(s, { type: 'retry', id: read.id }), s);
    let queued = scan(start(), codes[0]);
    queued = result(queued, queued.reads[0], 'error');
    for (let i = 0; i < limits.pending; i++) queued = scan(queued, codes[1]);
    assert.match(retryBlockReason(queued, queued.reads[0]), /Pending queue full/);
    assert.deepEqual(reduce(queued, { type: 'retry', id: queued.reads[0].id }), queued);
    queued = reduce(queued, { type: 'cancel', id: queued.reads[1].id });
    assert.equal(retryBlockReason(queued, queued.reads[0]), undefined);
    assert.equal(reduce(queued, { type: 'retry', id: queued.reads[0].id }).reads[0].attempt, 2);
});

test('verified same-input scan transitions continue, cancel old epoch and accept the next frame', () => {
    let s = scan(start(), codes[0]);
    const old = s.reads[0];
    const safeScan = (state, value) =>
        reduce(reduce(state, { type: 'input', value }), {
            type: 'delimiter',
            continuationAllowed: true,
        });
    s = safeScan(s, 'inventory-action:v1:show-actions');
    assert.equal(s.capture, 'ready');
    assert.equal(s.epoch, old.epoch + 1);
    assert.equal(s.reads[0].outcome, 'cancelled');
    assert.deepEqual(result(s, old), s);
    const epoch = s.epoch;
    s = safeScan(s, 'inventory-action:v1:show-actions');
    assert.equal(s.epoch, epoch);
    s = safeScan(s, codes[1]);
    assert.equal(s.reads.at(-1).epoch, epoch);
    assert.equal(s.reads.at(-1).outcome, 'pending');
    assert.equal(safeScan(s, 'inventory-action:v1:pause').capture, 'paused');
    assert.equal(safeScan(s, 'inventory-action:v1:exit').capture, 'off');
});
test('continuation authorization cannot bypass interruption, partial boundary or tap transitions', () => {
    const transition = (s, origin = 'scan') =>
        reduce(s, {
            type: 'action',
            action: 'show-actions',
            origin,
            continuationAllowed: true,
        });
    assert.equal(transition(start(), 'tap').capture, 'paused');
    assert.equal(transition(reduce(start(), { type: 'input', value: 'partial' })).capture, 'paused');
    const paused = reduce(start(), { type: 'pause', reason: 'window blur' });
    assert.deepEqual(transition(paused), paused);
    assert.equal(transition({ ...start(), uncertain: true }).capture, 'paused');
    const draining = action(
        reduce(reduce(start(), { type: 'input', value: 'partial' }), {
            type: 'pause',
            reason: 'blur',
        }),
        'resume'
    );
    assert.equal(draining.capture, 'draining');
    assert.deepEqual(transition(draining), draining);
    const discarded = reduce(reduce(draining, { type: 'input', value: 'inventory-action:v1:show-actions' }), {
        type: 'delimiter',
        continuationAllowed: true,
    });
    assert.equal(discarded.mode, 'inspect-demo');
    assert.equal(discarded.reads.at(-1).outcome, 'discarded');
    for (const continuationAllowed of [undefined, false]) {
        const s = reduce(reduce(start(), { type: 'input', value: 'inventory-action:v1:show-actions' }), {
            type: 'delimiter',
            continuationAllowed,
        });
        assert.equal(s.capture, 'paused');
    }
});

test('negative control detects removal of verified-context gate', async () => {
    const mutated = source.replace('event.continuationAllowed === true &&', 'true &&');
    assert.notEqual(mutated, source);
    const unsafe = await load(mutated);
    const check = (model) => {
        const started = model.reduce(model.initialState(), {
            type: 'action',
            action: 'start',
            origin: 'tap',
            localGesture: true,
        });
        const s = model.reduce(model.reduce(started, { type: 'input', value: 'inventory-action:v1:show-actions' }), {
            type: 'delimiter',
        });
        assert.equal(s.capture, 'paused');
    };
    check({ reduce, initialState });
    assert.throws(() => check(unsafe), /ready/);
});

test('capitalized action remains rejected with exact raw text and actionable case guidance', () => {
    const incoming = 'Inventory-action:v1:inspect-demo';
    const state = scan(start(), incoming);
    assert.equal(state.reads.at(-1).kind, 'invalid');
    assert.equal(state.reads.at(-1).value, incoming);
    assert.match(state.reads.at(-1).detail, /capitalization differs/);
    assert.match(state.reads.at(-1).detail, /inventory-action:v1:inspect-demo/);
    assert.equal(state.actions.length, 1); // Only explicit Start, never the rejected action.
    assert.equal(scan(state, 'inventory-action:v1:inspect-demo').reads.at(-1).kind, 'command');
});

test('interrupted and unsafe capture retain bounded raw diagnostic text without resolution', () => {
    let state = reduce(start(), { type: 'input', value: '<script>partial</script>' });
    state = reduce(state, { type: 'timeout' });
    assert.equal(state.reads.at(-1).value, '<script>partial</script>');
    assert.equal(state.capture, 'paused');
    assert.match(state.reads.at(-1).detail, /timed out/);
    state = reduce(start(), { type: 'input', value: 'x'.repeat(limits.frame + 1) });
    assert.equal(state.reads.at(-1).value.length, limits.frame);
    assert.match(state.reason, /retained prefix only/);
    assert.equal(state.reads.at(-1).outcome, 'rejected');
});
