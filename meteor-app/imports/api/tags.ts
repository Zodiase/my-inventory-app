import extend from 'lodash/extend';
import { Meteor } from 'meteor/meteor';

import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import TagRecord from '/imports/model/TagRecord';
import createLogger from '/imports/utility/Logger';
import asMeteorMethods from '/imports/utility/MeteorMethods';
import { NamedCollection } from '/imports/utility/NamedCollection';
import NoId from '/imports/utility/NoId';
import RecordInput from '/imports/utility/RecordInput';
import strictSelector from '/imports/utility/strictSelector';

export { TagRecord } from '/imports/model/TagRecord';

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

    if (parentTagId !== '') {
        await assertParentTag(parentTagId);
    }

    const now = new Date();
    const newTag: NoId<TagRecord> = {
        name,
        parentTagId,
        createdAt: now,
        modifiedAt: now,
        path: await getTagPath({ _id: '', name, parentTagId }, Meteor.settings.fixPath),
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

    const selector = extend(strictSelector(tag, ['name']), {
        $or: [
            {
                'path._id': {
                    $exists: false,
                },
            },
            {
                'path._id': {
                    $exists: true,
                    $in: ['', tag._id],
                },
            },
        ],
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
    let thisTag: undefined | TagRecord;

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
    TagsCollection.find({ parentTagId: { $ne: '' } }).forEach((tag) => {
        const parentTagId = tag.parentTagId;
        const alreadyProcessed = tagsToCheck.has(parentTagId) || detachedTags.has(parentTagId);

        if (alreadyProcessed) {
            return;
        }

        const tagIsDetached = TagsCollection.find({ _id: parentTagId }).count() === 0;

        if (tagIsDetached) {
            detachedTags.add(tag._id);
            checkedTags.add(tag._id);
        } else {
            tagsToCheck.add(parentTagId);
        }
    });

    // Check to see if any ancestors of a tag are detached.
    while (tagsToCheck.size > 0) {
        const [thisTagId] = tagsToCheck;
        tagsToCheck.delete(thisTagId);

        if (checkedTags.has(thisTagId)) {
            // Already checked.
            continue;
        }

        checkedTags.add(thisTagId);

        const thisTag = TagsCollection.findOne({ _id: thisTagId });

        if (typeof thisTag === 'undefined') {
            // This tag disappeared for some reason.
            continue;
        }

        if (thisTag.parentTagId === '') {
            // This tag has no parent, this is good.
            continue;
        }

        const tagIsDetached = TagsCollection.find({ _id: thisTag.parentTagId }).count() === 0;

        if (tagIsDetached) {
            // Add this and all connected tags as detached.
            detachedTags.add(thisTagId);

            let descendants: TagRecord[] = TagsCollection.find({ parentTagId: thisTagId }).fetch();
            let thisDescendant: undefined | TagRecord;

            while (typeof (thisDescendant = descendants.shift()) !== 'undefined') {
                const thisDescendantId = thisDescendant._id;

                if (checkedTags.has(thisDescendantId)) {
                    continue;
                }

                checkedTags.add(thisDescendantId);
                detachedTags.add(thisDescendantId);

                const childTags = TagsCollection.find({ parentTagId: thisDescendantId }).fetch();

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
            path: await getTagPath(tag, Meteor.settings.fixPath),
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

export default asMeteorMethods(TagsCollection, {
    createTag,
    renameTag,
    setTagParent,
    removeTag,
    getDetachedTags,
    fixPath,
    watchAndFixMissingPath,
});
