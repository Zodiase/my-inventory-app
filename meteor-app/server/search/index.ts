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

import { completedAgentJournalPrefix } from '../agent/journal';
import type { Event } from '../agent/service';

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
let indexReady = false;
let indexedThrough = 0;
const indexedAhead = new Set<number>();
const JOURNAL_WAIT_MS = 5_000;
const JOURNAL_POLL_MS = 50;

const markIndexed = (sequence: number): void => {
    if (sequence <= indexedThrough) return;
    indexedAhead.add(sequence);
    while (indexedAhead.delete(indexedThrough + 1)) indexedThrough++;
};

/** Schedule after ledger completion; a failed task leaves a gap until rebuild. */
export const scheduleAgentJournalIndex = (event: Event): void => {
    const sequence = event.journalSequence;
    if (sequence === undefined) return; // Events from before journal sequencing was introduced.
    void enqueue(async () => {
        if (event.itemId !== undefined) {
            const item = await InventoryItemsCollection.findOneAsync(event.itemId);
            if (item === undefined) await client.delete(event.itemId);
            else await client.upsert(toSearchDocument(item));
        }
        // Tag writes do not alter item search documents.
        markIndexed(sequence);
    }).catch((error: unknown) => {
        logger.warn('Agent journal search synchronization failed', { sequence, error });
    });
};

/** A bounded wait prevents a lagging index from masquerading as an empty result. */
export const waitForAgentJournalSequence = async (sequence: number): Promise<boolean> => {
    const deadline = Date.now() + JOURNAL_WAIT_MS;
    for (;;) {
        if (indexReady && indexedThrough >= sequence) return true;
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => setTimeout(resolve, JOURNAL_POLL_MS));
    }
};

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
    // Capture the completed prefix before the item snapshot. Later writes queue their own sync.
    const completedPrefix = await completedAgentJournalPrefix();
    const items = await InventoryItemsCollection.find({}, { sort: { _id: 1 } }).fetchAsync();
    await client.rebuild(items.map(toSearchDocument));
    indexedThrough = Math.max(indexedThrough, completedPrefix);
    for (const sequence of indexedAhead) if (sequence <= indexedThrough) indexedAhead.delete(sequence);
    while (indexedAhead.delete(indexedThrough + 1)) indexedThrough++;
    indexReady = true;
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
