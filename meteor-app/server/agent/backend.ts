/**
 * Mongo persistence for the agent replay ledger, exclusive writer and identity map.
 * Inventory mutations use the application's business functions; the auxiliary
 * collections do not issue or modify identities in an external sticker registry.
 */
import { Mongo } from 'meteor/mongo';

import { InventoryIdentitiesCollection } from '/imports/api/identities';
import {
    activeInventoryItemSelector,
    InventoryItemsCollection,
    createInventoryItem,
    logicalDeleteInventoryItem,
    updateInventoryItem,
    moveItem,
    setInventoryItemLocked,
} from '/imports/api/items';
import { TagsCollection, createTag } from '/imports/api/tags';
import detectCircularReference from '/imports/utility/circularReference';

import { AgentError, identityKey } from './service';
import type { Backend, DeleteAuthorization, Event } from './service';

const events = new Mongo.Collection<Event>('agent_requests');
const deleteAuthorizations = new Mongo.Collection<DeleteAuthorization>('agent_delete_authorizations');
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
            activeInventoryItemSelector({
                tagIds: tagId,
                ...(after === undefined ? {} : { _id: { $gt: after } }),
            }),
            { limit, sort: { _id: 1 } }
        ).fetchAsync(),
    createTag: async (tag, id) => await createTag(tag, id),
    get: async (id) => await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: id })),
    getIncludingDeleted: async (id) => await InventoryItemsCollection.findOneAsync(id),
    search: async (name) =>
        await InventoryItemsCollection.find(
            activeInventoryItemSelector({
                name: { $regex: name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            }),
            { limit: 100, sort: { _id: 1 } }
        ).fetchAsync(),
    children: async (containerId, after, limit) =>
        await InventoryItemsCollection.find(
            activeInventoryItemSelector({
                ...(containerId === null
                    ? { $or: [{ containerId: { $exists: false } }, { containerId: { $type: 'null' as const } }] }
                    : { containerId }),
                ...(after === undefined ? {} : { _id: { $gt: after } }),
            }),
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
    createDeleteAuthorization: async (authorization) => {
        await deleteAuthorizations.insertAsync(authorization);
    },
    deleteAuthorization: async (authorizationHash) => await deleteAuthorizations.findOneAsync(authorizationHash),
    claimDeleteAuthorization: async (authorizationHash, confirmationRequestId, attemptedAt) => {
        const result = await deleteAuthorizations.updateAsync(
            { _id: authorizationHash, consumedAt: { $exists: false } },
            { $set: { consumedAt: attemptedAt, confirmationRequestId } }
        );
        if (result === 1)
            return await deleteAuthorizations.findOneAsync({ _id: authorizationHash, confirmationRequestId });
        return await deleteAuthorizations.findOneAsync(authorizationHash);
    },
    finishDeleteAuthorization: async (authorizationHash, confirmationRequestId, terminal) => {
        const result = await deleteAuthorizations.updateAsync(
            {
                _id: authorizationHash,
                confirmationRequestId,
                completedAt: { $exists: false },
            },
            { $set: terminal }
        );
        if (result === 1) return true;
        const existing = await deleteAuthorizations.findOneAsync({ _id: authorizationHash, confirmationRequestId });
        return existing?.completedAt !== undefined;
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
            const parent = await InventoryItemsCollection.findOneAsync(activeInventoryItemSelector({ _id: target }));
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
    logicalDelete: async (item, metadata, deletedAt) => {
        return (
            (await logicalDeleteInventoryItem(item, {
                requestId: metadata.requestId,
                source: metadata.source,
                note: metadata.note,
                deletedAt,
            })) === 1
        );
    },
    activeChildCount: async (itemId) =>
        await InventoryItemsCollection.find(activeInventoryItemSelector({ containerId: itemId })).countAsync(),
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
