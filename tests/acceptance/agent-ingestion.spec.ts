import { test, expect } from '@playwright/test';
import scenario from './fixtures/alder-lantern.json';
import { callMeteorMethod, waitForMeteorReady } from '../e2e/helpers/database';

type Item = {
    _id: string;
    name: string;
    isContainer: boolean;
    containerId?: string;
    description?: string;
    deletedAt?: string;
    deletedByRequestId?: string;
    deletedBy?: { system: string; reference: string };
};
type Identity = { namespace: string; value: string };
type Snapshot = { item: Item; version: string; externalIdentities: Identity[] };
type AuditEvent = {
    request: { source: typeof scenario.source; note?: string };
    status: 'pending' | 'completed';
    before?: Snapshot;
    after?: Snapshot;
};

test('fictional townhouse ingestion, safe replay, corrections, and UI parity', async ({ request, page }) => {
    const invoke = async (payload: object, status = 200) => {
        const response = await request.post('/api/agent/v1', {
            headers: { Authorization: `Bearer ${process.env.INVENTORY_ACCEPTANCE_TOKEN}` },
            data: payload,
        });
        const body = await response.json();
        expect(response.status(), JSON.stringify(body)).toBe(status);
        expect(body.ok).toBe(status === 200);
        return body;
    };
    const records = new Map<string, Snapshot>();
    const payloads = new Map<string, object>();
    const source = scenario.source;
    const identity = { namespace: 'fictional-sticker', value: 'ALDER-0042' };

    const unauthenticated = await request.post('/api/agent/v1', {
        data: { op: 'lookup', name: 'Alder' },
        headers: { 'Content-Type': 'application/json' },
    });
    expect(unauthenticated.status(), await unauthenticated.text()).toBe(401);

    await page.goto('/');
    await waitForMeteorReady(page);
    const readUiRecords = async (): Promise<Item[]> =>
        JSON.parse(JSON.stringify(await callMeteorMethod<Item[]>(page, 'items.search', [])));
    const baselineCount = (await readUiRecords()).length;
    if (process.env.INVENTORY_SEED_SAMPLE_DATA === '0') expect(baselineCount).toBe(0);
    const expectedCount = baselineCount + scenario.records.length;

    for (const record of scenario.records) {
        const { key, parent, ...item } = record;
        const payload = {
            op: 'create',
            requestId: `alder-create-${key}`,
            source,
            item: { ...item, ...(parent ? { containerId: records.get(parent)!.item._id } : {}) },
            note: `Fictional intake: ${key}`,
            ...(key === 'vacuum' ? { externalIdentity: identity } : {}),
        };
        const created = await invoke(payload);
        expect(created.replayed).toBe(false);
        expect(created.result.item).toMatchObject(payload.item);
        records.set(key, created.result);
        payloads.set(key, payload);
        const read = await invoke({ op: 'get', itemId: created.result.item._id });
        expect(read.result).toMatchObject(created.result);
    }
    const allBefore = await readUiRecords();
    expect(allBefore).toHaveLength(expectedCount);
    expect(new Set([...records.values()].map((entry) => entry.item._id)).size).toBe(scenario.records.length);
    for (const record of scenario.records) {
        expect((await invoke({ op: 'lookup', name: record.name })).result.items).toEqual([records.get(record.key)]);
    }

    for (const [key, payload] of payloads) {
        const replay = await invoke(payload);
        expect(replay.replayed).toBe(true);
        expect(replay.result).toEqual(records.get(key));
    }
    expect(await readUiRecords()).toHaveLength(expectedCount);
    const changedPayload = { ...payloads.get('home'), note: 'Changed payload with the same request key' };
    expect((await invoke(changedPayload, 409)).error.code).toBe('conflict');
    expect((await invoke({ op: 'get', itemId: records.get('home')!.item._id })).result).toEqual(records.get('home'));

    const garage = records.get('garage')!.item;
    const basement = records.get('basement')!.item;
    expect(garage.containerId).toBe(basement.containerId);
    expect(garage.description).toContain('Connection describes access, not containment');
    for (const key of ['fridge', 'washer', 'dryer', 'vacuum']) expect(records.get(key)!.item.isContainer).toBe(false);
    expect(records.get('home')!.item.description).toContain('Floor count unresolved');
    expect(records.get('bedroomA')!.item.description).toContain('Occupant unresolved');
    expect(records.get('bedroomB')!.item.description).toContain('Occupant unresolved');
    expect(records.get('bathroomA')!.item.containerId).toBe(records.get('bedroomA')!.item._id);
    expect(records.get('bathroomB')!.item.containerId).toBe(records.get('bedroomB')!.item._id);

    const original = records.get('vacuum')!;
    expect((await invoke({ op: 'lookup', externalIdentity: identity })).result.items).toEqual([original]);
    const duplicate = await invoke(
        {
            op: 'create',
            requestId: 'alder-duplicate-sticker',
            source,
            item: { name: 'Conflicting fictional object', isContainer: false },
            externalIdentity: identity,
        },
        409
    );
    expect(duplicate.error.code).toBe('conflict');
    expect(await readUiRecords()).toHaveLength(expectedCount);

    const refrigerator = records.get('fridge')!;
    const bind = {
        op: 'bindIdentity',
        requestId: 'alder-bind-fridge',
        source,
        itemId: refrigerator.item._id,
        expectedVersion: refrigerator.version,
        externalIdentity: { namespace: 'fictional-sticker', value: 'ALDER-0043' },
        note: 'Read fictional existing refrigerator sticker.',
    };
    const bound = (await invoke(bind)).result as Snapshot;
    expect(bound.item).toEqual(refrigerator.item);
    expect(bound.externalIdentities).toContainEqual(bind.externalIdentity);
    expect((await invoke(bind)).result).toEqual(bound);
    expect((await invoke({ op: 'lookup', externalIdentity: bind.externalIdentity })).result.items).toEqual([bound]);
    expect(
        (await invoke({ ...bind, requestId: 'alder-bind-collision', externalIdentity: identity }, 409)).error.code
    ).toBe('conflict');
    expect((await invoke({ op: 'get', itemId: refrigerator.item._id })).result).toEqual(bound);

    const correction = {
        op: 'update',
        requestId: 'alder-correct-vacuum',
        source,
        itemId: original.item._id,
        expectedVersion: original.version,
        changes: {
            name: 'Pebbleglide floor cleaner',
            description: 'Corrected fictional label; intended storage is basement.',
        },
        note: 'Corrected transcription after fictional label review.',
    };
    const corrected = (await invoke(correction)).result as Snapshot;
    expect(corrected.item).toMatchObject(correction.changes);
    expect(corrected.version).not.toBe(original.version);
    const stale = await invoke(
        { ...correction, requestId: 'alder-stale-correction', changes: { name: 'Stale overwrite' } },
        409
    );
    expect(stale.error.code).toBe('conflict');
    const move = {
        op: 'move',
        requestId: 'alder-move-vacuum',
        source,
        itemId: original.item._id,
        expectedVersion: corrected.version,
        containerId: basement._id,
        note: 'Moved from garage to basement after fictional storage check.',
    };
    const moved = (await invoke(move)).result as Snapshot;
    expect(moved.item.containerId).toBe(basement._id);
    expect(moved.item.name).toBe(corrected.item.name);
    expect(moved.version).not.toBe(corrected.version);
    expect((await invoke(move)).replayed).toBe(true);
    expect((await invoke(correction)).result).toEqual(corrected);
    expect((await invoke({ op: 'get', itemId: original.item._id })).result).toEqual(moved);
    expect((await invoke({ op: 'lookup', externalIdentity: identity })).result.items).toEqual([moved]);

    const events = (await invoke({ op: 'history', itemId: original.item._id })).result.events as AuditEvent[];
    const correctionEvent = events.find((event) => event.request.note === correction.note);
    const moveEvent = events.find((event) => event.request.note === move.note);
    expect(events.filter((event) => event.request.note === correction.note)).toHaveLength(1);
    expect(events.filter((event) => event.request.note === move.note)).toHaveLength(1);
    expect(correctionEvent).toMatchObject({
        request: { source, note: correction.note },
        status: 'completed',
        before: original,
        after: corrected,
    });
    expect(moveEvent).toMatchObject({
        request: { source, note: move.note },
        status: 'completed',
        before: corrected,
        after: moved,
    });

    expect((await invoke({ op: 'status', requestId: move.requestId })).result.event).toMatchObject(moveEvent);
    expect((await invoke({ op: 'status', requestId: 'alder-never-submitted' })).result.event).toBeNull();

    await page.goto('/');
    await waitForMeteorReady(page);
    const uiRecords = await readUiRecords();
    expect(uiRecords).toHaveLength(expectedCount);
    const agentRecords: Snapshot[] = [];
    for (const { item } of records.values()) {
        agentRecords.push((await invoke({ op: 'get', itemId: item._id })).result);
    }
    const fixtureIds = new Set(agentRecords.map(({ item }) => item._id));
    expect(
        uiRecords
            .filter((item) => fixtureIds.has(item._id))
            .map((item) => item._id)
            .sort()
    ).toEqual([...fixtureIds].sort());
    for (const { item } of agentRecords) {
        expect(uiRecords.find((uiItem) => uiItem._id === item._id)).toMatchObject(item);
    }
    await page.goto(`/items/${moved.item._id}`);
    await expect(page.getByRole('heading', { name: moved.item.name, exact: true })).toBeVisible();
    await expect(page.getByText(moved.item.description!, { exact: true })).toBeVisible();
    await expect(page.getByText(basement.name, { exact: true })).toBeVisible();
    await page.goto(`/items/${records.get('home')!.item._id}`);
    await expect(page.getByText(records.get('home')!.item.description!, { exact: true })).toBeVisible();

    // Answer household questions from live discovery, including changes after intake.
    const homeId = records.get('home')!.item._id;
    const hierarchy = async () => (await invoke({ op: 'hierarchy', itemId: homeId })).result;
    const initialTree = await hierarchy();
    expect(initialTree.root.item._id).toBe(homeId);
    expect(initialTree.items.map((r: Snapshot) => r.item._id).sort()).toEqual(
        [...fixtureIds].filter((id) => id !== homeId).sort()
    );
    const directIds: string[] = [];
    let cursor: string | undefined;
    do {
        const children = (
            await invoke({ op: 'children', containerId: homeId, limit: 1, ...(cursor ? { after: cursor } : {}) })
        ).result;
        directIds.push(...children.items.map((r: Snapshot) => r.item._id));
        cursor = children.nextCursor ?? undefined;
    } while (cursor);
    expect(directIds.sort()).toEqual(
        agentRecords
            .filter((r) => r.item.containerId === homeId)
            .map((r) => r.item._id)
            .sort()
    );
    expect((await invoke({ op: 'hierarchy', itemId: homeId, maxNodes: 1 }, 400)).error.code).toBe('limit_exceeded');
    const lateRoom = (
        await invoke({
            op: 'create',
            requestId: 'alder-late-room',
            source,
            item: {
                name: 'Fictional late-added reading room',
                isContainer: true,
                containerId: records.get('bedroomA')!.item.containerId,
            },
        })
    ).result as Snapshot;
    expect((await hierarchy()).items.some((r: Snapshot) => r.item._id === lateRoom.item._id)).toBe(true);
    await invoke({
        op: 'move',
        requestId: 'alder-late-room-moved-out',
        source,
        itemId: lateRoom.item._id,
        expectedVersion: lateRoom.version,
        containerId: null,
    });
    expect((await hierarchy()).items.some((r: Snapshot) => r.item._id === lateRoom.item._id)).toBe(false);
    expect(
        (await invoke({ op: 'children', containerId: null })).result.items.some(
            (r: Snapshot) => r.item._id === lateRoom.item._id
        )
    ).toBe(true);
});

