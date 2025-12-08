import React, { type ComponentProps, type ReactElement, useState } from 'react';
import styled from 'styled-components';

import type { TagRecord } from '/imports/model/TagRecord';
import { CreateTagDialog } from '/imports/ui/CreateTagDialog';
import { LongPressContextMenu } from '/imports/ui/LongPressContextMenu';
import StyledButton from '/imports/ui/StyledButton';

/**
 * AllTagsViewPresentation is a pure presentation component that displays tags
 * in a hierarchical structure with management actions.
 *
 * This component receives all data and callbacks as props and has no dependencies
 * on Meteor's reactive data system, making it fully testable in Storybook.
 *
 * Features:
 * - Hierarchical tag display with nesting
 * - Usage counts showing how many items have each tag
 * - Create child tag action
 * - Rename and delete actions for each tag
 * - Utility views for detached tags and tags without paths
 * - Touch-optimized buttons (44x44px minimum)
 */

interface TagWithChildren extends TagRecord {
    children: TagWithChildren[];
}

/**
 * Build a hierarchical tree structure from flat tag array in O(n) time.
 *
 * @param tags - Flat array of all tags
 * @returns Array of root-level tags, each with their children recursively nested
 *
 * @remarks
 * This avoids O(n²) filtering by building the tree structure once upfront.
 * For n=100 tags, this does ~100 operations vs ~3,900 for recursive filtering.
 */
function buildHierarchy(tags: TagRecord[]): TagWithChildren[] {
    // Create map of tag ID to tag with empty children array
    const tagMap = new Map<string, TagWithChildren>();
    for (const tag of tags) {
        tagMap.set(tag._id, { ...tag, children: [] });
    }

    // Build parent-child relationships
    const rootTags: TagWithChildren[] = [];
    for (const tagWithChildren of tagMap.values()) {
        if (tagWithChildren.parentTagId === '') {
            rootTags.push(tagWithChildren);
        } else {
            const parent = tagMap.get(tagWithChildren.parentTagId);
            if (parent !== undefined) {
                parent.children.push(tagWithChildren);
            }
        }
    }

    return rootTags;
}

interface TagListProps {
    tag?: TagWithChildren;
    tagChildren: TagWithChildren[];
    usageCounts: Record<string, number>;
    onAddChild: (parentTagId: string, tagName: string) => void;
    onRename: (tag: TagRecord, newName: string) => void;
    onDelete: (tag: TagRecord) => void;
    onTagClick?: (tagId: string) => void;
}

