import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import ts from '../meteor-app/node_modules/typescript/lib/typescript.js';

const output = mkdtempSync(join(tmpdir(), 'inventory-agent-unit-'));
for (const file of ['service', 'http']) {
    const source = readFileSync(new URL(`../meteor-app/server/agent/${file}.ts`, import.meta.url), 'utf8');
    writeFileSync(
        join(output, `${file}.js`),
        ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText
    );
}
const require = createRequire(import.meta.url);
const { createAgentService, version, identityKey, AgentError } = require(join(output, 'service.js'));
const { createAgentHandler } = require(join(output, 'http.js'));
process.on('exit', () => rmSync(output, { recursive: true, force: true }));

function fixture(options = {}) {
    const items = new Map(),
        tags = new Map(),
        events = new Map(),
        bindings = new Map();
    let lock,
        failComplete = false;
    const copy = structuredClone;
    const backend = {
        getTag: async (id) => copy(tags.get(id)),
        tags: async (parent, name, after, limit) =>
            copy(
                [...tags.values()]
                    .filter(
                        (t) =>
                            (parent === undefined || t.parentTagId === parent) &&
                            (name === undefined || t.name.toLowerCase().includes(name.toLowerCase())) &&
                            (after === undefined || t._id > after)
                    )
                    .sort((a, b) => (a._id < b._id ? -1 : 1))
                    .slice(0, limit)
            ),
        taggedItems: async (tagId, after, limit) =>
            copy(
                [...items.values()]
                    .filter(
                        (i) =>
                            i.deletedAt === undefined &&
                            i.tagIds.includes(tagId) &&
                            (after === undefined || i._id > after)
                    )
                    .sort((a, b) => (a._id < b._id ? -1 : 1))
                    .slice(0, limit)
            ),
        createTag: async (input, id) => {
            assert(!tags.has(id));
            tags.set(id, {
                ...input,
                _id: id,
                parentTagId: input.parentTagId ?? '',
                path: [...(tags.get(input.parentTagId)?.path ?? []), { _id: id, name: input.name }],
                createdAt: new Date(),
                modifiedAt: new Date(),
            });
            return id;
        },
        get: async (id) => {
            const item = items.get(id);
            return item?.deletedAt === undefined ? copy(item) : undefined;
        },
        getIncludingDeleted: async (id) => copy(items.get(id)),
        search: async (name) =>
            copy([...items.values()].filter((i) => i.deletedAt === undefined && i.name.includes(name))),
        children: async (parent, after, limit) =>
            copy(
                [...items.values()]
                    .filter(
                        (i) =>
                            i.deletedAt === undefined &&
                            (i.containerId ?? null) === parent &&
                            (after === undefined || i._id > after)
                    )
                    .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
                    .slice(0, limit)
            ),
        identities: async (id) => copy([...bindings.values()].filter((b) => b.itemId === id).map((b) => b.identity)),
        resolve: async (identity) => bindings.get(identityKey(identity))?.itemId,
        event: async (id) => copy(events.get(id)),
        history: async (id) => copy([...events.values()].filter((e) => e.itemId === id)),
        lock: async (id) => {
            if (lock) return false;
            lock = id;
            return true;
        },
        unlock: async (id) => {
            if (lock === id) lock = undefined;
        },
        reserve: async (event) => {
            assert(!events.has(event._id));
            events.set(event._id, copy(event));
        },
        rotateDeleteAuthorization: async (event) => {
            const existing = events.get(event._id);
            if (existing?.fingerprint !== event.fingerprint || existing.status !== 'prepared') return false;
            events.set(event._id, copy(event));
            return true;
        },
        complete: async (event) => {
            if (failComplete) throw Error('injected post-write crash');
            events.set(event._id, copy(event));
        },
        beginDeleteConfirmation: async (requestId, confirmationFingerprint, attemptedAt) => {
            const prepared = events.get(requestId);
            if (prepared?.status !== 'prepared' || prepared.deletionAuthorizationHash === undefined) return undefined;
            events.set(requestId, {
                ...prepared,
                status: 'pending',
                confirmationFingerprint,
                deletionAuthorizationAttemptedAt: attemptedAt,
                deletionAuthorizationHash: undefined,
            });
            return copy({
                ...prepared,
                status: 'pending',
                confirmationFingerprint,
                deletionAuthorizationAttemptedAt: attemptedAt,
            });
        },
        validate: async (request) => {
            if (request.op === 'createTag') {
                if (request.tag.parentTagId && !tags.has(request.tag.parentTagId))
                    throw new AgentError('not_found', 'Parent tag missing');
                if ([...tags.values()].some((t) => t.name.toLowerCase() === request.tag.name.trim().toLowerCase()))
                    throw new AgentError('conflict', 'Duplicate tag');
            }
            const parentId = request.item?.containerId ?? (request.op === 'move' ? request.containerId : undefined);
            if (parentId && !items.get(parentId)?.isContainer)
                throw new AgentError('invalid_input', 'Parent must be a container');
            const seen = new Set([request.itemId]);
            let parent = parentId;
            while (parent) {
                if (seen.has(parent)) throw new AgentError('invalid_input', 'Cycle');
                seen.add(parent);
                parent = items.get(parent)?.containerId;
            }
        },
        create: async (input, id) => {
            assert(!items.has(id));
            items.set(id, {
                ...input,
                name: input.name.trim(),
                _id: id,
                tagIds: input.tagIds ?? [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            });
            return id;
        },
        update: async (before, changes) => {
            if (version(items.get(before._id)) !== version(before)) return false;
            items.set(before._id, { ...before, ...changes, modifiedAt: new Date() });
            return true;
        },
        move: async (before, parent) => {
            if (version(items.get(before._id)) !== version(before)) return false;
            items.set(before._id, { ...before, containerId: parent ?? undefined, modifiedAt: new Date() });
            return true;
        },
        setLocked: async (before, locked) => {
            if (version(items.get(before._id)) !== version(before)) return false;
            items.set(before._id, { ...before, locked, modifiedAt: new Date() });
            return true;
        },
        logicalDelete: async (before, request, deletedAt) => {
            if (version(items.get(before._id)) !== version(before)) return false;
            items.set(before._id, {
                ...before,
                deletedAt,
                deletedByRequestId: request.requestId,
                deletedBy: request.source,
                ...(request.note === undefined ? {} : { deletionNote: request.note }),
                modifiedAt: deletedAt,
            });
            return true;
        },
        activeChildCount: async (itemId) =>
            [...items.values()].filter((item) => item.deletedAt === undefined && item.containerId === itemId).length,
        bind: async (identity, itemId) => {
            const old = bindings.get(identityKey(identity));
            assert(!old || old.itemId === itemId);
            bindings.set(identityKey(identity), { identity, itemId });
        },
    };
    return {
        execute: createAgentService(backend, options),
        items,
        tags,
        events,
        backend,
        crash: () => {
            failComplete = true;
        },
        recover: () => {
            failComplete = false;
        },
    };
}
const source = { system: 'synthetic-unit', reference: 'fictional-fixture' };
const create = (requestId, name, extra = {}) => ({
    op: 'create',
    requestId,
    source,
    item: { name, isContainer: false, ...extra },
});
const rejects = async (action, code) => await assert.rejects(action, (error) => error.code === code);
const prepareDelete = async (execute, requestId, readback, extra = {}) =>
    await execute({
        op: 'prepareDelete',
        requestId,
        source,
        itemId: readback.item._id,
        expectedVersion: readback.version,
        ...extra,
    });
const confirmDelete = async (execute, requestId, deletionAuthorizationId) =>
    await execute({ op: 'confirmDelete', requestId, deletionAuthorizationId });

test('nested items, source and visible notes, identity lookup, correction and move history', async () => {
    const f = fixture();
    const room = (await f.execute(create('room', 'Fictional Room', { isContainer: true }))).result;
    const box = (await f.execute(create('box', 'Fictional Box', { isContainer: true, containerId: room.item._id })))
        .result;
    const item = (
        await f.execute(create('item', 'Fictional Cable', { containerId: box.item._id, description: 'Blue cable' }))
    ).result;
    assert.equal(item.item.containerId, box.item._id);
    const identity = { namespace: 'synthetic-sticker', value: '00000000-0000-4000-8000-000000000001' };
    await f.execute({
        op: 'bindIdentity',
        requestId: 'bind',
        source,
        itemId: item.item._id,
        expectedVersion: item.version,
        externalIdentity: identity,
    });
    const lookup = await f.execute({ op: 'lookup', externalIdentity: identity });
    assert.deepEqual(lookup.result.items[0].externalIdentities, [identity]);
    const corrected = await f.execute({
        op: 'update',
        requestId: 'correct',
        source,
        itemId: item.item._id,
        expectedVersion: item.version,
        changes: { description: 'Green cable' },
        note: 'Corrected observed color',
    });
    const moved = await f.execute({
        op: 'move',
        requestId: 'move',
        source,
        itemId: item.item._id,
        expectedVersion: corrected.result.version,
        containerId: room.item._id,
    });
    assert.equal(moved.result.item.containerId, room.item._id);
    const events = (await f.execute({ op: 'history', itemId: item.item._id })).result.events;
    assert.equal(events.length, 4);
    assert.equal(events[2].before.item.description, 'Blue cable');
    assert.equal(events[2].after.item.description, 'Green cable');
    assert.equal(events[2].request.note, 'Corrected observed color');
    assert.deepEqual(events[2].request.source, source);
});

test('exact replay survives service restart and changed payload conflicts', async () => {
    const f = fixture(),
        request = create('once', 'Fixture');
    const first = await f.execute(request);
    const restarted = createAgentService(f.backend);
    const repeated = await restarted({ item: request.item, source, requestId: 'once', op: 'create' });
    assert.equal(repeated.replayed, true);
    assert.deepEqual(repeated.result, first.result);
    assert.equal(f.items.size, 1);
    await rejects(() => restarted(create('once', 'Different')), 'conflict');
});

test('stale correction and external identity reuse conflict without mutation', async () => {
    const f = fixture();
    const a = (await f.execute(create('a', 'A'))).result;
    const b = (await f.execute(create('b', 'B'))).result;
    const request = {
        op: 'update',
        requestId: 'u1',
        source,
        itemId: a.item._id,
        expectedVersion: a.version,
        changes: { name: 'Corrected A' },
    };
    await f.execute(request);
    await rejects(() => f.execute({ ...request, requestId: 'u2', changes: { name: 'Stale' } }), 'conflict');
    const identity = { namespace: 'synthetic', value: 'existing' };
    await f.execute({
        op: 'bindIdentity',
        requestId: 'b1',
        source,
        itemId: b.item._id,
        expectedVersion: b.version,
        externalIdentity: identity,
    });
    await rejects(() => f.execute({ ...create('c', 'C'), externalIdentity: identity }), 'conflict');
    assert.equal(f.items.size, 2);
});

test('crash after inventory mutation before ledger completion stays indeterminate across restart', async () => {
    const f = fixture(),
        request = create('crash', 'Fictional Crash Fixture');
    f.crash();
    await rejects(() => f.execute(request), 'indeterminate');
    assert.equal(f.items.size, 1);
    const restarted = createAgentService(f.backend);
    await rejects(() => restarted(request), 'indeterminate');
    await rejects(() => restarted(create('new-key', 'Fictional Crash Fixture')), 'busy');
    const status = await restarted({ op: 'status', requestId: 'crash' });
    assert.equal(status.result.event.status, 'pending');
    const read = await restarted({ op: 'get', itemId: status.result.event.itemId });
    assert.equal(read.result.item.name, 'Fictional Crash Fixture');
    assert.equal(f.items.size, 1);
});

test('two-step deletion retains the record, identities and history while hiding ordinary reads', async () => {
    const instant = new Date('2026-09-24T12:00:00.000Z');
    const f = fixture({ now: () => new Date(instant), random: (size) => Buffer.alloc(size, 7) });
    const created = (await f.execute(create('delete-create', 'Retained fixture'))).result;
    const identity = { namespace: 'synthetic-sticker', value: 'retained-identity' };
    const bound = (
        await f.execute({
            op: 'bindIdentity',
            requestId: 'delete-bind',
            source,
            itemId: created.item._id,
            expectedVersion: created.version,
            externalIdentity: identity,
        })
    ).result;
    const prepared = await prepareDelete(f.execute, 'delete-request', bound, { note: 'Synthetic retirement' });
    assert.equal(prepared.result.expiresAt.getTime() - instant.getTime(), 5 * 60 * 1000);
    assert.equal(
        JSON.stringify(f.events.get('delete-request')).includes(prepared.result.deletionAuthorizationId),
        false
    );

    const confirmed = await confirmDelete(f.execute, 'delete-request', prepared.result.deletionAuthorizationId);
    assert.equal(confirmed.result.item.deletedByRequestId, 'delete-request');
    assert.deepEqual(confirmed.result.item.deletedBy, source);
    assert.equal(confirmed.result.item.deletionNote, 'Synthetic retirement');
    assert.equal(f.items.size, 1);
    await rejects(() => f.execute({ op: 'get', itemId: created.item._id }), 'not_found');
    assert.deepEqual((await f.execute({ op: 'lookup', name: 'Retained' })).result.items, []);
    assert.deepEqual((await f.execute({ op: 'lookup', externalIdentity: identity })).result.items, []);
    const audit = await f.execute({ op: 'auditGet', itemId: created.item._id });
    assert.deepEqual(audit.result.externalIdentities, [identity]);
    assert.equal(audit.result.item.deletedAt.toISOString(), instant.toISOString());
    assert.equal(f.events.get('delete-request').deletionAuthorizationHash, undefined);
    assert.equal(
        (await confirmDelete(f.execute, 'delete-request', prepared.result.deletionAuthorizationId)).replayed,
        true
    );
    assert.equal((await f.execute({ op: 'history', itemId: created.item._id })).result.events.length, 3);
});

test('delete authorization expires at the exact five-minute boundary and can be refreshed under the same intent', async () => {
    let instant = new Date('2026-09-24T12:00:00.000Z');
    let authorizationSeed = 10;
    const options = { now: () => new Date(instant), random: (size) => Buffer.alloc(size, ++authorizationSeed) };
    const f = fixture(options);
    const first = (await f.execute(create('expiry-create', 'Expiry fixture'))).result;
    const prepared = await prepareDelete(f.execute, 'expiry-delete', first);
    instant = new Date('2026-09-24T12:05:00.000Z');
    await rejects(
        () => confirmDelete(f.execute, 'expiry-delete', prepared.result.deletionAuthorizationId),
        'authorization_expired'
    );
    assert.equal(f.items.get(first.item._id).deletedAt, undefined);
    assert.equal(f.events.get('expiry-delete').deletionAuthorizationHash, undefined);

    const refreshed = await prepareDelete(f.execute, 'expiry-delete', first);
    assert.notEqual(refreshed.result.deletionAuthorizationId, prepared.result.deletionAuthorizationId);
    assert.equal(refreshed.result.expiresAt.toISOString(), '2026-09-24T12:10:00.000Z');
    await rejects(
        () => confirmDelete(f.execute, 'expiry-delete', prepared.result.deletionAuthorizationId),
        'invalid_authorization'
    );
    const refreshedAgain = await prepareDelete(f.execute, 'expiry-delete', first);
    await confirmDelete(f.execute, 'expiry-delete', refreshedAgain.result.deletionAuthorizationId);
    assert.equal(f.items.get(first.item._id).deletedByRequestId, 'expiry-delete');

    instant = new Date('2026-09-24T13:00:00.000Z');
    const second = (await f.execute(create('valid-create', 'Valid fixture'))).result;
    const valid = await prepareDelete(f.execute, 'valid-delete', second);
    instant = new Date('2026-09-24T13:04:59.999Z');
    await confirmDelete(f.execute, 'valid-delete', valid.result.deletionAuthorizationId);
    assert(instant.getTime() === f.items.get(second.item._id).deletedAt.getTime());
});

test('matching preparation rotates authorization while changed deletion intent conflicts', async () => {
    let authorizationSeed = 20;
    const f = fixture({ random: (size) => Buffer.alloc(size, ++authorizationSeed) });
    const created = (await f.execute(create('rotation-create', 'Rotation fixture'))).result;
    const first = await prepareDelete(f.execute, 'rotation-delete', created, { note: 'Retire fixture' });
    const second = await prepareDelete(f.execute, 'rotation-delete', created, { note: 'Retire fixture' });
    assert.notEqual(first.result.deletionAuthorizationId, second.result.deletionAuthorizationId);
    await rejects(
        () => confirmDelete(f.execute, 'rotation-delete', first.result.deletionAuthorizationId),
        'invalid_authorization'
    );
    const third = await prepareDelete(f.execute, 'rotation-delete', created, { note: 'Retire fixture' });
    await rejects(() => prepareDelete(f.execute, 'rotation-delete', created, { note: 'Changed intent' }), 'conflict');
    await confirmDelete(f.execute, 'rotation-delete', third.result.deletionAuthorizationId);
});

test('successful confirmation replays before and after authorization expiry but rejects a mismatched token', async () => {
    let instant = new Date('2026-09-24T12:00:00.000Z');
    const f = fixture({ now: () => new Date(instant), random: (size) => Buffer.alloc(size, 31) });
    const created = (await f.execute(create('completed-create', 'Completed fixture'))).result;
    const prepared = await prepareDelete(f.execute, 'completed-delete', created);
    const confirmation = await confirmDelete(f.execute, 'completed-delete', prepared.result.deletionAuthorizationId);
    assert.equal(
        (await confirmDelete(f.execute, 'completed-delete', prepared.result.deletionAuthorizationId)).replayed,
        true
    );
    instant = new Date('2026-09-24T12:30:00.000Z');
    const replay = await confirmDelete(f.execute, 'completed-delete', prepared.result.deletionAuthorizationId);
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.result, confirmation.result);
    await rejects(() => confirmDelete(f.execute, 'completed-delete', 'mismatched-token'), 'conflict');
    assert.equal(f.items.size, 1);
});

