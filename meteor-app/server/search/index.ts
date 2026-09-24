/**
 * Connects authoritative MongoDB inventory records to the derived Meilisearch index.
 * Startup uses an atomic rebuild; normal writes are queued serially and can always
 * be recovered by rebuilding from MongoDB.
 */
import { Meteor } from 'meteor/meteor';

import { InventoryItemsCollection } from '/imports/api/items';
import type InventoryItem from '/imports/model/InventoryItem';
import type { PropertyValues } from '/imports/model/PropertyValues';
import {
    InventorySearchUnavailableError,
    registerInventorySearchProvider,
} from '/imports/search/InventorySearchProvider';
import { registerInventorySearchSync } from '/imports/search/InventorySearchSync';
import createLogger from '/imports/utility/Logger';

import { requireInventorySearchApiKey } from './config';
import { MeilisearchInventoryClient, type SearchDocument } from './meilisearch';

const logger = createLogger(module);
const DEFAULT_URL = 'http://127.0.0.1:7700';
const DEFAULT_INDEX = 'inventory_items';
const MINUTES_TO_MILLISECONDS = 60_000;
const DEFAULT_RECONCILE_MINUTES = 15;
const DEFAULT_RECONCILE_MS = DEFAULT_RECONCILE_MINUTES * MINUTES_TO_MILLISECONDS;
const DEFAULT_TIMEOUT_MS = 10_000;

const stringValues = (properties: PropertyValues | undefined): string[] =>
    [
        properties?.make,
        properties?.model,
        properties?.serialNumber,
        properties?.purchaseFrom,
        properties?.warranty,
        properties?.condition,
        properties?.fixtureType,
    ].filter((value): value is string => typeof value === 'string' && value !== '');

const toSearchDocument = (item: InventoryItem): SearchDocument => ({
    id: item._id,
    name: item.name,
    description: item.description ?? '',
    aliases: item.properties?.searchAliases ?? [],
    vocabulary_en: item.properties?.searchVocabulary?.en ?? [],
    vocabulary_zh: item.properties?.searchVocabulary?.zh ?? [],
    vocabulary_ja: item.properties?.searchVocabulary?.ja ?? [],
    metadata: stringValues(item.properties),
    modifiedAt: item.modifiedAt.toISOString(),
});

const client = new MeilisearchInventoryClient({
    url: process.env.INVENTORY_SEARCH_URL ?? DEFAULT_URL,
    apiKey: requireInventorySearchApiKey(),
    index: process.env.INVENTORY_SEARCH_INDEX ?? DEFAULT_INDEX,
    timeoutMs: Number(process.env.INVENTORY_SEARCH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
});

let queue = Promise.resolve();
const enqueue = async (work: () => Promise<void>): Promise<void> => {
    const next = queue.then(work, work);
    queue = next.catch((error: unknown) => {
        logger.warn('Inventory search synchronization failed', error);
    });
    await next;
};

registerInventorySearchProvider({
    search: async (query, offset, limit) => await client.search(query, offset, limit),
    health: async () => {
        await client.health();
    },
});

registerInventorySearchSync({
    upsert: async (itemId) => {
        await enqueue(async () => {
            const item = await InventoryItemsCollection.findOneAsync(itemId);
            if (item === undefined) await client.delete(itemId);
            else await client.upsert(toSearchDocument(item));
        });
    },
    delete: async (itemId) => {
        await enqueue(async () => {
            await client.delete(itemId);
        });
    },
    rebuild: async () => {
        await enqueue(async () => {
            await rebuildInventorySearch();
        });
    },
});

export const rebuildInventorySearch = async (): Promise<void> => {
    const items = await InventoryItemsCollection.find({}, { sort: { _id: 1 } }).fetchAsync();
    await client.rebuild(items.map(toSearchDocument));
    logger.log('Inventory search index rebuilt', { count: items.length });
};

export const initializeInventorySearch = async (): Promise<void> => {
    try {
        await enqueue(rebuildInventorySearch);
    } catch (error) {
        if (error instanceof InventorySearchUnavailableError) {
            logger.warn('Required inventory search service is unavailable', error);
        }
        throw error;
    }

    const reconcileMs = Number(process.env.INVENTORY_SEARCH_RECONCILE_MS ?? DEFAULT_RECONCILE_MS);
    if (Number.isFinite(reconcileMs) && reconcileMs > 0) {
        const timer = setInterval(() => {
            void enqueue(rebuildInventorySearch).catch((error: unknown) => {
                logger.warn('Periodic inventory search reconciliation failed', error);
            });
        }, reconcileMs);
        timer.unref();
    }
};

Meteor.methods({
    'inventorySearch.health': async () => {
        await client.health();
        return { ok: true, index: process.env.INVENTORY_SEARCH_INDEX ?? DEFAULT_INDEX };
    },
});
