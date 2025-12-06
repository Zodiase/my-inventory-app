import extend from 'lodash/extend';
import { Meteor } from 'meteor/meteor';

import { InventoryItemsCollection } from '/imports/api/items';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import type TagRecord from '/imports/model/TagRecord';
import createLogger from '/imports/utility/Logger';
import asMeteorMethods from '/imports/utility/MeteorMethods';
import MeteorSettings from '/imports/utility/meteorSettings';
import { NamedCollection } from '/imports/utility/NamedCollection';
import type NoId from '/imports/utility/NoId';
import type RecordInput from '/imports/utility/RecordInput';
import strictSelector from '/imports/utility/strictSelector';

export type { TagRecord } from '/imports/model/TagRecord';

const logger = createLogger(module);

export const TagsCollection = new NamedCollection<TagRecord>('tags');

export const assertParentTag = async (parentTagId: string): Promise<TagRecord> => {
    const parentTagSelector = { _id: parentTagId };

    const parentTag = await TagsCollection.findOneAsync(parentTagSelector);

    if (typeof parentTag === 'undefined') {
        throw new RecordNotFoundException('Parent Tag not found', parentTagSelector);
    }

    return parentTag;
};

export const getTagPath = async (
    tag: Pick<TagRecord, '_id' | 'name' | 'parentTagId'> & Partial<Pick<TagRecord, 'path'>>,
    fix = false
): Promise<TagRecord['path']> => {
    if (!fix && typeof tag.path !== 'undefined') {
        return tag.path;
    }

    const leafNode = { _id: tag._id, name: tag.name };
    if (tag.parentTagId === '') {
        return [leafNode];
    }

    const parentTag = await assertParentTag(tag.parentTagId);
    const parentTagPath = await getTagPath(parentTag, fix);

    if (fix && JSON.stringify(parentTag.path) !== JSON.stringify(parentTagPath)) {
        logger.log(`Fixing path for tag "${parentTag.name}" (${parentTag._id}).`);

        const selector = strictSelector(parentTag, ['name', 'parentTagId']);
        await TagsCollection.updateAsync(selector, {
            $set: {
                path: parentTagPath,
            },
        });
    }

    return [...parentTagPath, leafNode];
};