const TagList = styled(
    ({
        tag,
        tagChildren,
        usageCounts,
        onAddChild,
        onRename,
        onDelete,
        onTagClick,
        ...rootElementProps
    }: TagListProps & ComponentProps<'div'>): ReactElement => {
        const tagId = tag?._id ?? '';
        const tagName = tag?.name ?? 'All Tags';
        const itemCount = tagId !== '' ? usageCounts[tagId] ?? 0 : 0;

        const [createDialogState, setCreateDialogState] = useState<{ isOpen: boolean; parentTagId: string }>({
            isOpen: false,
            parentTagId: '',
        });

        const handleAddChild = (): void => {
            setCreateDialogState({ isOpen: true, parentTagId: tagId });
        };

        const handleCreateTagSubmit = (tagName: string): void => {
            onAddChild(createDialogState.parentTagId, tagName);
            setCreateDialogState({ isOpen: false, parentTagId: '' });
        };

        const handleCreateTagClose = (): void => {
            setCreateDialogState({ isOpen: false, parentTagId: '' });
        };

        const handleRename = (): void => {
            if (typeof tag === 'undefined') {
                console.warn('NOOP: Invalid parent tag.');
                return;
            }
            const newTagName = window.prompt(`New name for tag "${tagName}":`, tagName);
            if (newTagName !== null && newTagName !== tagName) {
                onRename(tag, newTagName);
            }
        };

        const handleDelete = (): void => {
            if (typeof tag === 'undefined') {
                console.warn('NOOP: Invalid parent tag.');
                return;
            }
            const confirmDelete = window.confirm(`Delete tag "${tagName}"?`);
            if (confirmDelete) {
                onDelete(tag);
            }
        };

        return (
            <div {...rootElementProps} data-tag-id={tagId}>
                <CreateTagDialog
                    isOpen={createDialogState.isOpen}
                    onSubmit={handleCreateTagSubmit}
                    onClose={handleCreateTagClose}
                />
                <LongPressContextMenu
                    actions={
                        tag !== undefined
                            ? [
                                  {
                                      label: 'Add Child',
                                      onClick: handleAddChild,
                                  },
                                  {
                                      label: 'Rename',
                                      onClick: handleRename,
                                  },
                                  {
                                      label: 'Delete',
                                      onClick: handleDelete,
                                      variant: 'danger' as const,
                                  },
                              ]
                            : [
                                  {
                                      label: 'Add Child',
                                      onClick: handleAddChild,
                                  },
                              ]
                    }
                >
                    <div
                        className="tag-body"
                        data-tag-id={tagId}
                        data-tag-path={
                            tag !== null && tag !== undefined ? tag.path.map(({ name }) => name).join(',') : undefined
                        }
                    >
                        <label className="tag-name-label">
                            {tagId !== '' ? (
                                <span
                                    onClick={() => onTagClick?.(tagId)}
                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {tagName}
                                    <span className="tag-item-count"> ({itemCount})</span>
                                </span>
                            ) : (
                                <span>
                                    {tagName}
                                    {tagId !== '' && <span className="tag-item-count"> ({itemCount})</span>}
                                </span>
                            )}
                        </label>
                        <span className="tag-actions-container">
                            <StyledButton className="new-child-action" onClick={handleAddChild}>
                                +
                            </StyledButton>
                            <StyledButton className="rename-tag-action" onClick={handleRename}>
                                Rename
                            </StyledButton>
                            <StyledButton className="remove-tag-action" onClick={handleDelete}>
                                Delete
                            </StyledButton>
                        </span>
                    </div>
                </LongPressContextMenu>

                <ul className="tag-children-list" data-parent-tag-id={tagId} data-children-count={tagChildren.length}>
                    {tagChildren.map((childTag) => {
                        return (
                            <li key={childTag._id} className="tag-child-item">
                                <TagList
                                    tag={childTag}
                                    tagChildren={childTag.children}
                                    usageCounts={usageCounts}
                                    onAddChild={onAddChild}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                    onTagClick={onTagClick}
                                />
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
)``;

interface DetachedTagsViewProps {
    detachedTagIds: string[];
    totalTagsCount: number;
    isUpdating: boolean;
    isRemoving: boolean;
    removedCount: number;
    lastUpdated: Date | null;
    onCheck: () => void;
    onRemoveAll: () => void;
}

const DetachedTagsView = styled(
    ({
        detachedTagIds,
        totalTagsCount,
        isUpdating,
        isRemoving,
        removedCount,
        lastUpdated,
        onCheck,
        onRemoveAll,
        ...rootElementProps
    }: DetachedTagsViewProps & ComponentProps<'div'>): ReactElement => {
        return (
            <div {...rootElementProps}>
                <div>
                    {isRemoving
                        ? `Removing... ${removedCount} of ${detachedTagIds.length}`
                        : isUpdating
                        ? 'Updating...'
                        : lastUpdated === null
                        ? '--'
                        : `${
                              detachedTagIds.length
                          } detached tags out of ${totalTagsCount} (updated ${lastUpdated.toLocaleString()})`}
                </div>
                <div>
                    <StyledButton disabled={isUpdating} onClick={onCheck}>
                        Check
                    </StyledButton>
                    <StyledButton disabled={isUpdating || detachedTagIds.length === 0} onClick={onRemoveAll}>
                        Remove All
                    </StyledButton>
                </div>
            </div>
        );
    }
)`
    display: inline-block;
    width: 30em;
    padding: 1em;
`;

interface TagsWithoutPathViewProps {
    tagsWithoutPath: TagRecord[];
}

const TagsWithoutPathView = styled(
    ({ tagsWithoutPath, ...rootElementProps }: TagsWithoutPathViewProps & ComponentProps<'div'>): ReactElement => {
        return (
            <div {...rootElementProps} title={tagsWithoutPath.map(({ name }) => name).join(',')}>
                {tagsWithoutPath.length} tags missing path.
            </div>
        );
    }
)`
    display: inline-block;
    padding: 1em;
`;

export interface AllTagsViewPresentationProps {
    /**
     * All tags to display (flat list, will be organized hierarchically)
     */
    tags: TagRecord[];

    /**
     * Map of tag IDs to usage counts (how many items have each tag)
     */
    usageCounts: Record<string, number>;

    /**
     * Callback when adding a child tag
     */
    onAddChild: (parentTagId: string, tagName: string) => void;

    /**
     * Callback when renaming a tag
     */
    onRename: (tag: TagRecord, newName: string) => void;

    /**
     * Callback when deleting a tag
     */
    onDelete: (tag: TagRecord) => void;

    /**
     * Callback when clicking a tag name (for navigation)
     */
    onTagClick?: (tagId: string) => void;

    /**
     * Detached tags utility props
     */
    detachedTags?: {
        detachedTagIds: string[];
        isUpdating: boolean;
        isRemoving: boolean;
        removedCount: number;
        lastUpdated: Date | null;
        onCheck: () => void;
        onRemoveAll: () => void;
    };

    /**
     * Tags without path
     */
    tagsWithoutPath?: TagRecord[];
}

export const AllTagsViewPresentation = styled(
    ({
        tags,
        usageCounts,
        onAddChild,
        onRename,
        onDelete,
        onTagClick,
        detachedTags,
        tagsWithoutPath,
        ...rootElementProps
    }: AllTagsViewPresentationProps & ComponentProps<'div'>): ReactElement => {
        // Build hierarchy once when tags actually change (by ID list), not array reference
        // This handles useTracker creating new array references on every render
        const tagIds = tags.map((t) => t._id).join(',');
        const tagHierarchy = React.useMemo(() => buildHierarchy(tags), [tagIds]);
        const totalTagsCount = tags.length;

        return (
            <div {...rootElementProps}>
                {detachedTags !== null && detachedTags !== undefined && (
                    <DetachedTagsView
                        detachedTagIds={detachedTags.detachedTagIds}
                        totalTagsCount={totalTagsCount}
                        isUpdating={detachedTags.isUpdating}
                        isRemoving={detachedTags.isRemoving}
                        removedCount={detachedTags.removedCount}
                        lastUpdated={detachedTags.lastUpdated}
                        onCheck={detachedTags.onCheck}
                        onRemoveAll={detachedTags.onRemoveAll}
                    />
                )}
                {tagsWithoutPath !== null && tagsWithoutPath !== undefined && tagsWithoutPath.length > 0 && (
                    <TagsWithoutPathView tagsWithoutPath={tagsWithoutPath} />
                )}
                <TagList
                    tagChildren={tagHierarchy}
                    usageCounts={usageCounts}
                    onAddChild={onAddChild}
                    onRename={onRename}
                    onDelete={onDelete}
                    onTagClick={onTagClick}
                />
            </div>
        );
    }
)`;
    ${TagList} {
        // Renaming and removing actions don't apply to root tag.
        .tag-body[data-tag-id=''] {
            .rename-tag-action,
            .remove-tag-action {
                display: none;
            }
        }

        .tag-name-label {
            display: block;
            font-size: 1.2em;
            line-height: 1.5em;

            .tag-item-count {
                color: #666;
                font-size: 0.85em;
                font-weight: normal;
            }
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
                background-color: #cccccc;
            }
        }

        &:not([data-tag-id='']) .tag-body:not(:hover) {
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

        .tag-children-list[data-children-count='0'] {
            display: none;
        }
    }
`;
