/**
 * Mongo persistence for the agent replay ledger, exclusive writer and identity map.
 * Inventory mutations use the application's business functions; the auxiliary
 * collections do not issue or modify identities in an external sticker registry.
 */
import { Mongo } from 'meteor/mongo';

import { InventoryIdentitiesCollection } from '/imports/api/identities';
import {
    InventoryItemsCollection,
    createInventoryItem,
    getItemPath,
    updateInventoryItem,
    moveItem,
    setInventoryItemLocked,
} from '/imports/api/items';
import { TagsCollection, createTag } from '/imports/api/tags';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import { InventorySearchUnavailableError, searchInventoryIndex } from '/imports/search/InventorySearchProvider';
import detectCircularReference from '/imports/utility/circularReference';
import { escapeSearchText } from '/imports/utility/searchText';

import { AgentError, identityKey } from './service';
import type { Backend, Event } from './service';

const events = new Mongo.Collection<Event>('agent_requests');
const bindings = InventoryIdentitiesCollection;
const locks = new Mongo.Collection<{ _id: string; requestId: string }>('agent_locks');
const DUPLICATE_KEY = 11000;
const isDuplicate = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY;

export const agentBackend: Backend = {
    getTag: async (id) => await TagsCollection.findOneAsync(id),
    tags: async (parent, name, after, limit) =>
        await TagsCollection.find(
            {
                ...(parent === undefined ? {} : { parentTagId: parent }),
                ...(name === undefined
                    ? {}
                    : { name: { $regex: name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }),
                ...(after === undefined ? {} : { _id: { $gt: after } }),
            },
            { limit, sort: { _id: 1 } }
        ).fetchAsync(),
    taggedItems: async (tagId, after, limit) =>
        await InventoryItemsCollection.find(
            {
                tagIds: tagId,
                ...(after === undefined ? {} : { _id: { $gt: after } }),
            },
            { limit, sort: { _id: 1 } }
        ).fetchAsync(),
    createTag: async (tag, id) => await createTag(tag, id),
    get: async (id) => await InventoryItemsCollection.findOneAsync(id),
    lookupName: async (name) =>
        await InventoryItemsCollection.find(
            { name: { $regex: escapeSearchText(name), $options: 'i' } },
            { limit: 100, sort: { _id: 1 } }
        ).fetchAsync(),
    search: async (query, after, limit) => {
        const offset = after === undefined ? 0 : Number(/^offset:(\d+)$/u.exec(after)?.[1]);
        if (!Number.isInteger(offset) || offset < 0) throw new AgentError('invalid_input', 'Invalid search cursor');
        try {
            const page = await searchInventoryIndex(query, offset, limit);
            const items = await InventoryItemsCollection.find({
                _id: { $in: page.hits.map((hit) => hit.id) },
            }).fetchAsync();
            const byId = new Map(items.map((item) => [item._id, item]));
            const hits = page.hits.flatMap((hit) => {
                const item = byId.get(hit.id);
                return item === undefined ? [] : [{ item, score: hit.score, matchedFields: hit.matchedFields }];
            });
            const nextOffset = offset + page.hits.length;
            return {
                hits,
                nextCursor: nextOffset < page.estimatedTotalHits ? `offset:${nextOffset}` : null,
            };
        } catch (error) {
            if (error instanceof InventorySearchUnavailableError)
                throw new AgentError('search_unavailable', 'Inventory search service is unavailable');
            throw error;
        }
    },
    path: async (itemId) => {
        try {
            return await getItemPath(itemId);
        } catch (error) {
            if (error instanceof RecordNotFoundException) return undefined;
            throw error;
        }
    },
    children: async (containerId, after, limit) =>
        await InventoryItemsCollection.find(
            {
                ...(containerId === null
                    ? { $or: [{ containerId: { $exists: false } }, { containerId: { $type: 'null' as const } }] }
                    : { containerId }),
                ...(after === undefined ? {} : { _id: { $gt: after } }),
            },
            { limit, sort: { _id: 1 } }
        ).fetchAsync(),
    identities: async (id) => (await bindings.find({ itemId: id }).fetchAsync()).map((binding) => binding.identity),
    resolve: async (identity) => (await bindings.findOneAsync(identityKey(identity)))?.itemId,
    event: async (id) => await events.findOneAsync(id),
    history: async (id) =>
        await events.find({ itemId: id }, { sort: { createdAt: 1, _id: 1 }, limit: 1000 }).fetchAsync(),
    lock: async (requestId) => {
        try {
            await locks.insertAsync({ _id: 'writer', requestId });
            return true;
        } catch (error) {
            if (isDuplicate(error)) return false;
            throw error;
        }
    },
    unlock: async (requestId) => {
        await locks.removeAsync({ _id: 'writer', requestId });
    },
    reserve: async (event) => {
        await events.insertAsync(event);
    },
    complete: async (event) => {
        const { _id, ...fields } = event;
        const result = await events.updateAsync({ _id, status: 'pending' }, { $set: fields });
        if (result !== 1) throw new Error('Could not finalize request ledger');
    },
    validate: async (request, before) => {
        if (request.op === 'move' && before?.locked === true)
            throw new AgentError('conflict', 'Item is locked; unlock it before changing its parent');
        if (request.op === 'createTag' && request.tag !== undefined) {
            if (
                request.tag.parentTagId !== undefined &&
                request.tag.parentTagId !== '' &&
                (await TagsCollection.findOneAsync(request.tag.parentTagId)) === undefined
            )
                throw new AgentError('not_found', 'Parent tag not found');
            const name = request.tag.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if ((await TagsCollection.findOneAsync({ name: { $regex: `^${name}$`, $options: 'i' } })) !== undefined)
                throw new AgentError('conflict', 'Tag name already exists; discover and reuse its ID');
        }
        const target =
            request.op === 'create'
                ? request.item?.containerId
                : request.op === 'move'
                ? request.containerId
                : undefined;
        if (target !== undefined && target !== null) {
            const parent = await InventoryItemsCollection.findOneAsync(target);
            if (parent?.isContainer !== true)
                throw new AgentError('invalid_input', 'Parent must be an existing container');
            if (before !== undefined && (await detectCircularReference(before._id, target, InventoryItemsCollection)))
                throw new AgentError('invalid_input', 'Move would create a circular container hierarchy');
        }
    },
    create: async (item, id) => await createInventoryItem(item, id),
    update: async (item, changes) => (await updateInventoryItem(item._id, changes, item)) === 1,
    move: async (item, target) => (await moveItem(item._id, target, item)) === 1,
    setLocked: async (item, locked) => (await setInventoryItemLocked(item._id, locked)) === 1,
    bind: async (identity, itemId) => {
        const id = identityKey(identity);
        const existing = await bindings.findOneAsync(id);
        if (existing !== undefined) {
            if (existing.itemId !== itemId) throw new AgentError('conflict', 'External identity is already bound');
            return;
        }
        await bindings.insertAsync({ _id: id, itemId, identity });
    },
};