test('wrong authorization, stale version, locks and gained children consume authorization without deletion', async () => {
    const f = fixture({ random: (size) => Buffer.alloc(size, 13) });
    const wrong = (await f.execute(create('wrong-create', 'Wrong token fixture'))).result;
    const wrongPrepared = await prepareDelete(f.execute, 'wrong-delete', wrong);
    await rejects(() => confirmDelete(f.execute, 'wrong-delete', 'not-the-token'), 'invalid_authorization');
    await rejects(
        () => confirmDelete(f.execute, 'wrong-delete', wrongPrepared.result.deletionAuthorizationId),
        'conflict'
    );
    assert.equal(f.items.get(wrong.item._id).deletedAt, undefined);

    const stale = (await f.execute(create('stale-create', 'Stale fixture'))).result;
    const stalePrepared = await prepareDelete(f.execute, 'stale-delete', stale);
    f.items.set(stale.item._id, { ...f.items.get(stale.item._id), description: 'Concurrent change' });
    await rejects(
        () => confirmDelete(f.execute, 'stale-delete', stalePrepared.result.deletionAuthorizationId),
        'conflict'
    );

    const locked = (await f.execute(create('locked-create', 'Locked fixture'))).result;
    const lockedPrepared = await prepareDelete(f.execute, 'locked-delete', locked);
    f.items.set(locked.item._id, { ...f.items.get(locked.item._id), locked: true });
    await rejects(
        () => confirmDelete(f.execute, 'locked-delete', lockedPrepared.result.deletionAuthorizationId),
        'conflict'
    );

    const container = (await f.execute(create('container-create', 'Container', { isContainer: true }))).result;
    const childPrepared = await prepareDelete(f.execute, 'children-delete', container);
    await f.execute(create('late-child', 'Late child', { containerId: container.item._id }));
    await rejects(
        () => confirmDelete(f.execute, 'children-delete', childPrepared.result.deletionAuthorizationId),
        'conflict'
    );
    assert.equal(f.items.get(container.item._id).deletedAt, undefined);
});