test('agent and UI deletion retain tombstones while every ordinary read hides them', async ({ request, page }) => {
    const invoke = async (payload: object, status = 200) => {
        const response = await request.post('/api/agent/v1', {
            headers: { Authorization: `Bearer ${process.env.INVENTORY_ACCEPTANCE_TOKEN}` },
            data: payload,
        });
        const body = await response.json();
        expect(response.status(), JSON.stringify(body)).toBe(status);
        return body;
    };
    const source = { system: 'synthetic-acceptance', reference: 'logical-delete' };
    await page.goto('/');
    await waitForMeteorReady(page);

    const identity = { namespace: 'fictional-sticker', value: 'DELETE-RETAINED-1' };
    const created = (
        await invoke({
            op: 'create',
            requestId: 'delete-acceptance-create',
            source,
            item: { name: 'Fixture logically deleted by agent', isContainer: false },
            externalIdentity: identity,
        })
    ).result as Snapshot;
    const firstPreparation = (
        await invoke({
            op: 'prepareDelete',
            requestId: 'delete-acceptance-agent',
            source,
            itemId: created.item._id,
            expectedVersion: created.version,
            note: 'Synthetic acceptance deletion',
        })
    ).result;
    const preparation = (
        await invoke({
            op: 'prepareDelete',
            requestId: 'delete-acceptance-agent',
            source,
            itemId: created.item._id,
            expectedVersion: created.version,
            note: 'Synthetic acceptance deletion',
        })
    ).result;
    expect(preparation.deletionAuthorizationId).not.toBe(firstPreparation.deletionAuthorizationId);
    expect(
        (
            await invoke(
                {
                    op: 'confirmDelete',
                    requestId: 'delete-acceptance-agent',
                    deletionAuthorizationId: firstPreparation.deletionAuthorizationId,
                },
                400
            )
        ).error.code
    ).toBe('invalid_authorization');
    const refreshedPreparation = (
        await invoke({
            op: 'prepareDelete',
            requestId: 'delete-acceptance-agent',
            source,
            itemId: created.item._id,
            expectedVersion: created.version,
            note: 'Synthetic acceptance deletion',
        })
    ).result;
    const confirmation = {
        op: 'confirmDelete',
        requestId: 'delete-acceptance-agent',
        deletionAuthorizationId: refreshedPreparation.deletionAuthorizationId,
    };
    const deleted = await invoke(confirmation);
    expect(deleted.result.item).toMatchObject({
        _id: created.item._id,
        deletedByRequestId: 'delete-acceptance-agent',
        deletedBy: source,
    });
    expect((await invoke(confirmation)).replayed).toBe(true);
    expect((await invoke({ op: 'get', itemId: created.item._id }, 404)).error.code).toBe('not_found');
    expect((await invoke({ op: 'lookup', name: 'Fixture logically deleted by agent' })).result.items).toEqual([]);
    expect((await invoke({ op: 'lookup', externalIdentity: identity })).result.items).toEqual([]);
    const retained = (await invoke({ op: 'auditGet', itemId: created.item._id })).result as Snapshot;
    expect(retained.externalIdentities).toEqual([identity]);
    expect(retained.item.deletedAt).toBeTruthy();
    expect((await invoke({ op: 'history', itemId: created.item._id })).result.events.at(-1).after).toEqual(retained);
    const activeItems = await callMeteorMethod<Item[]>(page, 'items.search', []);
    expect(activeItems.some((item) => item._id === created.item._id)).toBe(false);

    const uiCreated = (
        await invoke({
            op: 'create',
            requestId: 'delete-acceptance-ui-create',
            source,
            item: { name: 'Fixture logically deleted by UI', isContainer: false },
        })
    ).result as Snapshot;
    expect(await callMeteorMethod<number>(page, 'items.deleteItem', uiCreated.item._id)).toBe(1);
    expect((await invoke({ op: 'get', itemId: uiCreated.item._id }, 404)).error.code).toBe('not_found');
    expect((await invoke({ op: 'auditGet', itemId: uiCreated.item._id })).result.item.deletedBy.system).toBe(
        'inventory-ui'
    );
});

