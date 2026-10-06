import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const dir = new URL('../meteor-app/imports/ui/ScannerFoundation/', import.meta.url);
const compile = (text) =>
    ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
        .outputText;
const asURL = (text) => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const model = asURL(compile(await readFile(new URL('model.ts', dir), 'utf8')));
const source = await readFile(new URL('moveSimulation.ts', dir), 'utf8');
async function load(text = source) {
    return import(asURL(compile(text).replace("'./model'", JSON.stringify(model))));
}
const { initialMoveState, reduceMove, itemA, itemB, containerA, containerB } = await load();
const act = (s, action) => reduceMove(s, { type: 'action', action, origin: 'tap', localGesture: true });
const scan = (s, value) =>
    reduceMove(reduceMove(s, { type: 'input', value }), { type: 'delimiter', continuationAllowed: true });
const start = () => act(act(act(initialMoveState(), 'start'), 'move-demo'), 'resume');
const resolveEvent = (s, fail = false) => {
    const r = s.reads.at(-1);
    return {
        type: 'resolve-simulation',
        id: r.id,
        epoch: r.epoch,
        attempt: r.attempt,
        generation: s.intents[r.id].generation,
        fail,
    };
};
const finish = (s) => reduceMove(s, resolveEvent(s));

test('destination-first moves only exact existing identity and retains destination for successive items', () => {
    let s = scan(start(), containerA);
    assert.equal(s.destination, containerA);
    s = finish(scan(s, itemA));
    assert.deepEqual(s.locations, { [itemA]: containerA, [itemB]: 'Demo staging' });
    assert.equal(s.moves[0].from, 'Demo staging');
    s = finish(scan(s, itemB));
    assert.equal(s.destination, containerA);
    assert.equal(s.moves.length, 2);
});
test('identical identity and doubled delimiter cannot duplicate move or quantity', () => {
    let s = finish(scan(scan(start(), containerA), itemA));
    s = reduceMove(s, { type: 'delimiter' });
    assert.equal(s.moves.length, 1);
    s = finish(scan(s, itemA));
    assert.equal(s.moves.length, 1);
    assert.match(s.reads.at(-1).detail, /No-op/u);
    assert.equal(Object.keys(s.locations).length, 2);
});
test('missing destination is visible error without a mutation', () => {
    const s = finish(scan(start(), itemA));
    assert.equal(s.moves.length, 0);
    assert.match(s.reads.at(-1).detail, /container first/u);
});
test('unknown, wrong-prefix, product zeros, malformed commands preserve valid destination', () => {
    let s = scan(start(), containerA);
    for (const value of [
        'container: 99999999-9999-4999-8999-999999999999',
        itemA.replace('item:', 'container:'),
        '00012345678905',
        'https://example.com',
        'Inventory-action:v1:move-demo',
    ]) {
        s = scan(s, value);
        if (s.reads.at(-1).outcome === 'pending') s = finish(s);
        assert.equal(s.destination, containerA);
        assert.equal(s.moves.length, 0);
        assert.equal(s.reads.at(-1).value, value);
    }
});
test('changing destination cancels pending intent; late result cannot retarget', () => {
    let s = scan(scan(start(), containerA), itemA);
    const stale = resolveEvent(s);
    s = scan(s, containerB);
    const before = s;
    assert.deepEqual(reduceMove(s, stale), before);
    assert.equal(s.moves.length, 0);
    assert.equal(s.destination, containerB);
    s = finish(scan(s, itemA));
    assert.equal(s.locations[itemA], containerB);
});
test('reselecting identical destination cancels prior item intent deliberately', () => {
    let s = scan(scan(start(), containerA), itemA);
    const stale = resolveEvent(s);
    s = scan(s, containerA);
    assert.deepEqual(reduceMove(s, stale), s);
    assert.equal(s.moves.length, 0);
});
test('Pause cancels pending moves but retains destination; Resume cannot replay', () => {
    let s = scan(scan(start(), containerA), itemA);
    const stale = resolveEvent(s);
    s = act(s, 'pause');
    assert.equal(s.destination, containerA);
    s = act(s, 'resume');
    assert.deepEqual(reduceMove(s, stale), s);
    assert.equal(s.moves.length, 0);
    s = finish(scan(s, itemA));
    assert.equal(s.moves.length, 1);
});
test('partial timeout cancels pending move; one boundary discarded before rescan', () => {
    let s = scan(scan(start(), containerA), itemA);
    const stale = resolveEvent(s);
    s = reduceMove(reduceMove(s, { type: 'input', value: 'item: partial' }), { type: 'timeout' });
    s = act(s, 'resume');
    assert.equal(s.capture, 'draining');
    s = scan(s, itemB);
    assert.equal(s.reads.at(-1).outcome, 'discarded');
    assert.deepEqual(reduceMove(s, stale), s);
    s = finish(scan(s, itemB));
    assert.equal(s.moves.length, 1);
});
test('mode change/Exit/new session clear destination and ignore old completions', () => {
    for (const action of ['inspect-demo', 'show-actions', 'exit']) {
        let s = scan(scan(start(), containerA), itemA);
        const stale = resolveEvent(s);
        s = act(s, action);
        assert.equal(s.destination, undefined);
        assert.deepEqual(reduceMove(s, stale), s);
        if (action === 'exit') {
            s = act(s, 'start');
            assert.equal(s.destination, undefined);
        }
        assert.equal(s.moves.length, 0);
    }
});
test('failed resolver retains evidence, rescan only; external result/retry cannot commit', () => {
    let s = scan(scan(start(), containerA), itemA);
    const event = resolveEvent(s, true);
    s = reduceMove(s, event);
    assert.equal(s.moves.length, 0);
    assert.equal(s.reads.at(-1).outcome, 'error');
    const read = s.reads.at(-1);
    assert.deepEqual(reduceMove(s, { type: 'retry', id: read.id }), s);
    assert.deepEqual(
        reduceMove(s, {
            type: 'result',
            id: read.id,
            epoch: read.epoch,
            attempt: read.attempt,
            outcome: 'resolved',
            detail: 'bypass',
        }),
        s
    );
});
test('out-of-order completions bind each intent and ignore mismatched epoch/generation', () => {
    let s = scan(scan(start(), containerA), itemA);
    const a = resolveEvent(s);
    s = scan(s, itemB);
    const b = resolveEvent(s);
    assert.deepEqual(reduceMove(s, { ...a, generation: -1 }), s);
    assert.deepEqual(reduceMove(s, { ...a, epoch: -1 }), s);
    s = reduceMove(reduceMove(s, b), a);
    assert.equal(s.moves.length, 2);
    assert.deepEqual(s.locations, { [itemA]: containerA, [itemB]: containerA });
});
test('new fixture state is independent and simulation modules import no persistence/network API', async () => {
    const s = finish(scan(scan(start(), containerA), itemA));
    assert.equal(initialMoveState().locations[itemA], 'Demo staging');
    assert.equal(s.locations[itemA], containerA);
    for (const file of ['moveSimulation.ts', 'ScannerMoveDemo.tsx', 'useCaptureSession.ts']) {
        const text = await readFile(new URL(file, dir), 'utf8');
        assert.doesNotMatch(
            text,
            /from ['"](?:meteor\/|\/imports\/api)|\bfetch\(|localStorage|sessionStorage|Meteor\.call/u
        );
    }
});

test('negative control catches accidental repeated move when no-op guard is removed', async () => {
    const mutant = await load(source.replace('state.locations[read.value] === intent.destination', 'false'));
    const mscan = (s, value) =>
        mutant.reduceMove(mutant.reduceMove(s, { type: 'input', value }), {
            type: 'delimiter',
            continuationAllowed: true,
        });
    let s = scan(start(), containerA);
    s = mscan(s, itemA);
    s = mutant.reduceMove(s, resolveEvent(s));
    s = mscan(s, itemA);
    s = mutant.reduceMove(s, resolveEvent(s));
    assert.throws(() => assert.equal(s.moves.length, 1));
});
