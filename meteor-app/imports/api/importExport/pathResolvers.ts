import { Random } from 'meteor/random';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import type InventoryItem from '/imports/model/InventoryItem';
import type TagRecord from '/imports/model/TagRecord';
import createLogger from '/imports/utility/Logger';
import type NoId from '/imports/utility/NoId';

const logger = createLogger(module);

export const DEFAULT_CONTAINER_PATH_SEPARATOR = '→';

export interface ContainerResolveOptions {
    autoCreate: boolean;
    separator?: string;
}

export interface TagResolveOptions {
    /**
     * If provided, the resolved tag will be created as a child of a root
     * tag whose name equals `groupName`. The root tag itself is created
     * on demand on first use within the session.
     */
    groupName?: string;
    autoCreate: boolean;
}

export interface TagListResolveOptions {
    autoCreate: boolean;
}

export interface PlannedContainerWrite {
    virtualId: string;
    name: string;
    containerId?: string;
}

export interface PlannedTagWrite {
    virtualId: string;
    name: string;
    parentTagId: string;
    path: Array<{ _id: string; name: string }>;
}

export interface PlannedWrites {
    containers: PlannedContainerWrite[];
    tags: PlannedTagWrite[];
}

export interface ResolverSessionOptions {
    /**
     * When true, no records are written to the database. Newly-needed
     * containers and tags are assigned virtual IDs (prefixed with
     * `virtual:`) and recorded in `getPlannedWrites()`.
     */
    dryRun?: boolean;
}

export interface ResolverSession {
    resolveContainerPath: (path: string, opts: ContainerResolveOptions) => Promise<string | undefined>;
    resolveTagByName: (name: string, opts: TagResolveOptions) => Promise<string>;
    resolveTagList: (names: string[], opts: TagListResolveOptions) => Promise<string[]>;
    /** Returns records that would be written if not in dryRun mode. */
    getPlannedWrites: () => PlannedWrites;
}

const VIRTUAL_ID_PREFIX = 'virtual:';

const containerCacheKey = (parentId: string | undefined, name: string): string => `${parentId ?? ''}\u0000${name}`;

const tagCacheKey = (parentId: string, name: string): string => `${parentId}\u0000${name.toLowerCase()}`;

