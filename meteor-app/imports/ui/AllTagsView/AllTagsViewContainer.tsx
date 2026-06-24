import React, { type ReactElement, useCallback, useState } from 'react';
import { useLocation } from 'wouter';

import { InventoryItemsCollection } from '/imports/api/items';
import TagsCollection, { type TagRecord } from '/imports/api/tags';
import { AllTagsViewPresentation } from '/imports/ui/AllTagsView/AllTagsViewPresentation';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { SCROLL_DELAY_MS } from '/imports/utility/constants';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import { usePageTitle } from '/imports/utility/usePageTitle';

/**
 * AllTagsViewContainer is a container component that fetches tag data from Meteor
 * and passes it to AllTagsViewPresentation.
 *
 * This component handles:
 * - Fetching all tags from Meteor
 * - Fetching tag usage counts
 * - Managing detached tags state
 * - Handling tag CRUD operations
 *
 * @remarks
 * The component uses Meteor's useTracker for reactive data and calls Meteor methods
 * for tag operations (create, rename, delete).
 */
export const AllTagsViewContainer = (): ReactElement => {
    const [, setLocation] = useLocation();

    const isLoadingTags = useSubscribe('tags.all');
    const isLoadingItems = useSubscribe('items.all');

    usePageTitle('Tags - My Inventory');

    // Fetch all tags
    const tags = useTracker(() => TagsCollection.find({}).fetch(), []);

    // Fetch tag usage counts reactively so counts update when items change.
    const tagUsageCounts = useTracker(() => {
        const counts: Record<string, number> = {};
        for (const item of InventoryItemsCollection.find({}).fetch()) {
            for (const tagId of item.tagIds) {
                counts[tagId] = (counts[tagId] ?? 0) + 1;
            }
        }
        return counts;
    }, []);

    // Detached tags state
    const [detachedTagsData, setDetachedTagsData] = useState<{
        updating: boolean;
        tagIds: string[];
        lastUpdated: null | Date;
        removing: boolean;
        removedCount: number;
    }>(() => ({
        updating: false,
        tagIds: [],
        lastUpdated: null,
        removing: false,
        removedCount: 0,
    }));

    const tagsWithoutPath: TagRecord[] = useTracker(
        () => TagsCollection.find({ path: { $exists: false } }).fetch(),
        []
    );

    // Tag operations
    const onAddChild = useCallback(async (parentTagId: string, tagName: string) => {
        try {
            const newTagId = await TagsCollection.createTag({ name: tagName, parentTagId });
            console.log(`New tag "${tagName}" created.`, newTagId);
        } catch (reason) {
            console.warn(`Creation of tag "${tagName}" failed:`, reason);
            throw reason;
        }
    }, []);

    const onRename = useCallback((tag: TagRecord, newName: string) => {
        TagsCollection.renameTag(tag, newName).then(
            (succeeded: boolean) => {
                if (succeeded) {
                    console.log(`Name of tag "${tag.name}" changed to "${newName}".`);
                } else {
                    console.warn(`Name of tag "${tag.name}" not changed: No-match.`);
                }
            },
            (reason) => {
                console.warn(`Renaming of tag "${tag.name}" failed:`, reason);
            }
        );
    }, []);

    const onDelete = useCallback((tag: TagRecord) => {
        TagsCollection.removeTag(tag._id).then(
            (succeeded: boolean) => {
                if (succeeded) {
                    console.log(`Tag "${tag.name}" removed.`);
                } else {
                    console.warn(`Tag "${tag.name}" not removed: No-match.`);
                }
            },
            (reason) => {
                console.warn(`Removal of tag "${tag.name}" failed:`, reason);
            }
        );
    }, []);

    // Detached tags operations
    const onCheckDetachedTags = useCallback(() => {
        if (detachedTagsData.updating || detachedTagsData.removing) {
            console.warn('Update already in progress.');
            return;
        }

        setDetachedTagsData((data) => {
            return { ...data, updating: true };
        });

        TagsCollection.getDetachedTags().then(
            (tagIds) => {
                console.log('Detached tags', tagIds);

                setDetachedTagsData((data) => {
                    return { ...data, updating: false, tagIds, lastUpdated: new Date() };
                });
            },
            (error) => {
                console.error(`Failed getting detached tags.`, error);

                setDetachedTagsData((data) => {
                    return { ...data, updating: false };
                });
            }
        );
    }, [detachedTagsData.updating, detachedTagsData.removing]);

    const onRemoveAllDetachedTags = useCallback(() => {
        if (detachedTagsData.updating || detachedTagsData.removing) {
            console.warn('Update already in progress.');
            return;
        }

        if (detachedTagsData.tagIds.length === 0) {
            console.warn('Nothing to remove.');
            return;
        }

        console.log(`Starting to remove detached tags...`, detachedTagsData.tagIds);

        setDetachedTagsData((data) => {
            return { ...data, removing: true, removedCount: 0 };
        });

        detachedTagsData.tagIds
            .reduce(async (last, tagId) => {
                await last;
                await TagsCollection.removeTag(tagId);

                setDetachedTagsData(({ removedCount, ...data }) => {
                    const newRemovedCount = removedCount + 1;

                    console.log(
                        `Removing detached tags - progress: ${newRemovedCount} / ${detachedTagsData.tagIds.length}`
                    );

                    return { ...data, removedCount: newRemovedCount };
                });

                await new Promise((resolve) => {
                    setTimeout(resolve, SCROLL_DELAY_MS);
                });
            }, Promise.resolve())
            .then(
                () => {
                    console.log(
                        `Completed removing ${detachedTagsData.tagIds.length} detached tags`,
                        detachedTagsData.tagIds
                    );

                    setDetachedTagsData((data) => {
                        return { ...data, tagIds: [], removing: false, removedCount: 0 };
                    });
                },
                (error) => {
                    console.error(`Error when removing detached tags:`, error);

                    setDetachedTagsData((data) => {
                        return { ...data, tagIds: [], lastUpdated: null, removing: false, removedCount: 0 };
                    });
                }
            );
    }, [detachedTagsData.updating, detachedTagsData.removing, detachedTagsData.tagIds]);

    if (isLoadingTags() || isLoadingItems()) {
        return <LoadingState />;
    }

    return (
        <AllTagsViewPresentation
            tags={tags}
            usageCounts={tagUsageCounts}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
            onTagClick={(tagId) => {
                setLocation(`/tags/${tagId}`);
            }}
            detachedTags={{
                detachedTagIds: detachedTagsData.tagIds,
                isUpdating: detachedTagsData.updating,
                isRemoving: detachedTagsData.removing,
                removedCount: detachedTagsData.removedCount,
                lastUpdated: detachedTagsData.lastUpdated,
                onCheck: onCheckDetachedTags,
                onRemoveAll: onRemoveAllDetachedTags,
            }}
            tagsWithoutPath={tagsWithoutPath}
        />
    );
};