test('exact delete confirmation recovers an interrupted ledger completion without a second mutation', async () => {
    const options = { random: (size) => Buffer.alloc(size, 17) };
    const f = fixture(options);
    const created = (await f.execute(create('recovery-create', 'Recovery fixture'))).result;
    const prepared = await prepareDelete(f.execute, 'recovery-delete', created);
    f.crash();
    await rejects(
        () => confirmDelete(f.execute, 'recovery-delete', prepared.result.deletionAuthorizationId),
        'indeterminate'
    );
    const retained = f.items.get(created.item._id);
    assert.equal(retained.deletedByRequestId, 'recovery-delete');
    f.recover();
    const restarted = createAgentService(f.backend, options);
    const recovered = await confirmDelete(restarted, 'recovery-delete', prepared.result.deletionAuthorizationId);
    assert.equal(recovered.replayed, true);
    assert.equal(f.items.size, 1);
    assert.equal(f.events.get('recovery-delete').status, 'completed');
});

test('concurrent delete confirmations produce one tombstone and one terminal ledger result', async () => {
    const f = fixture({ random: (size) => Buffer.alloc(size, 19) });
    const created = (await f.execute(create('concurrent-delete-create', 'Concurrent delete fixture'))).result;
    const prepared = await prepareDelete(f.execute, 'concurrent-delete', created);
    const outcomes = await Promise.allSettled([
        confirmDelete(f.execute, 'concurrent-delete', prepared.result.deletionAuthorizationId),
        confirmDelete(f.execute, 'concurrent-delete', prepared.result.deletionAuthorizationId),
    ]);
    assert(outcomes.some((outcome) => outcome.status === 'fulfilled'));
    assert.equal(f.items.size, 1);
    assert.equal(f.items.get(created.item._id).deletedByRequestId, 'concurrent-delete');
    assert.equal(f.events.get('concurrent-delete').status, 'completed');
});

