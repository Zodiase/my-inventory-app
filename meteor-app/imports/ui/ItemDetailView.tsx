import { Box, Button, Heading, Text } from 'grommet';
import { Edit, Trash, Up } from 'grommet-icons';
import React from 'react';
import { useParams, Link } from 'wouter';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { useTracker } from '/imports/utility/reactMeteorData';

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
 * This is the presentation component - use ItemDetailView for route-aware version.
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

/**
 * ItemDetailView - Route-aware wrapper that extracts itemId from URL parameters.
 *
 * This component:
 * - Extracts itemId from /items/:itemId route using useParams
 * - Fetches item data reactively using useTracker
 * - Fetches associated tags reactively
 * - Handles error cases (missing itemId, item not found)
 * - Delegates rendering to ItemDetailViewPresentation
 *
 * @remarks
 * Use this component in Route definitions. For non-route usage, use ItemDetailViewPresentation directly.
 *
 * @example
 * ```tsx
 * // In App.tsx routes:
 * <Route path="/items/:itemId">
 *   {() => <ItemDetailView />}
 * </Route>
 * ```
 */
export const ItemDetailView: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();

    // Fetch item from database
    const item = useTracker(() => {
        if (!itemId) return undefined;
        return InventoryItemsCollection.findOne({ _id: itemId });
    }, [itemId]);

    // Fetch tags for the item
    const tags = useTracker(() => {
        if (!item) return [];
        return TagsCollection.find({ _id: { $in: item.tagIds ?? [] } }).fetch();
    }, [item?.tagIds?.join(',')]);

    // Validate itemId exists
    if (!itemId) {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Invalid Item ID
                </Heading>
                <Text>The item ID in the URL is missing or invalid.</Text>
                <Link href="/items">
                    <Button label="Go to Items" primary />
                </Link>
            </Box>
        );
    }

    // Check if item exists in database
    if (item === undefined) {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Item Not Found
                </Heading>
                <Text>The item you're looking for doesn't exist or has been deleted.</Text>
                <Link href="/items">
                    <Button label="Go to Items" primary />
                </Link>
            </Box>
        );
    }

    // Render the presentation component with fetched data
    return (
        <ItemDetailViewPresentation
            item={item}
            tags={tags}
            containerPath={[]}
            // TODO: Add onEdit, onDelete, onMove handlers in future tasks
        />
    );
};