test('agent labels share UI tags and support safe assignment and retrieval', async ({ request, page }) => {
    const invoke = async (payload: object, status = 200) => {
        const response = await request.post('/api/agent/v1', {
            headers: { Authorization: `Bearer ${process.env.INVENTORY_ACCEPTANCE_TOKEN}` },
            data: payload,
        });
        const body = await response.json();
        expect(response.status(), JSON.stringify(body)).toBe(status);
        return body;
    };
    const source = { system: 'synthetic-acceptance', reference: 'tag-intake' };
    const rootPayload = {
        op: 'createTag',
        requestId: 'acceptance-tag-root',
        source,
        tag: { name: 'Fixture Occupant' },
    };
    const root = (await invoke(rootPayload)).result;
    const person = (
        await invoke({
            op: 'createTag',
            requestId: 'acceptance-tag-person',
            source,
            tag: { name: 'Fixture Person [A]', parentTagId: root.tag._id },
        })
    ).result;
    expect(person.tag.path.map((t: { _id: string }) => t._id)).toEqual([root.tag._id, person.tag._id]);
    expect((await invoke(rootPayload)).replayed).toBe(true);
    expect((await invoke({ ...rootPayload, requestId: 'duplicate-tag-name' }, 409)).error.code).toBe('conflict');
    expect((await invoke({ op: 'tags', name: '[A]' })).result.tags).toEqual([person]);
    expect((await invoke({ op: 'getTag', tagId: person.tag._id })).result).toEqual(person);
    const room = (
        await invoke({
            op: 'create',
            requestId: 'tagged-room',
            source,
            item: { name: 'Fixture tagged bedroom', isContainer: true, tagIds: [root.tag._id] },
        })
    ).result;
    const assign = {
        op: 'update',
        requestId: 'tag-room-assignment',
        source,
        itemId: room.item._id,
        expectedVersion: room.version,
        changes: { tagIds: [root.tag._id, person.tag._id] },
    };
    const tagged = (await invoke(assign)).result;
    expect((await invoke(assign)).result).toEqual(tagged);
    expect((await invoke({ ...assign, requestId: 'stale-tags' }, 409)).error.code).toBe('conflict');
    expect(
        (
            await invoke(
                {
                    ...assign,
                    requestId: 'unknown-tag',
                    expectedVersion: tagged.version,
                    changes: { tagIds: ['missing-tag'] },
                },
                404
            )
        ).error.code
    ).toBe('not_found');
    expect((await invoke({ op: 'taggedItems', tagId: person.tag._id, limit: 1 })).result.items).toEqual([tagged]);
    const first = (await invoke({ op: 'tags', parentTagId: root.tag._id, limit: 1 })).result;
    expect(first.tags).toEqual([person]);
    expect(first.nextCursor).toBeNull();
    await page.goto(`/items/${room.item._id}`);
    await waitForMeteorReady(page);
    await expect(page.getByText('Fixture Person [A]', { exact: true }).first()).toBeVisible();
    const uiItems = await callMeteorMethod<Array<{ _id: string; tagIds: string[] }>>(page, 'items.search', []);
    expect(uiItems.find((i) => i._id === room.item._id)?.tagIds).toEqual([root.tag._id, person.tag._id]);
    const removed = (
        await invoke({
            ...assign,
            requestId: 'remove-person-tag',
            expectedVersion: tagged.version,
            changes: { tagIds: [root.tag._id] },
        })
    ).result;
    expect(removed.item.tagIds).toEqual([root.tag._id]);
    expect((await invoke({ op: 'taggedItems', tagId: person.tag._id })).result.items).toEqual([]);
    expect((await invoke({ op: 'history', itemId: room.item._id })).result.events.at(-1).before).toEqual(tagged);
});
