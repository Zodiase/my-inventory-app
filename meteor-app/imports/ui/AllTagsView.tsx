import { useTracker } from 'meteor/react-meteor-data';
import React, { ComponentProps, ReactElement, useCallback, useState } from 'react';
import styled from 'styled-components';
import StyledButton from './StyledButton';
import TagsCollection, { TagRecord } from '/imports/api/tags';

interface TagListProps {
    tag?: TagRecord;
}

const TagList = styled(({ tag, ...rootElementProps }: TagListProps & ComponentProps<'div'>): ReactElement => {
    const tagId = tag?._id ?? '';
    const tagName = tag?.name ?? 'All Tags';
    const childTags = useTracker(
        () =>
            TagsCollection.find(
                { parentTagId: tagId },
                {
                    sort: [
                        ['name', 'asc'],
                        ['createdAt', 'asc'],
                    ],
                }
            ).fetch(),
        [tagId]
    );

    const onClickAddChildButton = useCallback(() => {
        const newTagName = window.prompt(`Name of new tag:`);

        if (newTagName === null) {
            console.log(`New tag not created: Cancelled.`);
            return;
        }

        (async () => await TagsCollection.createTag({ name: newTagName, parentTagId: tagId }))().then(
            (newTagId) => {
                console.log(`New tag "${newTagName}" created.`, newTagId);
            },
            (reason) => {
                console.warn(`Creation of tag "${newTagName}" failed:`, reason);
            }
        );
    }, [tagId]);

    const onClickRenameButton = useCallback(() => {
        if (typeof tag === 'undefined') {
            console.warn('NOOP: Invalid parent tag.');
            return;
        }

        const newTagName = window.prompt(`New name for tag "${tagName}":`, tagName);

        if (newTagName === null) {
            console.log(`Name of tag "${tagName}" unchanged: Cancelled.`);
            return;
        }

        if (newTagName === tagName) {
            console.log(`Name of tag "${tagName}" unchanged: Identical.`);
            return;
        }

        (async () => await TagsCollection.renameTag(tag, newTagName))().then(
            (succeeded) => {
                if (succeeded) {
                    console.log(`Name of tag "${tagName}" changed to "${newTagName}".`);
                } else {
                    console.warn(`Name of tag "${tagName}" not unchanged: No-match.`);
                }
            },
            (reason) => {
                console.warn(`Renaming of tag "${tagName}" failed:`, reason);
            }
        );
    }, [tagName, tag]);

    const onClickDeleteButton = useCallback(() => {
        if (typeof tag === 'undefined') {
            console.warn('NOOP: Invalid parent tag.');
            return;
        }

        const confirmDelete = window.confirm(`Delete tag "${tagName}"?`);

        if (!confirmDelete) {
            console.log(`Tag "${tagName}" not removed: Cancelled.`);
            return;
        }

        (async () => await TagsCollection.removeTag(tag._id))().then(
            (succeeded) => {
                if (succeeded) {
                    console.log(`Tag "${tagName}" removed.`);
                } else {
                    console.warn(`Tag "${tagName}" not removed: No-match.`);
                }
            },
            (reason) => {
                console.warn(`Removal of tag "${tagName}" failed:`, reason);
            }
        );
    }, [tagName, tag]);

    return (
        <div {...rootElementProps} data-tag-id={tagId}>
            <div className="tag-body" data-tag-id={tagId} data-tag-path={tag?.path?.map(({ name }) => name)?.join(',')}>
                <label className="tag-name-label">{tagName}</label>
                <span className="tag-actions-container">
                    <StyledButton className="new-child-action" onClick={onClickAddChildButton}>
                        +
                    </StyledButton>
                    <StyledButton className="rename-tag-action" onClick={onClickRenameButton}>
                        Rename
                    </StyledButton>
                    <StyledButton className="remove-tag-action" onClick={onClickDeleteButton}>
                        Delete
                    </StyledButton>
                </span>
            </div>

            <ul className="tag-children-list" data-parent-tag-id={tagId} data-children-count={childTags.length}>
                {childTags.map((tag) => (
                    <li key={tag._id}>
                        <TagList tag={tag} />
                    </li>
                ))}
            </ul>
        </div>
    );
})``;

