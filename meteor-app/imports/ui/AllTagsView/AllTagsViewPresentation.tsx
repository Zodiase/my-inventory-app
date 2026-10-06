/**
 * Presents the tag-management toolbar, hierarchy, row actions, and confirmation flows.
 * Responsive hierarchy and action disclosure belong here; data loading and persistence stay in the container.
 */
import { Box, Button, Form, FormField, Heading, Layer, Menu, Text, TextInput } from 'grommet';
import { Add, Close, Edit, MoreVertical, Tag as TagIcon, Trash } from 'grommet-icons';
import React, {
    type ChangeEvent,
    type ComponentProps,
    type MouseEvent,
    type ReactElement,
    useMemo,
    useState,
} from 'react';
import styled from 'styled-components';

import type { TagRecord } from '/imports/model/TagRecord';
import { CreateTagDialog } from '/imports/ui/CreateTagDialog';
import { LongPressContextMenu, type ContextMenuAction } from '/imports/ui/LongPressContextMenu';
import { uiTokens } from '/imports/ui/theme';

interface TagWithChildren extends TagRecord {
    children: TagWithChildren[];
}

type DivProps = Omit<ComponentProps<'div'>, 'ref'>;

const MAX_MOBILE_INDENT_DEPTH = 3;
const PARENT_PATH_INDEX_FROM_END = -2;

type DialogState =
    | { type: 'create'; parentTagId: string }
    | { type: 'rename'; tag: TagRecord }
    | { type: 'delete'; tag: TagRecord }
    | { type: 'removeDetached' }
    | { type: 'none' };

