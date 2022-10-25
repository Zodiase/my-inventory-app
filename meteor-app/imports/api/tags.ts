import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import asMeteorMethods from '/imports/utility/asMeteorMethods';
import NoId from '/imports/utility/NoId';
import RecordInput from '/imports/utility/RecordInput';
import RecordNotFoundException from '/imports/model/RecordNotFoundException';
import strictSelector from '/imports/utility/strictSelector';
import TagRecord from '/imports/model/TagRecord';

export { TagRecord } from '/imports/model/TagRecord';

export const TagsCollection = new Mongo.Collection<TagRecord>('tags');

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
        console.log(`Fixing path for tag "${parentTag.name}" (${parentTag._id}).`);

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

export const renameTag = async (tag: TagRecord, newName: string): Promise<boolean> => {
    console.log('renameTag <=', { tag, newName });

    const selector = strictSelector(tag, ['name']);
    const updateCount = await TagsCollection.updateAsync(selector, {
        $set: {
            name: newName,
        },
    });

    console.log('renameTag =>', { tag, newName, updateCount });

    return updateCount > 0;
};

export const setTagParent = async (tag: TagRecord, newParentTagId: string): Promise<boolean> => {
    return (
        (await TagsCollection.updateAsync(strictSelector(tag, ['parentTagId']), {
            $set: {
                parentTagId: newParentTagId,
            },
        })) > 0
    );
};

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

export default asMeteorMethods(TagsCollection, {
    createTag,
    renameTag,
    setTagParent,
    removeTag,
    getDetachedTags,
});
