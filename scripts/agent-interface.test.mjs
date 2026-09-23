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

function fixture() {
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
                    .filter((i) => i.tagIds.includes(tagId) && (after === undefined || i._id > after))
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
        get: async (id) => copy(items.get(id)),
        lookupName: async (name) =>
            copy([...items.values()].filter((i) => i.name.toLowerCase().includes(name.toLowerCase())).slice(0, 100)),
        search: async (query, after, limit) => {
            const needle = query.toLowerCase();
            const offset = after === undefined ? 0 : Number(/^offset:(\d+)$/.exec(after)?.[1]);
            const matches = [...items.values()]
                .filter((i) =>
                    [i.name, i.description, ...(i.properties?.searchAliases ?? [])].some((value) =>
                        value?.toLowerCase().includes(needle)
                    )
                )
                .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0));
            const page = matches.slice(offset, offset + limit);
            return copy({
                hits: page.map((item) => ({ item, score: 1, matchedFields: ['description'] })),
                nextCursor: offset + page.length < matches.length ? `offset:${offset + page.length}` : null,
            });
        },
        path: async (itemId) => {
            const path = [];
            const seen = new Set();
            let current = items.get(itemId);
            while (current !== undefined) {
                assert(!seen.has(current._id));
                seen.add(current._id);
                path.unshift(current);
                current = current.containerId === undefined ? undefined : items.get(current.containerId);
            }
            return copy(path);
        },
        children: async (parent, after, limit) =>
            copy(
                [...items.values()]
                    .filter((i) => (i.containerId ?? null) === parent && (after === undefined || i._id > after))
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
        complete: async (event) => {
            if (failComplete) throw Error('injected post-write crash');
            events.set(event._id, copy(event));
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
        bind: async (identity, itemId) => {
            const old = bindings.get(identityKey(identity));
            assert(!old || old.itemId === itemId);
            bindings.set(identityKey(identity), { identity, itemId });
        },
    };
    return {
        execute: createAgentService(backend),
        items,
        tags,
        events,
        backend,
        crash: () => {
            failComplete = true;
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
    execute = async () => ({ ok: true, result: 'synthetic' }),
} = {}) {
    const req = Readable.from([Buffer.from(body)]);
    req.socket = { remoteAddress: address };
    req.method = method;
    req.headers = { authorization: auth, 'content-type': 'application/json', ...headers };
    let status, response;
    await createAgentHandler(
        token,
        execute,
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

test('HTTP reports required search dependency failure distinctly', async () => {
    const response = await http({
        execute: async () => {
            throw new AgentError('search_unavailable', 'Inventory search service is unavailable');
        },
    });
    assert.equal(response.status, 503);
    assert.deepEqual(response.response, {
        ok: false,
        error: { code: 'search_unavailable', message: 'Inventory search service is unavailable' },
    });
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

test('bounded search finds names, descriptions and aliases with current location context', async () => {
    const f = fixture();
    const home = (await f.execute(create('search-home', 'Fictional home', { isContainer: true }))).result.item;
    const garage = (await f.execute(create('search-garage', 'Garage', { isContainer: true, containerId: home._id })))
        .result.item;
    const drinkware = (
        await f.execute(
            create('search-drinkware', 'Drinkware box', {
                isContainer: true,
                containerId: garage._id,
                description: 'Insulated metal water bottles and tumblers',
                properties: { searchAliases: ['barware', 'cocktail equipment'] },
            })
        )
    ).result.item;
    await f.execute(create('search-other', 'Water filter', { containerId: garage._id }));

    for (const query of ['DRINKWARE', 'water bottles', 'tumblers', 'barware', 'cocktail']) {
        const result = (await f.execute({ op: 'search', query, limit: 1 })).result;
        assert.equal(result.matches[0].item.item._id, drinkware._id);
        assert.deepEqual(
            result.matches[0].path.map((entry) => entry.name),
            ['Fictional home', 'Garage', 'Drinkware box']
        );
        assert.deepEqual(result.matches[0].evidence, { score: 1, matchedFields: ['description'] });
    }

    const first = (await f.execute({ op: 'search', query: 'water', limit: 1 })).result;
    assert.equal(first.matches.length, 1);
    assert.notEqual(first.nextCursor, null);
    const second = (await f.execute({ op: 'search', query: 'water', limit: 1, after: first.nextCursor })).result;
    assert.equal(second.matches.length, 1);
    assert.equal(second.nextCursor, null);
    assert.deepEqual((await f.execute({ op: 'search', query: 'missing' })).result, {
        matches: [],
        nextCursor: null,
    });

    for (const request of [
        { op: 'search', query: '' },
        { op: 'search', query: 'water', limit: 0 },
        { op: 'search', query: 'water', limit: 101 },
        { op: 'search', query: 'water', after: '' },
    ])
        await rejects(() => f.execute(request), 'invalid_input');

    assert.equal((await f.execute({ op: 'lookup', name: 'barware' })).result.items.length, 0);
    assert.equal((await f.execute({ op: 'lookup', name: 'Drinkware' })).result.items[0].item._id, drinkware._id);
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