export const createTag = async (tagInput: RecordInput<TagRecord>): Promise<string> => {
    const { name, parentTagId = '' } = tagInput;

    if (typeof name === 'undefined') {
        throw new Error('Tag must have a name.');
    }

    // Check for case-insensitive duplicate
    const existingTag = await TagsCollection.findOneAsync({
        name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (typeof existingTag !== 'undefined') {
        throw new Error(`Tag with name "${name}" already exists.`);
    }

    if (parentTagId !== '') {
        await assertParentTag(parentTagId);
    }

    const now = new Date();
    const newTag: NoId<TagRecord> = {
        name,
        parentTagId,
        createdAt: now,
        modifiedAt: now,
        path: await getTagPath({ _id: '', name, parentTagId }, MeteorSettings.fixPath),
    };

    const tagId = await TagsCollection.insertAsync(newTag);

    return tagId;
};

/**
 * TODO: make atomic operation.
 * @param tag
 * @param newName
 * @returns
 */
export const renameTag = async (tag: TagRecord, newName: string): Promise<boolean> => {
    logger.log('renameTag <=', { tag, newName });

    // Check for case-insensitive duplicate (excluding the current tag)
    const existingTag = await TagsCollection.findOneAsync({
        _id: { $ne: tag._id },
        name: { $regex: `^${newName}$`, $options: 'i' },
    });

    if (typeof existingTag !== 'undefined') {
        throw new Error(`Tag with name "${newName}" already exists.`);
    }

    const selector = extend(strictSelector(tag, ['name']), {
        path: {
            $elemMatch: {
                _id: {
                    $in: ['', tag._id],
                },
            },
        },
    });

    let tagsUpdated = await TagsCollection.updateAsync(selector, {
        $set: {
            name: newName,
            'path.$.name': newName,
        },
    });

    const tagIsUpdated = tagsUpdated > 0;

    if (tagIsUpdated) {
        // Update all tags has this tag in their paths. (i.e. descendants.)
        tagsUpdated += await TagsCollection.updateAsync(
            {
                _id: {
                    $ne: tag._id,
                },
                'path._id': tag._id,
                'path.name': {
                    $ne: newName,
                },
            },
            {
                $set: {
                    'path.$.name': newName,
                },
            },
            { multi: true }
        );
    }

    logger.log('renameTag =>', { tag, newName, tagsUpdated });

    return tagIsUpdated;
};

export const getAllDescendants = async (tag: TagRecord): Promise<TagRecord[]> => {
    let tagsToCheck = [tag];
    let resultTags: TagRecord[] = [];
    let thisTag: undefined | TagRecord = undefined;

    while (typeof (thisTag = tagsToCheck.shift()) !== 'undefined') {
        const immediateChildren = await TagsCollection.find({ parentTagId: thisTag._id }).fetchAsync();

        tagsToCheck = tagsToCheck.concat(immediateChildren);
        resultTags = resultTags.concat(immediateChildren);
    }

    return resultTags;
};

/**
 * A potentially more efficient way (only 1 query instead of log(N)) to find descendants.
 * This assumes all tag paths are complete and correct.
 * A descendant's path must include this tag.
 * @param tag
 * @returns
 */
export const getAllDescendantsByPath = async (tag: TagRecord): Promise<TagRecord[]> => {
    return await TagsCollection.find({
        _id: {
            $ne: tag._id,
        },
        'path._id': tag._id,
        'path.name': tag.name,
    }).fetchAsync();
};

/**
 * TODO: make atomic operation.
 * @param tag
 * @param newParentTagId
 * @returns
 */
export const setTagParent = async (tag: TagRecord, newParentTagId: string): Promise<number> => {
    logger.log('setTagParent <=', { tag, newParentTagId });

    let tagsUpdated = await TagsCollection.updateAsync(strictSelector(tag, ['parentTagId']), {
        $set: {
            parentTagId: newParentTagId,
            path: await getTagPath({ _id: tag._id, name: tag.name, parentTagId: newParentTagId }),
        },
    });

    const tagIsUpdated = tagsUpdated > 0;

    if (tagIsUpdated) {
        // Update path of all descendants.
        for (const thisTag of await getAllDescendantsByPath(tag)) {
            tagsUpdated += await fixPath(thisTag);
        }
    }

    logger.log('setTagParent =>', { tag, newParentTagId, tagsUpdated });

    return tagsUpdated;
};

//! Remove child tags.
export const removeTag = async (tagId: string): Promise<boolean> => {
    return (await TagsCollection.removeAsync(tagId)) > 0;
};

export const getDetachedTags = async (): Promise<string[]> => {
    const tagsToCheck = new Set<string>();
    const detachedTags = new Set<string>();
    const checkedTags = new Set<string>();

    // Find tags the immediate parents of which are not found.
    const candidateTags = await TagsCollection.find({ parentTagId: { $ne: '' } }).fetchAsync();
    for (const tag of candidateTags) {
        const parentTagId = tag.parentTagId;
        const alreadyProcessed = tagsToCheck.has(parentTagId) || detachedTags.has(parentTagId);
        if (alreadyProcessed) continue;
        const parentCount = await TagsCollection.find({ _id: parentTagId }).countAsync();
        const tagIsDetached = parentCount === 0;
        if (tagIsDetached) {
            detachedTags.add(tag._id);
            checkedTags.add(tag._id);
        } else {
            tagsToCheck.add(parentTagId);
        }
    }

    // Check to see if any ancestors of a tag are detached.
    while (tagsToCheck.size > 0) {
        const [thisTagId] = tagsToCheck;
        tagsToCheck.delete(thisTagId);

        if (checkedTags.has(thisTagId)) {
            // Already checked.
            continue;
        }

        checkedTags.add(thisTagId);

        const thisTag = await TagsCollection.findOneAsync({ _id: thisTagId });

        if (typeof thisTag === 'undefined') {
            // This tag disappeared for some reason.
            continue;
        }

        if (thisTag.parentTagId === '') {
            // This tag has no parent, this is good.
            continue;
        }

        const tagIsDetached = (await TagsCollection.find({ _id: thisTag.parentTagId }).countAsync()) === 0;

        if (tagIsDetached) {
            // Add this and all connected tags as detached.
            detachedTags.add(thisTagId);

            let descendants: TagRecord[] = await TagsCollection.find({ parentTagId: thisTagId }).fetchAsync();
            let thisDescendant: undefined | TagRecord = undefined;

            while (typeof (thisDescendant = descendants.shift()) !== 'undefined') {
                const thisDescendantId = thisDescendant._id;

                if (checkedTags.has(thisDescendantId)) {
                    continue;
                }

                checkedTags.add(thisDescendantId);
                detachedTags.add(thisDescendantId);

                const childTags = await TagsCollection.find({ parentTagId: thisDescendantId }).fetchAsync();

                if (childTags.length > 0) {
                    descendants = descendants.concat(childTags);
                }
            }
        } else {
            tagsToCheck.add(thisTag.parentTagId);
        }
    }

    return [...detachedTags.values()];
};

export const fixPath = async (tag: TagRecord): Promise<number> => {
    return await TagsCollection.updateAsync(strictSelector(tag, ['name']), {
        $set: {
            path: await getTagPath(tag, MeteorSettings.fixPath),
        },
    });
};

export const watchAndFixMissingPath = async (): Promise<true> => {
    logger.log('watching for tags without path...');

    TagsCollection.find({
        'path._id': {
            $exists: false,
        },
    }).observe({
        added(tag) {
            (async () => {
                logger.log('Found tag without path:', { tag });
                await fixPath(tag);
            })().catch((reason) => {
                logger.warn('Path fixing failed.', reason);
            });
        },
    });

    return true;
};

/**
 * Delete a tag and remove it from all items that reference it.
 * @param tagId - The ID of the tag to delete
 * @returns true if tag was deleted, false if tag didn't exist
 */
export const deleteTag = async (tagId: string): Promise<boolean> => {
    // First, remove this tag from all items
    await InventoryItemsCollection.updateAsync({ tagIds: tagId }, { $pull: { tagIds: tagId } }, { multi: true });

    // Then delete the tag
    const removed = await TagsCollection.removeAsync(tagId);
    return removed > 0;
};

/**
 * Add a tag to an item.
 * @param itemId - The ID of the item
 * @param tagId - The ID of the tag to add
 * @returns true on success
 * @throws RecordNotFoundException if item or tag doesn't exist
 */
export const addToItem = async (itemId: string, tagId: string): Promise<boolean> => {
    // Verify item exists
    const item = await InventoryItemsCollection.findOneAsync({ _id: itemId });
    if (typeof item === 'undefined') {
        throw new RecordNotFoundException('Item not found', { _id: itemId });
    }

    // Verify tag exists
    const tag = await TagsCollection.findOneAsync({ _id: tagId });
    if (typeof tag === 'undefined') {
        throw new RecordNotFoundException('Tag not found', { _id: tagId });
    }

    // Add tag to item (idempotent - $addToSet only adds if not present)
    await InventoryItemsCollection.updateAsync({ _id: itemId }, { $addToSet: { tagIds: tagId } });

    return true;
};

/**
 * Remove a tag from an item.
 * @param itemId - The ID of the item
 * @param tagId - The ID of the tag to remove
 * @returns true (operation is idempotent)
 */
export const removeFromItem = async (itemId: string, tagId: string): Promise<boolean> => {
    // Remove tag from item (idempotent - $pull is safe even if tag not present)
    await InventoryItemsCollection.updateAsync({ _id: itemId }, { $pull: { tagIds: tagId } });

    return true;
};

/**
 * Get usage counts for all tags (how many items have each tag).
 *
 * @returns Record mapping tagId to count of items with that tag
 *
 * @remarks
 * This aggregates across all inventory items to count tag usage.
 * Returns a map where each key is a tag ID and the value is the number
 * of items that have that tag in their tagIds array.
 *
 * @example
 * ```typescript
 * const counts = await getTagUsageCounts();
 * // { "tag1": 5, "tag2": 12, "tag3": 0 }
 * ```
 */
export const getTagUsageCounts = async (): Promise<Record<string, number>> => {
    const items = await InventoryItemsCollection.find({}).fetchAsync();
    const counts: Record<string, number> = {};

    // Count how many items have each tag
    for (const item of items) {
        for (const tagId of item.tagIds) {
            counts[tagId] = (counts[tagId] ?? 0) + 1;
        }
    }

    return counts;
};

// Publications (server-side only)
if (Meteor.isServer) {
    /**
     * Publish all tags.
     *
     * @returns Cursor for all tags
     *
     * @remarks
     * Tags are published with all fields including path information.
     * Used for tag selection, filtering, and management interfaces.
     */
    Meteor.publish('tags.all', function publishAllTags() {
        logger.log('Publishing tags.all');
        return TagsCollection.find({});
    });
}

export default asMeteorMethods(TagsCollection, {
    createTag,
    renameTag,
    setTagParent,
    removeTag,
    deleteTag,
    addToItem,
    removeFromItem,
    getDetachedTags,
    getTagUsageCounts,
    fixPath,
    watchAndFixMissingPath,
});