test('invalid parent, cycles and malformed input do not reserve requests', async () => {
    const f = fixture();
    const root = (await f.execute(create('root', 'Root', { isContainer: true }))).result;
    const child = (await f.execute(create('child', 'Child', { isContainer: true, containerId: root.item._id }))).result;
    await rejects(
        () =>
            f.execute({
                op: 'move',
                requestId: 'cycle',
                source,
                itemId: root.item._id,
                expectedVersion: root.version,
                containerId: child.item._id,
            }),
        'invalid_input'
    );
    await rejects(() => f.execute(create('bad', 'Bad', { containerId: 'missing' })), 'invalid_input');
    await rejects(() => f.execute({ op: 'lookup', name: '' }), 'invalid_input');
    await rejects(() => f.execute({ ...create('unknown', 'Bad'), extra: true }), 'invalid_input');
    await rejects(() => f.execute({ ...create('source', 'Bad'), source: { system: 'test' } }), 'invalid_input');
    assert.equal(f.events.size, 2);
});

test('simultaneous duplicate requests cannot create twice', async () => {
    const f = fixture(),
        request = create('concurrent', 'Same');
    const outcomes = await Promise.allSettled([f.execute(request), f.execute(request)]);
    assert(outcomes.some((o) => o.status === 'fulfilled'));
    assert.equal(f.items.size, 1);
    assert.equal((await f.execute(request)).replayed, true);
});