const DetachedTagsView = styled((rootElementProps: ComponentProps<'div'>): ReactElement => {
    const [{ updating, tagIds, lastUpdated, removing, removedCount }, setData] = useState<{
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
    const totalTagsCount = useTracker(() => TagsCollection.find({}).count(), []);

    const onClickCheckButton = useCallback(() => {
        if (updating || removing) {
            console.warn('Update already in progress.');
            return;
        }

        setData((data) => {
            return { ...data, updating: true };
        });

        TagsCollection.getDetachedTags().then(
            (tagIds) => {
                console.log('Detached tags', tagIds);

                setData((data) => {
                    return { ...data, updating: false, tagIds, lastUpdated: new Date() };
                });
            },
            (error) => {
                console.error(`Failed getting detached tags.`, error);

                setData((data) => {
                    return { ...data, updating: false };
                });
            }
        );
    }, [updating, removing]);

    const onClickRemoveAllButton = useCallback(() => {
        if (updating || removing) {
            console.warn('Update already in progress.');
            return;
        }

        if (tagIds.length === 0) {
            console.warn('Nothing to remove.');
            return;
        }

        console.log(`Starting to remove detached tags...`, tagIds);

        setData((data) => {
            return { ...data, removing: true, removedCount: 0 };
        });

        tagIds
            .reduce(async (last, tagId) => {
                await last;
                await TagsCollection.removeTag(tagId);

                setData(({ removedCount, ...data }) => {
                    const newRemovedCount = removedCount + 1;

                    console.log(`Removing detached tags - progress: ${newRemovedCount} / ${tagIds.length}`);

                    return { ...data, removedCount: newRemovedCount };
                });

                await new Promise((resolve) => {
                    setTimeout(resolve, 3000);
                });
            }, Promise.resolve())
            .then(
                () => {
                    console.log(`Completed removing ${tagIds.length} detached tags`, tagIds);

                    setData((data) => {
                        return { ...data, tagIds: [], removing: false, removedCount: 0 };
                    });
                },
                (error) => {
                    console.error(`Error when removing detached tags:`, error);

                    setData((data) => {
                        return { ...data, tagIds: [], lastUpdated: null, removing: false, removedCount: 0 };
                    });
                }
            );
    }, [updating, removing, tagIds]);

    return (
        <div {...rootElementProps}>
            <div>
                {removing
                    ? `Removing... ${removedCount} of ${tagIds.length}`
                    : updating
                    ? 'Updating...'
                    : lastUpdated === null
                    ? '--'
                    : `${
                          tagIds.length
                      } detached tags out of ${totalTagsCount} (updated ${lastUpdated.toLocaleString()})`}
            </div>
            <div>
                <StyledButton disabled={updating} onClick={onClickCheckButton}>
                    Check
                </StyledButton>
                <StyledButton disabled={updating || tagIds.length === 0} onClick={onClickRemoveAllButton}>
                    Removal All
                </StyledButton>
            </div>
        </div>
    );
})`
    display: inline-block;
    width: 30em;
    padding: 1em;
`;

const TagsWithoutPathView = styled((rootElementProps: ComponentProps<'div'>): ReactElement => {
    const tagsWithoutPath = useTracker(() => TagsCollection.find({ path: { $exists: false } }).fetch(), []);

    return (
        <div {...rootElementProps} title={tagsWithoutPath.map(({ name }) => name).join(',')}>
            {tagsWithoutPath.length} tags missing path.
        </div>
    );
})`
    display: inline-block;
    padding: 1em;
`;

export const AllTagsView = styled((rootElementProps: ComponentProps<'div'>): ReactElement => {
    return (
        <div {...rootElementProps}>
            <DetachedTagsView />
            <TagsWithoutPathView />
            <TagList />
        </div>
    );
})`
    ${TagList} {
        // Renaming and removing actions don't apply to root tag.
        .tag-body[data-tag-id=""] {
            .rename-tag-action, .remove-tag-action {
                display: none;
            }
        }

        .tag-name-label {
            display: block;
            font-size: 1.2em;
            line-height: 1.5em;
        }

        .tag-actions-container {
            button {
                font-size: 1em;
            }
            button + button {
                margin-left: 0.5em;
            }

            .new-child-action {
                width: 2em;
                text-align: center;
            }
        }

        .tag-body {
            padding-inline-start: 1em;
            padding-inline-end: 1em;

            &:hover {
                background-color: #CCCCCC;
            }
        }

        &:not([data-tag-id=""]) .tag-body:not(:hover) {
            .tag-actions-container {
                opacity: 0;
                pointer-events: none;
            }
        }

        .tag-children-list {
            margin-block-start: 1em;
            padding-inline-start: 2em;
            list-style: none;
        }

        .tag-children-list > li {
            border-inline-start: 1px dashed currentColor;
            padding-block-start: 0.5em;
            padding-block-end: 0.5em;
            padding-inline-start: 0.5em;
        }

        .tag-children-list[data-children-count="0"] {
            display: none;
        }
    }
`;
