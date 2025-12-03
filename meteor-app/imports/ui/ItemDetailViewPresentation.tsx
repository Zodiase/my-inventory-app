import { Box, Button, Heading, Text } from 'grommet';
import { Edit, Trash, Up } from 'grommet-icons';
import React from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';

import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';
import { TagChip } from '/imports/ui/TagChip';

/**
 * ItemDetailView component displays the full details of an inventory item.
 *
 * @remarks
 * Shows item name, description, container location (via breadcrumb), tags,
 * and action buttons (edit, delete, move). All touch targets are 44x44px minimum.
 *
 * This is a read-only view - editing happens in ItemForm component.
 */

export interface ItemDetailViewProps {
    /** The item to display */
    item: InventoryItem;

    /** Path from root to the item's container (empty if item is at root) */
    containerPath?: InventoryItem[];

    /** Tags applied to this item */
    tags?: TagRecord[];

    /** Callback when edit button is clicked */
    onEdit?: () => void;

    /** Callback when delete button is clicked */
    onDelete?: () => void;

    /** Callback when move button is clicked */
    onMove?: () => void;

    /** Callback when a tag is removed from the item */
    onRemoveTag?: (tagId: string) => void;

    /** Callback when a breadcrumb is clicked to navigate */
    onNavigateToContainer?: (containerId: string) => void;

    /** Whether actions are disabled (e.g., during async operations) */
    disabled?: boolean;
}

/**
 * ItemDetailViewPresentation component displays full item information.
 * This is the presentation component - pure, no Meteor or routing dependencies.
 *
 * @example
 * ```tsx
 * const item = await getItem(itemId);
 * const path = item.containerId ? await getItemPath(item.containerId) : [];
 * const tags = await getTagsForItem(item._id);
 *
 * <ItemDetailViewPresentation
 *   item={item}
 *   containerPath={path}
 *   tags={tags}
 *   onEdit={() => setEditMode(true)}
 *   onDelete={() => setShowDeleteDialog(true)}
 *   onMove={() => setShowMoveDialog(true)}
 *   onNavigateToContainer={(id) => navigateToContainer(id)}
 * />
 * ```
 */
export const ItemDetailViewPresentation: React.FC<ItemDetailViewProps> = ({
    item,
    containerPath = [],
    tags = [],
    onEdit,
    onDelete,
    onMove,
    onRemoveTag,
    onNavigateToContainer,
    disabled = false,
}) => {
    return (
        <Box fill pad="medium" gap="medium">
            {/* Header with item name and type indicator */}
            <Box direction="row" align="center" justify="between" gap="small">
                <Heading level={2} margin="none">
                    {item.isContainer ? '📦 ' : ''}
                    {item.name}
                </Heading>
            </Box>

            {/* Container location breadcrumb */}
            {containerPath.length > 0 && (
                <Box>
                    <Text size="small" color="dark-3" margin={{ bottom: 'xsmall' }}>
                        Location:
                    </Text>
                    <BreadcrumbTrail
                        path={containerPath}
                        onNavigate={
                            onNavigateToContainer ? (container) => onNavigateToContainer(container._id) : undefined
                        }
                        showHomeIcon
                    />
                </Box>
            )}

            {/* Description */}
            {item.description && (
                <Box>
                    <Text size="small" color="dark-3" margin={{ bottom: 'xsmall' }}>
                        Description:
                    </Text>
                    <Text>{item.description}</Text>
                </Box>
            )}

            {/* Tags */}
            {tags.length > 0 && (
                <Box>
                    <Text size="small" color="dark-3" margin={{ bottom: 'xsmall' }}>
                        Tags:
                    </Text>
                    <Box direction="row" wrap gap="small">
                        {tags.map((tag) => (
                            <TagChip
                                key={tag._id}
                                tagName={tag.name}
                                onRemove={onRemoveTag ? () => onRemoveTag(tag._id) : undefined}
                                disabled={disabled}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Action buttons */}
            <Box direction="row" gap="small" margin={{ top: 'medium' }}>
                {onEdit && <Button icon={<Edit />} label="Edit" onClick={onEdit} disabled={disabled} primary />}
                {onMove && <Button icon={<Up />} label="Move" onClick={onMove} disabled={disabled} />}
                {onDelete && (
                    <Button
                        icon={<Trash />}
                        label="Delete"
                        onClick={onDelete}
                        disabled={disabled}
                        color="status-critical"
                    />
                )}
            </Box>
        </Box>
    );
};