async function http({
    token = 'x'.repeat(32),
    allowMeteorDevelopmentProxy = false,
    auth = `Bearer ${'x'.repeat(32)}`,
    address = '127.0.0.1',
    headers = {},
    body = '{"op":"lookup","name":"Fixture"}',
    method = 'POST',
} = {}) {
    const req = Readable.from([Buffer.from(body)]);
    req.socket = { remoteAddress: address };
    req.method = method;
    req.headers = { authorization: auth, 'content-type': 'application/json', ...headers };
    let status, response;
    await createAgentHandler(
        token,
        async () => ({ ok: true, result: 'synthetic' }),
        allowMeteorDevelopmentProxy
    )(req, {
        writeHead: (code) => {
            status = code;
        },
        end: (text) => {
            response = JSON.parse(text);
        },
    });
    return { status, response };
}

test('HTTP requires opt-in, bearer auth and loopback with no browser/proxy headers', async () => {
    assert.equal((await http()).status, 200);
    assert.equal((await http({ token: '' })).status, 404);
    assert.equal((await http({ auth: '' })).status, 401);
    assert.equal((await http({ address: '192.0.2.1' })).status, 403);
    assert.equal((await http({ headers: { origin: 'http://localhost:3000' } })).status, 403);
    assert.equal((await http({ headers: { 'x-forwarded-for': '192.0.2.1' } })).status, 403);
    assert.equal((await http({ method: 'GET' })).status, 405);
    assert.equal((await http({ body: 'invalid' })).status, 400);
    assert.equal((await http({ body: ' '.repeat(32769) })).status, 413);
});