export const createResolverSession = (options: ResolverSessionOptions = {}): ResolverSession => {
    const dryRun = options.dryRun === true;

    // Cache of resolved containers by `${parentId}\u0000${name}` (parentId '' for root).
    const containerCache = new Map<string, string>();
    // Cache of resolved tags by `${parentId}\u0000${name.toLowerCase()}`.
    const tagCache = new Map<string, string>();

    const plannedContainers: PlannedContainerWrite[] = [];
    const plannedTags: PlannedTagWrite[] = [];
    // Track full records for newly-planned items so cached-path lookups can
    // synthesise correct paths in dryRun mode.
    const plannedTagById = new Map<string, PlannedTagWrite>();

    const resolveContainerSegment = async (
        name: string,
        parentContainerId: string | undefined,
        autoCreate: boolean
    ): Promise<string | undefined> => {
        const key = containerCacheKey(parentContainerId, name);
        const cached = containerCache.get(key);
        if (typeof cached !== 'undefined') {
            return cached;
        }

        const existing = await InventoryItemsCollection.findOneAsync({
            name,
            isContainer: true,
            containerId: typeof parentContainerId === 'undefined' ? { $in: [undefined, ''] } : parentContainerId,
        });

        if (typeof existing !== 'undefined') {
            containerCache.set(key, existing._id);
            return existing._id;
        }

        if (!autoCreate) {
            return undefined;
        }

        const now = new Date();
        const newContainer: NoId<InventoryItem> = {
            name,
            isContainer: true,
            tagIds: [],
            containerId: typeof parentContainerId === 'undefined' ? undefined : parentContainerId,
            createdAt: now,
            modifiedAt: now,
        };

        const createdId: string = dryRun
            ? `${VIRTUAL_ID_PREFIX}c-${Random.id()}`
            : await InventoryItemsCollection.insertAsync(newContainer);

        if (dryRun) {
            plannedContainers.push({
                virtualId: createdId,
                name,
                containerId: newContainer.containerId,
            });
        } else {
            logger.log('Resolver created container', { id: createdId, name, parent: parentContainerId });
        }

        containerCache.set(key, createdId);
        return createdId;
    };

    const resolveContainerPath = async (path: string, opts: ContainerResolveOptions): Promise<string | undefined> => {
        const separator = opts.separator ?? DEFAULT_CONTAINER_PATH_SEPARATOR;
        if (typeof path !== 'string') {
            return undefined;
        }
        const segments = path
            .split(separator)
            .map((segment) => segment.trim())
            .filter((segment) => segment.length > 0);

        if (segments.length === 0) {
            return undefined;
        }

        let currentParent: string | undefined = undefined;
        for (const segment of segments) {
            const id = await resolveContainerSegment(segment, currentParent, opts.autoCreate);
            if (typeof id === 'undefined') {
                throw new Error(`Container path "${path}" cannot be resolved: missing segment "${segment}"`);
            }
            currentParent = id;
        }

        return currentParent;
    };

    const pathForPlannedTag = (parentTagId: string, leaf: { _id: string; name: string }): TagRecord['path'] => {
        if (parentTagId === '') {
            return [leaf];
        }
        const parentPlanned = plannedTagById.get(parentTagId);
        if (typeof parentPlanned !== 'undefined') {
            return [
                ...parentPlanned.path.slice(0, -1),
                { _id: parentPlanned.virtualId, name: parentPlanned.name },
                leaf,
            ];
        }
        // Parent already exists in DB; caller is responsible for refetching.
        // We return a minimal path that includes the parent ID + leaf to keep
        // dryRun output approximately correct.
        return [{ _id: parentTagId, name: '?' }, leaf];
    };

    const resolveTagByName = async (name: string, opts: TagResolveOptions): Promise<string> => {
        const trimmedName = name.trim();
        if (trimmedName === '') {
            throw new Error('Tag name cannot be empty.');
        }

        let parentTagId = '';
        if (typeof opts.groupName !== 'undefined' && opts.groupName.trim() !== '') {
            parentTagId = await resolveTagByName(opts.groupName.trim(), { autoCreate: opts.autoCreate });
        }

        const cacheKey = tagCacheKey(parentTagId, trimmedName);
        const cached = tagCache.get(cacheKey);
        if (typeof cached !== 'undefined') {
            return cached;
        }

        // Case-insensitive lookup keyed by parent (matches createTag's uniqueness pattern, but scoped per parent).
        const existing = await TagsCollection.findOneAsync({
            parentTagId,
            name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
        });

        if (typeof existing !== 'undefined') {
            tagCache.set(cacheKey, existing._id);
            return existing._id;
        }

        if (!opts.autoCreate) {
            throw new Error(`Tag "${trimmedName}" not found (autoCreate: false).`);
        }

        const now = new Date();

        if (dryRun) {
            const createdId = `${VIRTUAL_ID_PREFIX}t-${Random.id()}`;
            const path = pathForPlannedTag(parentTagId, { _id: createdId, name: trimmedName });
            const planned: PlannedTagWrite = {
                virtualId: createdId,
                name: trimmedName,
                parentTagId,
                path,
            };
            plannedTags.push(planned);
            plannedTagById.set(createdId, planned);
            tagCache.set(cacheKey, createdId);
            return createdId;
        }

        // Resolve parent path (if any) for cached-path field.
        const parentPath: TagRecord['path'] = await (async () => {
            if (parentTagId === '') return [];
            const parentTag = await TagsCollection.findOneAsync({ _id: parentTagId });
            if (typeof parentTag === 'undefined') {
                throw new Error(`Parent tag ${parentTagId} disappeared during resolution.`);
            }
            return parentTag.path;
        })();
        // Insert with a placeholder path; rewrite once we have the real _id.
        const newTag: NoId<TagRecord> = {
            name: trimmedName,
            parentTagId,
            createdAt: now,
            modifiedAt: now,
            path: [...parentPath, { _id: '', name: trimmedName }],
        };
        const createdId = await TagsCollection.insertAsync(newTag);
        // Rewrite the trailing path entry to include the real id.
        await TagsCollection.updateAsync(
            { _id: createdId },
            { $set: { path: [...parentPath, { _id: createdId, name: trimmedName }] } }
        );
        logger.log('Resolver created tag', { id: createdId, name: trimmedName, parent: parentTagId });

        tagCache.set(cacheKey, createdId);
        return createdId;
    };

    const resolveTagList = async (names: string[], opts: TagListResolveOptions): Promise<string[]> => {
        const ids: string[] = [];
        for (const raw of names) {
            const name = (typeof raw === 'string' ? raw : '').trim();
            if (name === '') continue;
            ids.push(await resolveTagByName(name, { autoCreate: opts.autoCreate }));
        }
        // Dedupe while preserving order.
        const seen = new Set<string>();
        return ids.filter((id) => {
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    };

    const getPlannedWrites = (): PlannedWrites => ({
        containers: [...plannedContainers],
        tags: [...plannedTags],
    });

    return {
        resolveContainerPath,
        resolveTagByName,
        resolveTagList,
        getPlannedWrites,
    };
};

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default createResolverSession;
