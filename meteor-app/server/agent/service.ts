/**
 * Transport-independent agent commands with durable replay and correction history.
 * Persistence and inventory rules are injected so crash boundaries can be tested
 * without a running Meteor server or access to household data.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { PropertyValues } from '/imports/model/PropertyValues';

export interface Item {
    _id: string;
    name: string;
    description?: string;
    isContainer: boolean;
    locked?: boolean;
    deletedAt?: Date;
    deletedByRequestId?: string;
    deletedBy?: Source;
    deletionNote?: string;
    containerId?: string;
    tagIds: string[];
    properties?: PropertyValues;
    createdAt: Date;
    modifiedAt: Date;
}
export interface Tag {
    _id: string;
    name: string;
    parentTagId: string;
    path: Array<{ _id: string; name: string }>;
    createdAt: Date;
    modifiedAt: Date;
}
export interface TagReadback {
    tag: Tag;
    version: string;
}
export interface Identity {
    namespace: string;
    value: string;
}
export interface Source {
    system: string;
    reference: string;
}
export interface Request {
    op:
        | 'create'
        | 'update'
        | 'move'
        | 'lock'
        | 'unlock'
        | 'bindIdentity'
        | 'prepareDelete'
        | 'confirmDelete'
        | 'get'
        | 'auditGet'
        | 'lookup'
        | 'history'
        | 'status'
        | 'children'
        | 'hierarchy'
        | 'createTag'
        | 'getTag'
        | 'tags'
        | 'taggedItems';
    requestId?: string;
    source?: Source;
    note?: string;
    itemId?: string;
    expectedVersion?: string;
    deletionAuthorizationId?: string;
    after?: string;
    limit?: number;
    maxNodes?: number;
    tagId?: string;
    parentTagId?: string;
    tag?: { name: string; parentTagId?: string };
    item?: {
        tagIds?: string[];
        name: string;
        description?: string;
        isContainer: boolean;
        containerId?: string;
        properties?: PropertyValues;
    };
    changes?: { name?: string; description?: string; tagIds?: string[]; properties?: PropertyValues };
    containerId?: string | null;
    externalIdentity?: Identity;
    name?: string;
}
export interface Readback {
    item: Item;
    version: string;
    externalIdentities: Identity[];
}
export interface Event {
    _id: string;
    fingerprint: string;
    request: Request;
    status: 'prepared' | 'pending' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    itemId?: string;
    tagId?: string;
    afterTag?: TagReadback;
    before?: Readback;
    after?: Readback;
    deletionAuthorizationHash?: string;
    deletionAuthorizationExpiresAt?: Date;
    deletionAuthorizationAttemptedAt?: Date;
    confirmationFingerprint?: string;
    failure?: { code: string; message: string };
}
export interface DeletionPreparation {
    itemId: string;
    expectedVersion: string;
    deletionAuthorizationId: string;
    expiresAt: Date;
}
export interface Backend {
    getTag: (id: string) => Promise<Tag | undefined>;
    tags: (
        parent: string | undefined,
        name: string | undefined,
        after: string | undefined,
        limit: number
    ) => Promise<Tag[]>;
    taggedItems: (tagId: string, after: string | undefined, limit: number) => Promise<Item[]>;
    createTag: (tag: NonNullable<Request['tag']>, id: string) => Promise<string>;
    get: (id: string) => Promise<Item | undefined>;
    getIncludingDeleted: (id: string) => Promise<Item | undefined>;
    search: (name: string) => Promise<Item[]>;
    children: (containerId: string | null, after: string | undefined, limit: number) => Promise<Item[]>;
    identities: (id: string) => Promise<Identity[]>;
    resolve: (identity: Identity) => Promise<string | undefined>;
    event: (id: string) => Promise<Event | undefined>;
    history: (id: string) => Promise<Event[]>;
    lock: (requestId: string) => Promise<boolean>;
    unlock: (requestId: string) => Promise<void>;
    reserve: (event: Event) => Promise<void>;
    rotateDeleteAuthorization: (event: Event) => Promise<boolean>;
    complete: (event: Event) => Promise<void>;
    beginDeleteConfirmation: (
        requestId: string,
        confirmationFingerprint: string,
        attemptedAt: Date
    ) => Promise<Event | undefined>;
    validate: (request: Request, before?: Item) => Promise<void>;
    create: (item: NonNullable<Request['item']>, id: string) => Promise<string>;
    update: (item: Item, changes: NonNullable<Request['changes']>) => Promise<boolean>;
    move: (item: Item, parent: string | null) => Promise<boolean>;
    setLocked: (item: Item, locked: boolean) => Promise<boolean>;
    logicalDelete: (item: Item, request: Request, deletedAt: Date) => Promise<boolean>;
    activeChildCount: (itemId: string) => Promise<number>;
    bind: (identity: Identity, itemId: string) => Promise<void>;
}
export class AgentError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}
const LIMIT_ID = 200;
const LIMIT_NAME = 500;
const LIMIT_NOTE = 5000;
const LIMIT_REFERENCE = 2000;
const LIMIT_VERSION = 100;
const LIMIT_CHILDREN = 100;
const LIMIT_HIERARCHY = 1000;
const DELETE_AUTHORIZATION_TTL_MINUTES = 5;
const MILLISECONDS_PER_MINUTE = 60_000;
const DELETE_AUTHORIZATION_TTL_MS = DELETE_AUTHORIZATION_TTL_MINUTES * MILLISECONDS_PER_MINUTE;
const DELETE_AUTHORIZATION_BYTES = 32;
export interface Response {
    ok: true;
    result:
        | Readback
        | TagReadback
        | { tags: TagReadback[]; nextCursor: string | null }
        | { items: Readback[]; nextCursor?: string | null; root?: Readback }
        | { events: Event[] }
        | { event: Event | null }
        | DeletionPreparation;
    replayed?: boolean;
}
const required = <T>(value: T | undefined): T => {
    if (value === undefined) throw new AgentError('invalid_input', 'Required field is missing');
    return value;
};
const fail = (code: string, message: string): never => {
    throw new AgentError(code, message);
};
const object = (value: unknown): Record<string, unknown> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return fail('invalid_input', 'Expected an object');
    return value as Record<string, unknown>;
};
const keys = (value: Record<string, unknown>, allowed: string[]): void => {
    if (Object.keys(value).some((key) => !allowed.includes(key))) fail('invalid_input', 'Unknown input field');
};
const string = (value: unknown, field: string, max = LIMIT_NAME): void => {
    if (typeof value !== 'string' || value.trim() === '' || value.length > max)
        fail('invalid_input', `${field} must be a nonempty string of at most ${max} characters`);
};
const optionalDescription = (value: unknown): void => {
    if (value !== undefined && (typeof value !== 'string' || value.length > LIMIT_NOTE))
        fail('invalid_input', 'description must be a string of at most 5000 characters');
};
const tagIds = (value: unknown): void => {
    if (!Array.isArray(value) || value.length > LIMIT_CHILDREN)
        fail('invalid_input', 'tagIds must be an array of at most 100 distinct tag IDs');
    for (const id of value as unknown[]) string(id, 'tagIds entry', LIMIT_ID);
    if (new Set(value as unknown[]).size !== (value as unknown[]).length)
        fail('invalid_input', 'tagIds must not contain duplicates');
};
export const parseRequest = (input: unknown): Request => {
    const r = object(input);
    const mutation = [
        'create',
        'update',
        'move',
        'lock',
        'unlock',
        'bindIdentity',
        'createTag',
        'prepareDelete',
        'confirmDelete',
    ].includes(String(r.op));
    const fields: Record<string, string[]> = {
        create: ['item', 'externalIdentity'],
        createTag: ['tag'],
        getTag: ['tagId'],
        tags: ['parentTagId', 'name', 'after', 'limit'],
        taggedItems: ['tagId', 'after', 'limit'],
        update: ['itemId', 'expectedVersion', 'changes'],
        move: ['itemId', 'expectedVersion', 'containerId'],
        lock: ['itemId', 'expectedVersion'],
        unlock: ['itemId', 'expectedVersion'],
        bindIdentity: ['itemId', 'expectedVersion', 'externalIdentity'],
        prepareDelete: ['itemId', 'expectedVersion'],
        confirmDelete: ['deletionAuthorizationId'],
        status: ['requestId'],
        get: ['itemId'],
        auditGet: ['itemId'],
        lookup: ['name', 'externalIdentity'],
        history: ['itemId'],
        children: ['containerId', 'after', 'limit'],
        hierarchy: ['itemId', 'maxNodes'],
    };
    if (typeof r.op !== 'string' || !Object.hasOwn(fields, r.op)) fail('invalid_input', 'Unknown operation');
    const sourcedMutation = mutation && r.op !== 'confirmDelete';
    keys(r, [
        'op',
        ...(mutation ? ['requestId'] : []),
        ...(sourcedMutation ? ['source', 'note'] : []),
        ...fields[r.op as string],
    ]);
    if (r.op === 'status') string(r.requestId, 'requestId', LIMIT_ID);
    if (mutation) string(r.requestId, 'requestId', LIMIT_ID);
    if (sourcedMutation) {
        const source = object(r.source);
        keys(source, ['system', 'reference']);
        string(source.system, 'source.system', LIMIT_ID);
        string(source.reference, 'source.reference', LIMIT_REFERENCE);
        if (r.note !== undefined) string(r.note, 'note', LIMIT_NOTE);
    }
    if (
        [
            'get',
            'auditGet',
            'history',
            'update',
            'move',
            'lock',
            'unlock',
            'bindIdentity',
            'hierarchy',
            'prepareDelete',
        ].includes(String(r.op))
    )
        string(r.itemId, 'itemId', LIMIT_ID);
    if (['update', 'move', 'bindIdentity', 'lock', 'unlock', 'prepareDelete'].includes(String(r.op)))
        string(r.expectedVersion, 'expectedVersion', LIMIT_VERSION);
    if (r.op === 'confirmDelete') string(r.deletionAuthorizationId, 'deletionAuthorizationId', LIMIT_ID);
    if (r.externalIdentity !== undefined) {
        const identity = object(r.externalIdentity);
        keys(identity, ['namespace', 'value']);
        string(identity.namespace, 'externalIdentity.namespace', LIMIT_ID);
        string(identity.value, 'externalIdentity.value', LIMIT_NAME);
    }
    if (r.op === 'bindIdentity' && r.externalIdentity === undefined)
        fail('invalid_input', 'externalIdentity is required');
    if (r.op === 'create') {
        const item = object(r.item);
        keys(item, ['name', 'description', 'isContainer', 'containerId', 'tagIds', 'properties']);
        if (item.tagIds !== undefined) tagIds(item.tagIds);
        string(item.name, 'item.name');
        optionalDescription(item.description);
        if (typeof item.isContainer !== 'boolean') fail('invalid_input', 'item.isContainer must be a boolean');
        if (item.containerId !== undefined) string(item.containerId, 'item.containerId', LIMIT_ID);
    }
    if (r.op === 'update') {
        const changes = object(r.changes);
        keys(changes, ['name', 'description', 'tagIds', 'properties']);
        if (changes.tagIds !== undefined) tagIds(changes.tagIds);
        if (Object.keys(changes).length === 0) fail('invalid_input', 'changes cannot be empty');
        if (changes.name !== undefined) string(changes.name, 'changes.name');
        optionalDescription(changes.description);
    }
    if (r.op === 'createTag') {
        const tag = object(r.tag);
        keys(tag, ['name', 'parentTagId']);
        string(tag.name, 'tag.name');
        if (tag.parentTagId !== undefined && tag.parentTagId !== '')
            string(tag.parentTagId, 'tag.parentTagId', LIMIT_ID);
    }
    if (['getTag', 'taggedItems'].includes(String(r.op))) string(r.tagId, 'tagId', LIMIT_ID);
    if (r.op === 'tags') {
        if (r.parentTagId !== undefined && r.parentTagId !== '') string(r.parentTagId, 'parentTagId', LIMIT_ID);
        if (r.name !== undefined) string(r.name, 'name');
    }
    if (r.op === 'move' && r.containerId !== null) string(r.containerId, 'containerId', LIMIT_ID);
    if (['children', 'tags', 'taggedItems'].includes(String(r.op))) {
        if (r.op === 'children' && r.containerId !== null) string(r.containerId, 'containerId', LIMIT_ID);
        if (r.after !== undefined) string(r.after, 'after', LIMIT_ID);
        if (
            r.limit !== undefined &&
            (typeof r.limit !== 'number' || !Number.isInteger(r.limit) || r.limit < 1 || r.limit > LIMIT_CHILDREN)
        )
            fail('invalid_input', 'limit must be an integer from 1 to 100');
    }
    if (
        r.op === 'hierarchy' &&
        r.maxNodes !== undefined &&
        (typeof r.maxNodes !== 'number' ||
            !Number.isInteger(r.maxNodes) ||
            r.maxNodes < 1 ||
            r.maxNodes > LIMIT_HIERARCHY)
    )
        fail('invalid_input', 'maxNodes must be an integer from 1 to 1000');
    if (r.op === 'lookup') {
        if ((r.name === undefined) === (r.externalIdentity === undefined))
            fail('invalid_input', 'Specify exactly one lookup selector');
        if (r.name !== undefined) string(r.name, 'name');
    }
    return r as unknown as Request;
};
export const canonical = (value: unknown): string => {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (typeof value === 'object' && value !== null)
        return `{${Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
            .join(',')}}`;
    return JSON.stringify(value);
};
export const version = (item: unknown): string => createHash('sha256').update(canonical(item)).digest('hex');
export const identityKey = (identity: Identity): string =>
    createHash('sha256').update(canonical(identity)).digest('hex');

export interface AgentServiceOptions {
    now?: () => Date;
    random?: (size: number) => Buffer;
}

export const createAgentService = (
    db: Backend,
    options: AgentServiceOptions = {}
): ((input: unknown) => Promise<Response>) => {
    const now = options.now ?? (() => new Date());
    const random = options.random ?? randomBytes;
    const snapshot = async (item: Item): Promise<Readback> => ({
        item,
        version: version(item),
        externalIdentities: await db.identities(item._id),
    });
    const read = async (id: string): Promise<Readback> => {
        const item = await db.get(id);
        if (item === undefined) return fail('not_found', 'Item not found');
        return await snapshot(item);
    };
    const readIncludingDeleted = async (id: string): Promise<Readback> => {
        const item = await db.getIncludingDeleted(id);
        if (item === undefined) return fail('not_found', 'Item not found');
        return await snapshot(item);
    };
    const readTag = async (id: string): Promise<TagReadback> => {
        const tag = await db.getTag(id);
        if (tag === undefined) return fail('not_found', 'Tag not found');
        return { tag, version: version(tag) };
    };
    const replay = (event: Event, fingerprint: string): Response => {
        if (event.fingerprint !== fingerprint)
            return fail('conflict', 'requestId already used with a different payload');
        if (event.status !== 'completed')
            return fail(
                'indeterminate',
                'Write outcome is indeterminate; inspect get/history and reconcile before retrying. Do not use a new requestId.'
            );
        return { ok: true as const, result: required(event.afterTag ?? event.after), replayed: true };
    };
    const publicEvent = (event: Event): Event => {
        const { deletionAuthorizationHash: _hash, ...visible } = event;
        return visible;
    };
    const deletionBinding = (event: Event): unknown => ({
        operation: 'confirmDelete',
        requestFingerprint: event.fingerprint,
        requestId: event._id,
        itemId: required(event.itemId),
        expectedVersion: required(event.request.expectedVersion),
    });
    const deletionAuthorizationHash = (authorizationId: string, event: Event): string =>
        createHash('sha256')
            .update(authorizationId)
            .update(canonical(deletionBinding(event)))
            .digest('hex');
    const authorizationMatches = (expected: string, supplied: string): boolean => {
        const expectedBytes = Buffer.from(expected, 'hex');
        const suppliedBytes = Buffer.from(supplied, 'hex');
        return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
    };
    const replayDeleteConfirmation = (event: Event, fingerprint: string): Response => {
        if (event.confirmationFingerprint !== fingerprint)
            return fail('conflict', 'requestId already used with a different confirmation payload');
        if (event.status === 'failed') return fail(required(event.failure).code, required(event.failure).message);
        if (event.status !== 'completed')
            return fail(
                'indeterminate',
                'Delete confirmation is pending; retry the exact confirmation to reconcile it.'
            );
        return { ok: true as const, result: required(event.after), replayed: true };
    };
    const failDelete = async (event: Event, code: string, message: string): Promise<never> => {
        const { deletionAuthorizationHash: _hash, ...safeEvent } = event;
        await db.complete({
            ...safeEvent,
            status: 'prepared',
            failure: { code, message },
        });
        return fail(code, message);
    };
    return async (input: unknown) => {
        const r = parseRequest(input);
        if (r.op === 'status') {
            const event = await db.event(required(r.requestId));
            return { ok: true as const, result: { event: event === undefined ? null : publicEvent(event) } };
        }
        if (r.op === 'getTag') return { ok: true as const, result: await readTag(required(r.tagId)) };
        if (r.op === 'tags') {
            if (r.parentTagId !== undefined && r.parentTagId !== '') await readTag(r.parentTagId);
            const limit = r.limit ?? LIMIT_CHILDREN;
            const page = await db.tags(r.parentTagId, r.name, r.after, limit + 1);
            const tags = page.slice(0, limit).map((tag) => ({ tag, version: version(tag) }));
            return {
                ok: true as const,
                result: { tags, nextCursor: page.length > limit ? tags[tags.length - 1].tag._id : null },
            };
        }
        if (r.op === 'taggedItems') {
            const tagId = required(r.tagId);
            await readTag(tagId);
            const limit = r.limit ?? LIMIT_CHILDREN;
            const page = await db.taggedItems(tagId, r.after, limit + 1);
            const items = await Promise.all(page.slice(0, limit).map(snapshot));
            return {
                ok: true as const,
                result: { items, nextCursor: page.length > limit ? items[items.length - 1].item._id : null },
            };
        }
        if (r.op === 'get') return { ok: true as const, result: await read(required(r.itemId)) };
        if (r.op === 'auditGet') return { ok: true as const, result: await readIncludingDeleted(required(r.itemId)) };
        if (r.op === 'history')
            return {
                ok: true as const,
                result: { events: (await db.history(required(r.itemId))).map(publicEvent) },
            };
        if (r.op === 'children') {
            const parentId = required(r.containerId);
            if (parentId !== null && !(await read(parentId)).item.isContainer)
                fail('invalid_input', 'Parent must be a container');
            const limit = r.limit ?? LIMIT_CHILDREN;
            const page = await db.children(parentId, r.after, limit + 1);
            const items = await Promise.all(page.slice(0, limit).map(snapshot));
            const nextCursor = page.length > limit ? items[items.length - 1].item._id : null;
            return { ok: true as const, result: { items, nextCursor } };
        }
        if (r.op === 'hierarchy') {
            const root = await read(required(r.itemId));
            if (!root.item.isContainer) fail('invalid_input', 'Root must be a container');
            const maxNodes = r.maxNodes ?? LIMIT_HIERARCHY;
            const seen = new Set([root.item._id]);
            const parents = [root.item._id];
            const items: Readback[] = [];
            for (let index = 0; index < parents.length; index++) {
                let after: string | undefined = undefined;
                while (true) {
                    const page = await db.children(parents[index], after, LIMIT_CHILDREN);
                    for (const item of page) {
                        if (seen.has(item._id))
                            fail('conflict', 'Hierarchy contains a cycle or changed during traversal');
                        if (items.length === maxNodes)
                            fail('limit_exceeded', 'Hierarchy exceeds maxNodes; use paginated children queries');
                        seen.add(item._id);
                        items.push(await snapshot(item));
                        if (item.isContainer) parents.push(item._id);
                    }
                    if (page.length < LIMIT_CHILDREN) break;
                    after = page[page.length - 1]._id;
                }
            }
            return { ok: true as const, result: { root, items } };
        }
        if (r.op === 'lookup') {
            let items: Item[] = [];
            if (r.externalIdentity !== undefined) {
                const id = await db.resolve(r.externalIdentity);
                const item = id === undefined ? undefined : await db.get(id);
                items = item === undefined ? [] : [item];
            } else items = await db.search(required(r.name));
            return {
                ok: true as const,
                result: { items: await Promise.all(items.map(async (item) => await read(item._id))) },
            };
        }
        const requestId = required(r.requestId);
        const fingerprint = version(r);

        if (r.op === 'prepareDelete') {
            const previous = await db.event(requestId);
            if (previous !== undefined) {
                if (previous.fingerprint !== fingerprint)
                    fail('conflict', 'requestId already used with a different payload');
                if (previous.status === 'completed') fail('conflict', 'Deletion workflow is already completed');
                if (previous.status === 'failed')
                    fail(required(previous.failure).code, required(previous.failure).message);
                if (previous.status === 'pending')
                    fail('indeterminate', 'Delete confirmation is pending; retry that exact confirmation');
            }
            if (!(await db.lock(requestId)))
                return fail('busy', 'Agent writer is busy; no deletion authorization was created');
            try {
                const existing = await db.event(requestId);
                if (existing !== undefined) {
                    if (existing.fingerprint !== fingerprint)
                        fail('conflict', 'requestId already used with a different payload');
                    if (existing.status === 'completed') fail('conflict', 'Deletion workflow is already completed');
                    if (existing.status === 'failed')
                        fail(required(existing.failure).code, required(existing.failure).message);
                    if (existing.status === 'pending')
                        fail('indeterminate', 'Delete confirmation is pending; retry that exact confirmation');
                }
                const before = await read(required(r.itemId));
                if (before.version !== r.expectedVersion)
                    fail('conflict', 'Item version changed; read again before deleting');
                if (before.item.locked === true) fail('conflict', 'Item is locked; unlock it before deleting');
                if ((await db.activeChildCount(before.item._id)) > 0)
                    fail('conflict', 'Container has active children; move or delete them first');
                const issuedAt = now();
                const expiresAt = new Date(issuedAt.getTime() + DELETE_AUTHORIZATION_TTL_MS);
                const authorizationId = random(DELETE_AUTHORIZATION_BYTES).toString('base64url');
                const event: Event = {
                    _id: requestId,
                    fingerprint,
                    request: r,
                    status: 'prepared',
                    createdAt: existing?.createdAt ?? issuedAt,
                    itemId: before.item._id,
                    before,
                    deletionAuthorizationExpiresAt: expiresAt,
                };
                event.deletionAuthorizationHash = deletionAuthorizationHash(authorizationId, event);
                if (existing === undefined) await db.reserve(event);
                else if (!(await db.rotateDeleteAuthorization(event)))
                    fail('conflict', 'Deletion workflow changed while authorization was being refreshed');
                return {
                    ok: true as const,
                    result: {
                        itemId: before.item._id,
                        expectedVersion: before.version,
                        deletionAuthorizationId: authorizationId,
                        expiresAt,
                    },
                    replayed: false,
                };
            } finally {
                await db.unlock(requestId);
            }
        }

        if (r.op === 'confirmDelete') {
            let event = await db.event(requestId);
            if (event?.request.op !== 'prepareDelete') return fail('not_found', 'Prepared deletion request not found');
            if (event.status === 'completed' || event.status === 'failed')
                return replayDeleteConfirmation(event, fingerprint);
            let claimedNow = false;
            if (event.status === 'prepared') {
                const authorizationHash = deletionAuthorizationHash(required(r.deletionAuthorizationId), event);
                const attemptedAt = now();
                const claimed = await db.beginDeleteConfirmation(requestId, fingerprint, attemptedAt);
                if (claimed === undefined) return fail('conflict', 'Deletion authorization was already attempted');
                event = claimed;
                claimedNow = true;
                if (!authorizationMatches(required(event.deletionAuthorizationHash), authorizationHash))
                    return await failDelete(event, 'invalid_authorization', 'Deletion authorization is invalid');
                if (attemptedAt.getTime() >= required(event.deletionAuthorizationExpiresAt).getTime())
                    return await failDelete(event, 'authorization_expired', 'Deletion authorization expired');
            } else if (event.confirmationFingerprint !== fingerprint) {
                return fail('conflict', 'requestId already used with a different confirmation payload');
            }

            if (!claimedNow) {
                const retained = await db.getIncludingDeleted(required(event.itemId));
                if (retained?.deletedByRequestId !== requestId)
                    return fail(
                        'indeterminate',
                        'Delete confirmation is pending; retry only after the original attempt has stopped.'
                    );
                const after = await snapshot(retained);
                await db.complete({
                    ...event,
                    deletionAuthorizationHash: undefined,
                    after,
                    status: 'completed',
                    completedAt: now(),
                });
                await db.unlock(requestId);
                return { ok: true as const, result: after, replayed: true };
            }

            if (!(await db.lock(requestId)))
                return await failDelete(event, 'busy', 'Agent writer is busy; deletion was not performed');
            let completed = false;
            let mutationApplied = false;
            try {
                const item = await db.get(required(event.itemId));
                if (item === undefined) {
                    const retained = await db.getIncludingDeleted(required(event.itemId));
                    if (retained?.deletedByRequestId !== requestId)
                        throw new AgentError('conflict', 'Item is missing or already deleted');
                    const after = await snapshot(retained);
                    await db.complete({
                        ...event,
                        deletionAuthorizationHash: undefined,
                        after,
                        status: 'completed',
                        completedAt: now(),
                    });
                    completed = true;
                    return { ok: true as const, result: after, replayed: true };
                }
                const current = await snapshot(item);
                if (current.version !== event.request.expectedVersion)
                    throw new AgentError('conflict', 'Item version changed; prepare deletion again');
                if (item.locked === true)
                    throw new AgentError('conflict', 'Item is locked; deletion was not performed');
                if ((await db.activeChildCount(item._id)) > 0)
                    throw new AgentError('conflict', 'Container gained active children; deletion was not performed');
                if (!(await db.logicalDelete(item, event.request, now())))
                    throw new AgentError('conflict', 'Item changed during deletion');
                mutationApplied = true;
                const after = await readIncludingDeleted(item._id);
                await db.complete({
                    ...event,
                    deletionAuthorizationHash: undefined,
                    after,
                    status: 'completed',
                    completedAt: now(),
                });
                completed = true;
                return { ok: true as const, result: after, replayed: false };
            } catch (error) {
                if (error instanceof AgentError && !mutationApplied)
                    return await failDelete(event, error.code, error.message);
                return fail(
                    'indeterminate',
                    'Delete outcome is indeterminate; retry the exact confirmation to reconcile it.'
                );
            } finally {
                if (completed || !mutationApplied) await db.unlock(requestId);
            }
        }

        const previous = await db.event(requestId);
        if (previous !== undefined) return replay(previous, fingerprint);
        if (!(await db.lock(requestId)))
            return fail('busy', 'Agent writer is busy or awaiting reconciliation; no new mutation was started');
        let reserved = false;
        try {
            // A competing process may have completed this request before this lock was acquired.
            const existing = await db.event(requestId);
            if (existing !== undefined) return replay(existing, fingerprint);
            const before = ['create', 'createTag'].includes(r.op) ? undefined : await read(required(r.itemId));
            if (before !== undefined && before.version !== r.expectedVersion)
                fail('conflict', 'Item version changed; read again before correcting');
            if (r.externalIdentity !== undefined) {
                const owner = await db.resolve(r.externalIdentity);
                if (owner !== undefined && (r.op === 'create' || owner !== r.itemId))
                    fail('conflict', 'External identity is already bound to another item');
            }
            for (const id of r.item?.tagIds ?? r.changes?.tagIds ?? []) await readTag(id);
            await db.validate(r, before?.item);
            const candidateId = r.op === 'create' ? `agent-${version(requestId)}` : r.itemId;
            const event: Event = {
                _id: requestId,
                fingerprint,
                request: r,
                status: 'pending',
                createdAt: new Date(),
                itemId: candidateId,
                ...(r.op === 'createTag' ? { tagId: `agent-tag-${version(requestId)}` } : {}),
                before,
            };
            await db.reserve(event);
            reserved = true;
            if (r.op === 'createTag') {
                const tagId = await db.createTag(required(r.tag), required(event.tagId));
                const afterTag = await readTag(tagId);
                await db.complete({ ...event, afterTag, status: 'completed', completedAt: new Date() });
                reserved = false;
                return { ok: true as const, result: afterTag, replayed: false };
            }
            let itemId = candidateId;
            if (r.op === 'create') itemId = await db.create(required(r.item), required(candidateId));
            if (r.op === 'update' && !(await db.update(required(before).item, required(r.changes))))
                fail('conflict', 'Item changed during correction');
            if (r.op === 'move' && !(await db.move(required(before).item, required(r.containerId))))
                fail('conflict', 'Item changed during move');
            if (r.op === 'lock' && !(await db.setLocked(required(before).item, true)))
                fail('conflict', 'Item changed during lock');
            if (r.op === 'unlock' && !(await db.setLocked(required(before).item, false)))
                fail('conflict', 'Item changed during unlock');
            if (r.externalIdentity !== undefined) await db.bind(r.externalIdentity, required(itemId));
            const after = await read(required(itemId));
            await db.complete({ ...event, itemId, after, status: 'completed', completedAt: new Date() });
            reserved = false;
            return { ok: true as const, result: after, replayed: false };
        } catch (error) {
            if (reserved)
                return fail(
                    'indeterminate',
                    'Write may have occurred; agent writes are stopped. Inspect item/history and reconcile the pending request. Do not retry with a new requestId.'
                );
            throw error;
        } finally {
            // Deliberately retain the durable lock after a possible write. No expiry can safely prove the write failed.
            if (!reserved) await db.unlock(requestId);
        }
    };
};