test('Meteor dev proxy accepts one verified loopback hop, retaining auth and production isolation', async () => {
    const headers = {
        'x-forwarded-for': '127.0.0.1',
        'x-forwarded-proto': 'http',
        'x-forwarded-port': '3289',
        'x-forwarded-host': '127.0.0.1:3289',
    };
    assert.equal((await http({ headers, allowMeteorDevelopmentProxy: true })).status, 200);
    assert.equal((await http({ headers, allowMeteorDevelopmentProxy: true, auth: '' })).status, 401);
    assert.equal((await http({ headers })).status, 403); // Production/default mode never trusts the proxy.
    for (const spoof of ['192.0.2.1', '127.0.0.1,127.0.0.1', '192.0.2.1,127.0.0.1', '127.0.0.1,192.0.2.1']) {
        assert.equal(
            (await http({ headers: { ...headers, 'x-forwarded-for': spoof }, allowMeteorDevelopmentProxy: true }))
                .status,
            403
        );
    }
    assert.equal((await http({ headers, address: '192.0.2.1', allowMeteorDevelopmentProxy: true })).status, 403);
    assert.equal(
        (await http({ headers: { ...headers, origin: 'http://127.0.0.1:3289' }, allowMeteorDevelopmentProxy: true }))
            .status,
        403
    );
    assert.equal(
        (await http({ headers: { ...headers, forwarded: 'for=127.0.0.1' }, allowMeteorDevelopmentProxy: true })).status,
        403
    );
    assert.equal(
        (await http({ headers: { ...headers, 'x-forwarded-proto': 'http,http' }, allowMeteorDevelopmentProxy: true }))
            .status,
        403
    );
});

