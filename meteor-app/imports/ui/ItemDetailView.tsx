/**
 * Route-backed item detail surface.
 * Loads item data from the URL, renders editable detail states, and handles missing-item fallbacks.
 */
import { Box, Button, Heading, Text } from 'grommet';
import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';

import Items, { InventoryItemsCollection } from '/imports/api/items';
import Tags, { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { ContainerSelector } from '/imports/ui/ContainerSelector';
import { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';
import { ItemDialog } from '/imports/ui/ItemDialog';
import { ItemForm } from '/imports/ui/ItemForm';
import { getValidMoveTargetContainers } from '/imports/utility/moveTargets';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';
import { usePageTitle } from '/imports/utility/usePageTitle';

export type { ItemDetailViewProps } from '/imports/ui/ItemDetailViewPresentation';
export { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};

const getNonEmptyContainerMessage = (childCount: number): string => {
    return `Cannot delete container with ${childCount} child ${
        childCount === 1 ? 'item' : 'items'
    }. Move or delete children first.`;
};

const findInventoryItemById = (itemId: string): InventoryItem | undefined => {
    return InventoryItemsCollection.find({ _id: itemId }, { limit: 1 }).fetch()[0];
};

interface RouteItemDetailViewProps {
    deleteReturnPath?: string;
}

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
export const ItemDetailView: React.FC<RouteItemDetailViewProps> = ({ deleteReturnPath }) => {
    const { itemId } = useParams<{ itemId: string }>();
    const [, setLocation] = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [moveTargetId, setMoveTargetId] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const isLoadingItem = useSubscribe('items.byId', itemId);
    const isLoadingAllItems = useSubscribe('items.all');
    const isLoadingTags = useSubscribe('tags.all');

    usePageTitle('Item Details - My Inventory');

    // Fetch item from database
    const item = useTracker(() => {
        if (itemId === '') return undefined;
        return findInventoryItemById(itemId);
    }, [itemId]);

    // Fetch tags for the item
    const tags = useTracker(() => {
        if (item === undefined) return [];
        return TagsCollection.find({ _id: { $in: item.tagIds } }).fetch();
    }, [item?.tagIds.join(',')]);

    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

    const availableContainers = useTracker(() => {
        const containers = InventoryItemsCollection.find(
            { isContainer: true, _id: { $ne: itemId } },
            { sort: { name: 1 } }
        ).fetch();
        return getValidMoveTargetContainers(containers, itemId);
    }, [itemId]);

    const childCount = useTracker(() => {
        if (itemId === '') return 0;
        return InventoryItemsCollection.find({ containerId: itemId }).count();
    }, [itemId]);

    const containerPath = useTracker(() => {
        if (item?.containerId === undefined) return [];

        const path: InventoryItem[] = [];
        const visitedContainerIds = new Set<string>();
        let currentContainerId: string | undefined = item.containerId;

        while (currentContainerId !== undefined && !visitedContainerIds.has(currentContainerId)) {
            visitedContainerIds.add(currentContainerId);

            const container = findInventoryItemById(currentContainerId);
            if (container === undefined) break;

            path.unshift(container);
            currentContainerId = container.containerId;
        }

        return path;
    }, [item?._id, item?.containerId]);

    if (isLoadingItem() || isLoadingAllItems() || isLoadingTags()) {
        return <LoadingState />;
    }

    // Validate itemId exists
    if (itemId === '') {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Invalid Item ID
                </Heading>
                <Text>The item ID in the URL is missing or invalid.</Text>
                <Link href="/items" className="app-primary-link-button">
                    Go to Items
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
                <Link href="/items" className="app-primary-link-button">
                    Go to Items
                </Link>
            </Box>
        );
    }

    const handleUpdateItem = async (values: RecordInput<InventoryItem>): Promise<void> => {
        try {
            setIsSubmitting(true);
            setErrorMessage(undefined);
            await Items.updateItem(item._id, {
                name: values.name,
                description: values.description,
                isContainer: values.isContainer,
                tagIds: values.tagIds,
                properties: values.properties,
            });
            setIsEditing(false);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMoveItem = async (): Promise<void> => {
        try {
            setIsSubmitting(true);
            setErrorMessage(undefined);
            await Items.moveItem(item._id, moveTargetId);
            setIsMoving(false);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (): Promise<void> => {
        if (item.isContainer && childCount > 0) {
            setErrorMessage(getNonEmptyContainerMessage(childCount));
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage(undefined);
            const returnPath =
                deleteReturnPath ?? (item.containerId !== undefined ? `/container/${item.containerId}` : '/items');
            await Items.deleteItem(item._id);
            setLocation(returnPath);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveTag = async (tagId: string): Promise<void> => {
        try {
            setErrorMessage(undefined);
            await Tags.removeFromItem(item._id, tagId);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        }
    };

    // Render the presentation component with fetched data
    return (
        <>
            <ItemDetailViewPresentation
                item={item}
                tags={tags}
                containerPath={containerPath}
                onEdit={() => {
                    setErrorMessage(undefined);
                    setIsConfirmingDelete(false);
                    setIsEditing(true);
                }}
                onMove={() => {
                    setErrorMessage(undefined);
                    setIsConfirmingDelete(false);
                    setMoveTargetId(item.containerId);
                    setIsMoving(true);
                }}
                onDelete={() => {
                    setErrorMessage(undefined);
                    setIsConfirmingDelete(true);
                }}
                onRemoveTag={(tagId) => {
                    void handleRemoveTag(tagId);
                }}
                onNavigateToContainer={(containerId) => {
                    setLocation(`/container/${containerId}`);
                }}
                disabled={isSubmitting}
            />

            {isConfirmingDelete && (
                <ItemDialog
                    title="Delete Item"
                    width="medium"
                    onClose={() => {
                        setIsConfirmingDelete(false);
                    }}
                >
                    <Text>Delete "{item.name}"? This cannot be undone.</Text>
                    {item.isContainer && (
                        <Text color="text-weak" size="small">
                            Containers must be empty before they can be deleted.
                        </Text>
                    )}
                    {errorMessage !== undefined && <Text color="status-critical">{errorMessage}</Text>}
                    <Box direction="row" justify="end" gap="small">
                        <Button
                            label="Cancel"
                            onClick={() => {
                                setIsConfirmingDelete(false);
                            }}
                            disabled={isSubmitting}
                        />
                        <Button
                            primary
                            color="status-critical"
                            label="Delete Item"
                            onClick={() => {
                                void handleDeleteItem();
                            }}
                            disabled={isSubmitting}
                        />
                    </Box>
                </ItemDialog>
            )}

            {isEditing && (
                <ItemDialog
                    title="Edit Item"
                    onClose={() => {
                        setIsEditing(false);
                    }}
                >
                    {errorMessage !== undefined && <Text color="status-critical">{errorMessage}</Text>}
                    <ItemForm
                        initialValues={item}
                        availableTags={allTags}
                        onSubmit={handleUpdateItem}
                        onCancel={() => {
                            setIsEditing(false);
                        }}
                        isSubmitting={isSubmitting}
                    />
                </ItemDialog>
            )}

            {isMoving && (
                <ItemDialog
                    title="Move Item"
                    onClose={() => {
                        setIsMoving(false);
                    }}
                >
                    {errorMessage !== undefined && <Text color="status-critical">{errorMessage}</Text>}
                    <ContainerSelector
                        containers={availableContainers}
                        selectedContainerId={moveTargetId}
                        onSelect={setMoveTargetId}
                        disabled={isSubmitting}
                    />
                    <Box direction="row" justify="end" gap="small">
                        <Button
                            label="Cancel"
                            onClick={() => {
                                setIsMoving(false);
                            }}
                            disabled={isSubmitting}
                        />
                        <Button
                            primary
                            label="Move Item"
                            onClick={() => {
                                void handleMoveItem();
                            }}
                            disabled={isSubmitting}
                        />
                    </Box>
                </ItemDialog>
            )}
        </>
    );
};
