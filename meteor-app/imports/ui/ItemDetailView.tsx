import { Box, Button, Heading, Layer, Text } from 'grommet';
import { Close } from 'grommet-icons';
import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';

import Items, { InventoryItemsCollection } from '/imports/api/items';
import Tags, { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { ContainerSelector } from '/imports/ui/ContainerSelector';
import { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';
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
        return InventoryItemsCollection.findOne({ _id: itemId });
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
            await Items.deleteItem(item._id);
            setLocation('/items');
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
                containerPath={[]}
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
                disabled={isSubmitting}
            />

            {isConfirmingDelete && (
                <Layer
                    onEsc={() => {
                        setIsConfirmingDelete(false);
                    }}
                    onClickOutside={() => {
                        setIsConfirmingDelete(false);
                    }}
                >
                    <Box pad="medium" gap="medium" width="medium">
                        <Box direction="row" justify="between" align="center">
                            <Heading level="3" margin="none">
                                Delete Item
                            </Heading>
                            <Button
                                icon={<Close />}
                                onClick={() => {
                                    setIsConfirmingDelete(false);
                                }}
                            />
                        </Box>
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
                    </Box>
                </Layer>
            )}

            {isEditing && (
                <Layer
                    onEsc={() => {
                        setIsEditing(false);
                    }}
                    onClickOutside={() => {
                        setIsEditing(false);
                    }}
                >
                    <Box pad="medium" gap="medium" width="large">
                        <Box direction="row" justify="between" align="center">
                            <Heading level="3" margin="none">
                                Edit Item
                            </Heading>
                            <Button
                                icon={<Close />}
                                onClick={() => {
                                    setIsEditing(false);
                                }}
                            />
                        </Box>
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
                    </Box>
                </Layer>
            )}

            {isMoving && (
                <Layer
                    onEsc={() => {
                        setIsMoving(false);
                    }}
                    onClickOutside={() => {
                        setIsMoving(false);
                    }}
                >
                    <Box pad="medium" gap="medium" width="large">
                        <Box direction="row" justify="between" align="center">
                            <Heading level="3" margin="none">
                                Move Item
                            </Heading>
                            <Button
                                icon={<Close />}
                                onClick={() => {
                                    setIsMoving(false);
                                }}
                            />
                        </Box>
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
                    </Box>
                </Layer>
            )}
        </>
    );
};