test('live hierarchy discovers new descendants and moves without intake receipts; reads do not mutate', async () => {
    const f = fixture();
    const home = (await f.execute(create('home', 'Fictional home', { isContainer: true }))).result.item;
    const floor = (await f.execute(create('floor', 'Second floor', { isContainer: true, containerId: home._id })))
        .result.item;
    const room = (await f.execute(create('room', 'Study', { isContainer: true, containerId: floor._id }))).result;
    const other = (await f.execute(create('other', 'Other home', { isContainer: true }))).result.item;
    const tree = () => f.execute({ op: 'hierarchy', itemId: home._id });
    assert.deepEqual(
        (await tree()).result.items.map((r) => r.item.name),
        ['Second floor', 'Study']
    );
    const added = (await f.execute(create('new', 'New room', { isContainer: true, containerId: floor._id }))).result
        .item;
    await f.execute(create('contents', 'Chair', { containerId: added._id }));
    assert.equal((await tree()).result.items.length, 4);
    await f.execute({
        op: 'move',
        requestId: 'move-room',
        source,
        itemId: room.item._id,
        expectedVersion: room.version,
        containerId: other._id,
    });
    const before = structuredClone({ items: [...f.items], events: [...f.events] });
    const result = (await tree()).result;
    assert.equal(result.root.item._id, home._id);
    assert.deepEqual(new Set(result.items.map((r) => r.item.name)), new Set(['Second floor', 'New room', 'Chair']));
    assert.deepEqual(
        (await f.execute({ op: 'children', containerId: home._id })).result.items.map((r) => r.item.name),
        ['Second floor']
    );
    assert.equal((await f.execute({ op: 'children', containerId: added._id })).result.items[0].item.name, 'Chair');
    assert.deepEqual({ items: [...f.items], events: [...f.events] }, before);
});

test('children pagination covers large sibling sets and root items without silently dropping rows', async () => {
    const f = fixture();
    const home = (await f.execute(create('root', 'Home', { isContainer: true }))).result.item;
    for (let n = 0; n < 105; n++) {
        const id = 'sibling-' + String(n).padStart(3, '0');
        f.items.set(id, { ...home, _id: id, name: id, containerId: home._id, isContainer: false });
    }
    const first = (await f.execute({ op: 'children', containerId: home._id })).result;
    assert.equal(first.items.length, 100);
    assert.equal(first.nextCursor, 'sibling-099');
    const second = (await f.execute({ op: 'children', containerId: home._id, after: first.nextCursor })).result;
    assert.equal(second.items.length, 5);
    assert.equal(second.nextCursor, null);
    assert.equal((await f.execute({ op: 'hierarchy', itemId: home._id })).result.items.length, 105);
    assert.deepEqual(
        (await f.execute({ op: 'children', containerId: null })).result.items.map((r) => r.item._id),
        [home._id]
    );
    await rejects(() => f.execute({ op: 'hierarchy', itemId: home._id, maxNodes: 104 }), 'limit_exceeded');
    assert.equal((await f.execute({ op: 'hierarchy', itemId: home._id, maxNodes: 105 })).result.items.length, 105);
});

test('hierarchy rejects cycles, invalid selectors and missing or noncontainer roots', async () => {
    const f = fixture();
    const home = (await f.execute(create('h', 'Home', { isContainer: true }))).result.item;
    const room = (await f.execute(create('r', 'Room', { isContainer: true, containerId: home._id }))).result.item;
    const item = (await f.execute(create('i', 'Cable'))).result.item;
    for (const request of [
        { op: 'children' },
        { op: 'children', containerId: null, limit: 0 },
        { op: 'children', containerId: null, limit: 101 },
        { op: 'children', containerId: null, after: '' },
        { op: 'hierarchy', itemId: home._id, maxNodes: 1001 },
        { op: 'hierarchy', itemId: home._id, maxNodes: 1.5 },
        { op: 'hierarchy', itemId: item._id },
        { op: 'children', containerId: item._id },
    ])
        await rejects(() => f.execute(request), 'invalid_input');
    await rejects(() => f.execute({ op: 'hierarchy', itemId: 'missing' }), 'not_found');
    f.items.set(home._id, { ...home, containerId: room._id });
    await rejects(() => f.execute({ op: 'hierarchy', itemId: home._id }), 'conflict');
});