function buildHierarchy(tags: TagRecord[]): TagWithChildren[] {
    const tagMap = new Map<string, TagWithChildren>();
    for (const tag of tags) {
        tagMap.set(tag._id, { ...tag, children: [] });
    }

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

const Shell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 100%;
    padding: 0.75rem;
`;

const Toolbar = styled.div`
    align-items: center;
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 8px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    padding: 0.75rem;

    @media (max-width: 600px) {
        align-items: stretch;
        flex-direction: column;
    }
`;

const ToolbarSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
`;

const UtilityPanel = styled.div`
    align-items: center;
    background: #f7f8fa;
    border: 1px solid #d9dde4;
    border-radius: 8px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    padding: 0.75rem;

    @media (max-width: 600px) {
        align-items: stretch;
        flex-direction: column;
    }
`;

const UtilityActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
`;

const EmptyState = styled.div`
    align-items: center;
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
    min-height: 12rem;
    padding: 2rem 1rem;
    text-align: center;
`;

const TreeContainer = styled.div`
    background: #ffffff;
    border: 1px solid #dddddd;
    border-radius: 8px;
    overflow: hidden;

    > ul > .tag-child-item > div > div {
        display: block;
    }

    .tag-child-item > div > div {
        width: 100%;
    }

    .tag-children-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .tag-child-item {
        margin: 0;
        padding: 0;
    }

    .tag-children-list[data-children-count='0'] {
        display: none;
    }
`;

const Row = styled.div<{ $depth: number }>`
    align-items: center;
    background: #ffffff;
    border-bottom: 1px solid #eeeeee;
    box-sizing: border-box;
    display: flex;
    gap: 0.75rem;
    min-height: 52px;
    padding-block: 0.375rem;
    padding-inline: calc(0.75rem + ${(props) => props.$depth} * 1.25rem) 0.5rem;
    width: 100%;

    &:hover {
        background: #f4f7fb;
    }

    &:focus-within {
        background: #f4f7fb;
        outline: 2px solid #7d4cdb;
        outline-offset: -2px;
    }

    .tag-name-label {
        display: flex;
        flex: 1;
        min-width: 0;
    }

    .tag-name-button {
        align-items: flex-start;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        display: flex;
        flex: 1;
        flex-direction: column;
        font: inherit;
        gap: 0.125rem;
        min-height: 44px;
        min-width: 0;
        padding: 0;
        text-align: left;
    }

    .tag-name {
        font-size: 1rem;
        font-weight: 600;
        overflow-wrap: anywhere;
    }

    .tag-mobile-metadata-row {
        display: contents;
    }

    .tag-item-summary {
        color: #6f7785;
        font-size: 0.875rem;
        font-weight: normal;
    }

    .tag-item-count,
    .tag-path {
        color: #6f7785;
        font-size: 0.875rem;
        font-weight: normal;
    }

    .tag-mobile-hierarchy {
        display: none;
    }

    .tag-actions-container {
        align-items: center;
        display: inline-flex;
        flex-shrink: 0;
        gap: 0.25rem;
        position: relative;
        z-index: 1;
    }

    .tag-action-button {
        min-height: 44px;
        min-width: 44px;
    }

    .tag-overflow-action {
        display: none;
        min-height: ${uiTokens.size.touchTarget};
        min-width: ${uiTokens.size.touchTarget};
        padding: 0;
    }

    @media (max-width: 600px) {
        gap: ${uiTokens.space.sm};
        min-height: 56px;
        padding-block: ${uiTokens.space.xs};
        padding-inline: calc(
                ${uiTokens.space.sm} + ${(props) => Math.min(props.$depth, MAX_MOBILE_INDENT_DEPTH)} *
                    ${uiTokens.space.md}
            )
            ${uiTokens.space.xs};

        > svg {
            flex: 0 0 auto;
            height: 20px;
            width: 20px;
        }

        .tag-name-button {
            gap: ${uiTokens.space.xxs};
        }

        .tag-name {
            display: -webkit-box;
            line-height: ${uiTokens.font.lineHeightTight};
            overflow: hidden;
            overflow-wrap: anywhere;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
        }

        .tag-mobile-metadata-row {
            align-items: baseline;
            display: flex;
            gap: ${uiTokens.space.xs};
            max-width: 100%;
            min-width: 0;
            width: 100%;
        }

        .tag-item-summary {
            flex: 0 0 auto;
            white-space: nowrap;
        }

        .tag-child-count {
            display: none;
        }

        .tag-path {
            display: none;
        }

        .tag-mobile-hierarchy {
            align-items: baseline;
            color: ${uiTokens.color.textWeak};
            display: flex;
            font-size: ${uiTokens.font.sizeSmall};
            gap: ${uiTokens.space.xs};
            min-width: 0;
        }

        .tag-hierarchy-level {
            flex: 0 0 auto;
            font-weight: ${uiTokens.font.weightMedium};
        }

        .tag-parent-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .tag-desktop-actions {
            display: none;
        }

        .tag-overflow-action {
            display: inline-flex;
            flex: 0 0 ${uiTokens.size.touchTarget};
        }
    }
`;

interface TagsToolbarProps {
    totalTagsCount: number;
    onCreateRoot: () => void;
}

const TagsToolbar = ({ totalTagsCount, onCreateRoot }: TagsToolbarProps): ReactElement => {
    return (
        <Toolbar>
            <ToolbarSummary>
                <Heading level={2} margin="none" size="small">
                    Tags
                </Heading>
                <Text color="text-weak" size="small">
                    {totalTagsCount === 1 ? '1 tag' : `${totalTagsCount} tags`}
                </Text>
            </ToolbarSummary>
            <Button primary icon={<Add />} label="New Tag" onClick={onCreateRoot} style={{ minHeight: '44px' }} />
        </Toolbar>
    );
};

interface TagRowProps {
    tag: TagWithChildren;
    depth: number;
    usageCounts: Record<string, number>;
    onAddChild: (parentTagId: string) => void;
    onRename: (tag: TagRecord) => void;
    onDelete: (tag: TagRecord) => void;
    onTagClick?: (tagId: string) => void;
}

const TagRow = ({ tag, depth, usageCounts, onAddChild, onRename, onDelete, onTagClick }: TagRowProps): ReactElement => {
    const itemCount = usageCounts[tag._id] ?? 0;
    const pathLabel = tag.path.length > 1 ? tag.path.map(({ name }) => name).join(' / ') : undefined;
    const parentName = tag.path.at(PARENT_PATH_INDEX_FROM_END)?.name;
    const menuActions: ContextMenuAction[] = [
        {
            label: 'Add Child',
            icon: <Add />,
            onClick: () => {
                onAddChild(tag._id);
            },
        },
        {
            label: 'Rename',
            icon: <Edit />,
            onClick: () => {
                onRename(tag);
            },
        },
        {
            label: 'Delete',
            icon: <Trash />,
            onClick: () => {
                onDelete(tag);
            },
            variant: 'danger',
        },
    ];

    return (
        <LongPressContextMenu actions={menuActions}>
            <Row
                $depth={depth}
                className="tag-body"
                data-tag-id={tag._id}
                data-tag-path={tag.path.map(({ name }) => name).join(',')}
            >
                <TagIcon color="brand" size="medium" />
                <div className="tag-name-label">
                    <button
                        className="tag-name-button"
                        type="button"
                        onClick={() => {
                            onTagClick?.(tag._id);
                        }}
                    >
                        <span className="tag-name">{tag.name}</span>
                        <span className="tag-mobile-metadata-row">
                            <span className="tag-item-summary">
                                <span className="tag-item-count">
                                    {itemCount === 1 ? '1 item' : `${itemCount} items`}
                                </span>
                                {tag.children.length > 0 && (
                                    <span className="tag-child-count">
                                        {`, ${tag.children.length} ${tag.children.length === 1 ? 'child' : 'children'}`}
                                    </span>
                                )}
                            </span>
                            {depth > 0 && (
                                <span
                                    className="tag-mobile-hierarchy"
                                    aria-label={`Hierarchy level ${depth + 1}, under ${parentName ?? 'unknown parent'}`}
                                    title={pathLabel}
                                >
                                    <span className="tag-hierarchy-level">Level {depth + 1}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="tag-parent-name">under {parentName ?? 'unknown parent'}</span>
                                </span>
                            )}
                        </span>
                        {pathLabel !== undefined && (
                            <span className="tag-path" title={pathLabel}>
                                {pathLabel}
                            </span>
                        )}
                    </button>
                </div>
                <span
                    className="tag-actions-container tag-desktop-actions"
                    aria-label={`Direct actions for ${tag.name}`}
                >
                    <Button
                        className="tag-action-button new-child-action"
                        icon={<Add />}
                        plain
                        hoverIndicator
                        aria-label={`Add child tag under ${tag.name}`}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                            event.stopPropagation();
                            onAddChild(tag._id);
                        }}
                    />
                    <Button
                        className="tag-action-button rename-tag-action"
                        icon={<Edit />}
                        plain
                        hoverIndicator
                        aria-label={`Rename ${tag.name}`}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                            event.stopPropagation();
                            onRename(tag);
                        }}
                    />
                    <Button
                        className="tag-action-button remove-tag-action"
                        icon={<Trash />}
                        plain
                        hoverIndicator
                        aria-label={`Delete ${tag.name}`}
                        onClick={(event: MouseEvent<HTMLElement>) => {
                            event.stopPropagation();
                            onDelete(tag);
                        }}
                    />
                </span>
                <Menu
                    className="tag-overflow-action"
                    a11yTitle={`Actions for ${tag.name}`}
                    icon={<MoreVertical />}
                    items={[
                        {
                            label: 'Add child',
                            icon: <Add />,
                            onClick: () => {
                                onAddChild(tag._id);
                            },
                        },
                        {
                            label: 'Rename',
                            icon: <Edit />,
                            onClick: () => {
                                onRename(tag);
                            },
                        },
                        {
                            label: <Text color="status-critical">Delete</Text>,
                            icon: <Trash color="status-critical" />,
                            onClick: () => {
                                onDelete(tag);
                            },
                        },
                    ]}
                    dropAlign={{ top: 'bottom', right: 'right' }}
                    hoverIndicator
                    plain
                />
            </Row>
        </LongPressContextMenu>
    );
};

interface TagTreeProps {
    tags: TagWithChildren[];
    depth?: number;
    usageCounts: Record<string, number>;
    onAddChild: (parentTagId: string) => void;
    onRename: (tag: TagRecord) => void;
    onDelete: (tag: TagRecord) => void;
    onTagClick?: (tagId: string) => void;
    parentTagId?: string;
}

const TagTree = ({
    tags,
    depth = 0,
    usageCounts,
    onAddChild,
    onRename,
    onDelete,
    onTagClick,
    parentTagId = '',
}: TagTreeProps): ReactElement => {
    return (
        <ul className="tag-children-list" data-parent-tag-id={parentTagId} data-children-count={tags.length}>
            {tags.map((tag) => (
                <li key={tag._id} className="tag-child-item">
                    <div data-tag-id={tag._id}>
                        <TagRow
                            tag={tag}
                            depth={depth}
                            usageCounts={usageCounts}
                            onAddChild={onAddChild}
                            onRename={onRename}
                            onDelete={onDelete}
                            onTagClick={onTagClick}
                        />
                        <TagTree
                            tags={tag.children}
                            depth={depth + 1}
                            usageCounts={usageCounts}
                            onAddChild={onAddChild}
                            onRename={onRename}
                            onDelete={onDelete}
                            onTagClick={onTagClick}
                            parentTagId={tag._id}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
};

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

const DetachedTagsView = ({
    detachedTagIds,
    totalTagsCount,
    isUpdating,
    isRemoving,
    removedCount,
    lastUpdated,
    onCheck,
    onRemoveAll,
}: DetachedTagsViewProps): ReactElement => {
    const statusText = isRemoving
        ? `Removing ${removedCount} of ${detachedTagIds.length}`
        : isUpdating
        ? 'Checking detached tags...'
        : lastUpdated === null
        ? 'Detached tag check has not run yet.'
        : `${detachedTagIds.length} detached out of ${totalTagsCount} tags. Updated ${lastUpdated.toLocaleString()}.`;

    return (
        <UtilityPanel>
            <Box gap="xxsmall">
                <Text weight="bold">Detached tags</Text>
                <Text color="text-weak" size="small">
                    {statusText}
                </Text>
            </Box>
            <UtilityActions>
                <Button label="Check" disabled={isUpdating || isRemoving} onClick={onCheck} />
                <Button
                    label="Remove All"
                    disabled={isUpdating || isRemoving || detachedTagIds.length === 0}
                    onClick={onRemoveAll}
                />
            </UtilityActions>
        </UtilityPanel>
    );
};

interface TagsWithoutPathViewProps {
    tagsWithoutPath: TagRecord[];
}

const TagsWithoutPathView = ({ tagsWithoutPath }: TagsWithoutPathViewProps): ReactElement => {
    return (
        <UtilityPanel title={tagsWithoutPath.map(({ name }) => name).join(', ')}>
            <Box gap="xxsmall">
                <Text weight="bold">Tags missing path data</Text>
                <Text color="text-weak" size="small">
                    {tagsWithoutPath.length === 1
                        ? '1 tag needs path repair.'
                        : `${tagsWithoutPath.length} tags need path repair.`}
                </Text>
            </Box>
        </UtilityPanel>
    );
};

interface RenameTagDialogProps {
    tag: TagRecord;
    onClose: () => void;
    onSubmit: (tag: TagRecord, newName: string) => void;
}

const RenameTagDialog = ({ tag, onClose, onSubmit }: RenameTagDialogProps): ReactElement => {
    const [tagName, setTagName] = useState(tag.name);
    const trimmedName = tagName.trim();
    const hasChanged = trimmedName !== '' && trimmedName !== tag.name;

    return (
        <Layer position="center" onClickOutside={onClose} onEsc={onClose}>
            <Box width="medium" pad="medium" gap="medium">
                <Box direction="row" justify="between" align="center">
                    <Heading level={3} margin="none">
                        Rename Tag
                    </Heading>
                    <Button icon={<Close />} plain aria-label="Close dialog" onClick={onClose} />
                </Box>
                <Form
                    onSubmit={() => {
                        if (hasChanged) {
                            onSubmit(tag, trimmedName);
                        }
                    }}
                >
                    <FormField name="name" label="Tag Name">
                        <TextInput
                            name="name"
                            value={tagName}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                setTagName(event.target.value);
                            }}
                            autoFocus
                        />
                    </FormField>
                    <Box direction="row" gap="small" justify="end" margin={{ top: 'medium' }}>
                        <Button label="Cancel" onClick={onClose} />
                        <Button primary type="submit" label="Rename" disabled={!hasChanged} />
                    </Box>
                </Form>
            </Box>
        </Layer>
    );
};

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
}

const ConfirmDialog = ({ title, message, confirmLabel, onClose, onConfirm }: ConfirmDialogProps): ReactElement => {
    return (
        <Layer position="center" onClickOutside={onClose} onEsc={onClose}>
            <Box width="medium" pad="medium" gap="medium">
                <Box direction="row" justify="between" align="center">
                    <Heading level={3} margin="none">
                        {title}
                    </Heading>
                    <Button icon={<Close />} plain aria-label="Close dialog" onClick={onClose} />
                </Box>
                <Text>{message}</Text>
                <Box direction="row" gap="small" justify="end">
                    <Button label="Cancel" onClick={onClose} />
                    <Button
                        primary
                        color="status-critical"
                        label={confirmLabel}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    />
                </Box>
            </Box>
        </Layer>
    );
};

export interface AllTagsViewPresentationProps {
    tags: TagRecord[];
    usageCounts: Record<string, number>;
    onAddChild: (parentTagId: string, tagName: string) => void | Promise<void>;
    onRename: (tag: TagRecord, newName: string) => void;
    onDelete: (tag: TagRecord) => void;
    onTagClick?: (tagId: string) => void;
    detachedTags?: {
        detachedTagIds: string[];
        isUpdating: boolean;
        isRemoving: boolean;
        removedCount: number;
        lastUpdated: Date | null;
        onCheck: () => void;
        onRemoveAll: () => void;
    };
    tagsWithoutPath?: TagRecord[];
}

export const AllTagsViewPresentation = ({
    tags,
    usageCounts,
    onAddChild,
    onRename,
    onDelete,
    onTagClick,
    detachedTags,
    tagsWithoutPath,
    ...rootElementProps
}: AllTagsViewPresentationProps & DivProps): ReactElement => {
    const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });
    const tagSignature = tags.map((tag) => `${tag._id}:${tag.name}:${tag.parentTagId}`).join(',');
    const tagHierarchy = useMemo(() => buildHierarchy(tags), [tagSignature]);

    const closeDialog = (): void => {
        setDialogState({ type: 'none' });
    };

    return (
        <Shell {...rootElementProps}>
            <TagsToolbar
                totalTagsCount={tags.length}
                onCreateRoot={() => {
                    setDialogState({ type: 'create', parentTagId: '' });
                }}
            />

            {detachedTags !== undefined && (
                <DetachedTagsView
                    detachedTagIds={detachedTags.detachedTagIds}
                    totalTagsCount={tags.length}
                    isUpdating={detachedTags.isUpdating}
                    isRemoving={detachedTags.isRemoving}
                    removedCount={detachedTags.removedCount}
                    lastUpdated={detachedTags.lastUpdated}
                    onCheck={detachedTags.onCheck}
                    onRemoveAll={() => {
                        setDialogState({ type: 'removeDetached' });
                    }}
                />
            )}

            {tagsWithoutPath !== undefined && tagsWithoutPath.length > 0 && (
                <TagsWithoutPathView tagsWithoutPath={tagsWithoutPath} />
            )}

            {tagHierarchy.length === 0 ? (
                <EmptyState>
                    <TagIcon color="brand" size="large" />
                    <Box gap="xxsmall">
                        <Text weight="bold">No tags yet</Text>
                        <Text color="text-weak" size="small">
                            Create a tag to start grouping inventory items.
                        </Text>
                    </Box>
                    <Button
                        primary
                        icon={<Add />}
                        label="New Tag"
                        onClick={() => {
                            setDialogState({ type: 'create', parentTagId: '' });
                        }}
                    />
                </EmptyState>
            ) : (
                <TreeContainer>
                    <TagTree
                        tags={tagHierarchy}
                        usageCounts={usageCounts}
                        onAddChild={(parentTagId) => {
                            setDialogState({ type: 'create', parentTagId });
                        }}
                        onRename={(tag) => {
                            setDialogState({ type: 'rename', tag });
                        }}
                        onDelete={(tag) => {
                            setDialogState({ type: 'delete', tag });
                        }}
                        onTagClick={onTagClick}
                    />
                </TreeContainer>
            )}

            {dialogState.type === 'create' && (
                <CreateTagDialog
                    isOpen
                    onClose={closeDialog}
                    onSubmit={async (tagName) => {
                        await onAddChild(dialogState.parentTagId, tagName);
                        closeDialog();
                    }}
                />
            )}

            {dialogState.type === 'rename' && (
                <RenameTagDialog
                    tag={dialogState.tag}
                    onClose={closeDialog}
                    onSubmit={(tag, newName) => {
                        onRename(tag, newName);
                        closeDialog();
                    }}
                />
            )}

            {dialogState.type === 'delete' && (
                <ConfirmDialog
                    title="Delete Tag"
                    message={`Delete "${dialogState.tag.name}"? Items will keep their other tags.`}
                    confirmLabel="Delete"
                    onClose={closeDialog}
                    onConfirm={() => {
                        onDelete(dialogState.tag);
                    }}
                />
            )}

            {dialogState.type === 'removeDetached' && detachedTags !== undefined && (
                <ConfirmDialog
                    title="Remove Detached Tags"
                    message={`Remove ${detachedTags.detachedTagIds.length} detached ${
                        detachedTags.detachedTagIds.length === 1 ? 'tag' : 'tags'
                    }?`}
                    confirmLabel="Remove All"
                    onClose={closeDialog}
                    onConfirm={detachedTags.onRemoveAll}
                />
            )}
        </Shell>
    );
};