test('tag hierarchy, literal discovery, assignment, removal, replay and stale guards', async () => {
    const f = fixture();
    const payload = { op: 'createTag', requestId: 'tag-root', source, tag: { name: 'Occupant' } };
    const root = (await f.execute(payload)).result;
    const child = (
        await f.execute({
            op: 'createTag',
            requestId: 'tag-child',
            source,
            tag: { name: 'Person [A]', parentTagId: root.tag._id },
        })
    ).result;
    assert.deepEqual(
        child.tag.path.map((t) => t._id),
        [root.tag._id, child.tag._id]
    );
    assert.equal((await createAgentService(f.backend)(payload)).replayed, true);
    await rejects(() => f.execute({ ...payload, tag: { name: 'Different' } }), 'conflict');
    await rejects(() => f.execute({ ...payload, requestId: 'duplicate', tag: { name: 'occupant' } }), 'conflict');
    await rejects(
        () => f.execute({ ...payload, requestId: 'orphan', tag: { name: 'Orphan', parentTagId: 'missing' } }),
        'not_found'
    );
    assert.deepEqual((await f.execute({ op: 'tags', name: '[A]' })).result.tags, [child]);
    assert.deepEqual((await f.execute({ op: 'tags', parentTagId: root.tag._id })).result.tags, [child]);
    const a = (await f.execute(create('tag-item-a', 'A', { tagIds: [child.tag._id] }))).result;
    const b = (await f.execute(create('tag-item-b', 'B'))).result;
    const assign = {
        op: 'update',
        requestId: 'assign-tags',
        source,
        itemId: b.item._id,
        expectedVersion: b.version,
        changes: { tagIds: [child.tag._id] },
    };
    const updated = (await f.execute(assign)).result;
    assert.deepEqual((await f.execute(assign)).result, updated);
    assert.deepEqual((await f.execute({ op: 'taggedItems', tagId: root.tag._id })).result.items, []);
    const first = (await f.execute({ op: 'taggedItems', tagId: child.tag._id, limit: 1 })).result;
    const second = (await f.execute({ op: 'taggedItems', tagId: child.tag._id, limit: 1, after: first.nextCursor }))
        .result;
    assert.deepEqual([...first.items, ...second.items].map((r) => r.item._id).sort(), [a.item._id, b.item._id].sort());
    assert.equal(second.nextCursor, null);
    await rejects(() => f.execute({ ...assign, requestId: 'stale-tags', changes: { tagIds: [] } }), 'conflict');
    await rejects(
        () =>
            f.execute({
                ...assign,
                requestId: 'missing-tag',
                expectedVersion: updated.version,
                changes: { tagIds: ['missing'] },
            }),
        'not_found'
    );
    await rejects(
        () => f.execute(create('duplicate-ids', 'Bad', { tagIds: [child.tag._id, child.tag._id] })),
        'invalid_input'
    );
    const removed = (
        await f.execute({
            ...assign,
            requestId: 'remove-tags',
            expectedVersion: updated.version,
            changes: { tagIds: [] },
        })
    ).result;
    assert.deepEqual(removed.item.tagIds, []);
    const history = (await f.execute({ op: 'history', itemId: b.item._id })).result.events;
    assert.deepEqual(history[1].before.item.tagIds, []);
    assert.deepEqual(history[1].after.item.tagIds, [child.tag._id]);
    assert.equal(f.tags.size, 2);
});

test('tag creation crash exposes deterministic candidate and blocks duplicate retry', async () => {
    const f = fixture();
    const request = { op: 'createTag', requestId: 'tag-crash', source, tag: { name: 'Crash tag' } };
    f.crash();
    await rejects(() => f.execute(request), 'indeterminate');
    const event = (await f.execute({ op: 'status', requestId: request.requestId })).result.event;
    assert.equal((await f.execute({ op: 'getTag', tagId: event.tagId })).result.tag.name, 'Crash tag');
    await rejects(() => createAgentService(f.backend)(request), 'indeterminate');
    assert.equal(f.tags.size, 1);
});

test('tag pagination and malformed requests are bounded and read only', async () => {
    const f = fixture();
    for (let i = 0; i < 105; i++)
        await f.execute({ op: 'createTag', requestId: `paged-tag-${i}`, source, tag: { name: `Tag ${i}` } });
    const first = (await f.execute({ op: 'tags' })).result;
    const last = (await f.execute({ op: 'tags', after: first.nextCursor })).result;
    assert.equal(first.tags.length, 100);
    assert.equal(last.tags.length, 5);
    assert.equal(last.nextCursor, null);
    assert.equal(f.events.size, 105);
    for (const request of [
        { op: 'tags', limit: 0 },
        { op: 'getTag' },
        { op: 'taggedItems', tagId: 'missing' },
        { op: 'createTag', requestId: 'bad', source, tag: { name: ' ', extra: true } },
        { ...create('bad-array', 'Bad'), item: { name: 'Bad', isContainer: false, tagIds: 'oops' } },
    ])
        await assert.rejects(() => f.execute(request));
    assert.equal(f.events.size, 105);
});
