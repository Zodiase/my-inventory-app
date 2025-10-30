import React, { type ReactElement, useState } from 'react';
import { Box, Button, Grommet, Header, Heading, Layer, Main, Nav } from 'grommet';
import { Apps, Tag as TagIcon, Close } from 'grommet-icons';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { ItemsByTagView } from './ItemsByTagView';
import { ItemForm } from './ItemForm';
import { ItemDetailView } from './ItemDetailView';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import {
    InventoryItemsCollection,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
} from '/imports/api/items';
import TagsCollection from '/imports/api/tags';
import { useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';

// Grommet theme with iOS-style design
const theme = {
    global: {
        colors: {
            brand: '#007aff', // iOS blue
            focus: '#007aff',
        },
        font: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: '16px',
        },
        control: {
            border: {
                radius: '8px',
            },
        },
    },
};

type View = 'items' | 'tags' | 'itemsByTag';

export const App = (): ReactElement => {
    const [currentView, setCurrentView] = useState<View>('items');
    const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    // Fetch selected item for detail view
    const selectedItem = useTracker(() => {
        if (selectedItemId === undefined) return undefined;
        return InventoryItemsCollection.findOne({ _id: selectedItemId });
    }, [selectedItemId]);

    // Fetch tags for selected item
    const selectedItemTags = useTracker(() => {
        if (selectedItem === undefined) return [];
        return TagsCollection.find({ _id: { $in: selectedItem.tagIds ?? [] } }).fetch();
    }, [selectedItem?.tagIds?.join(',')]);

    const handleSelectTag = (tagId: string): void => {
        setSelectedTagId(tagId);
        setCurrentView('itemsByTag');
    };

    const handleSelectItem = (item: InventoryItem): void => {
        setSelectedItemId(item._id);
    };

    const handleCloseItemDetail = (): void => {
        setSelectedItemId(undefined);
    };

    const handleCreateItem = async (itemData: RecordInput<InventoryItem>): Promise<void> => {
        try {
            await createInventoryItem(itemData);
            setShowCreateItem(false);
        } catch (error) {
            console.error('Failed to create item:', error);
        }
    };

    const handleEditItem = async (itemData: RecordInput<InventoryItem>): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await updateInventoryItem(selectedItem._id, itemData);
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

    const handleDeleteItem = async (): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await deleteInventoryItem(selectedItem._id);
            handleCloseItemDetail();
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleAddTagToItem = async (tagId: string): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await TagsCollection.addToItem(selectedItem._id, tagId);
        } catch (error) {
            console.error('Failed to add tag:', error);
        }
    };

    const handleRemoveTagFromItem = async (tagId: string): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await TagsCollection.removeFromItem(selectedItem._id, tagId);
        } catch (error) {
            console.error('Failed to remove tag:', error);
        }
    };

    return (
        <Grommet theme={theme} full>
            <Box fill>
                {/* Header with navigation */}
                <Header background="brand" pad="small">
                    <Heading level="3" margin="none" color="white">
                        Inventory App
                    </Heading>
                    <Nav direction="row" gap="small">
                        <Button
                            icon={<Apps />}
                            label="Items"
                            onClick={() => setCurrentView('items')}
                            primary={currentView === 'items'}
                            plain={currentView !== 'items'}
                        />
                        <Button
                            icon={<TagIcon />}
                            label="Tags"
                            onClick={() => setCurrentView('tags')}
                            primary={currentView === 'tags'}
                            plain={currentView !== 'tags'}
                        />
                    </Nav>
                </Header>

                {/* Main content area */}
                <Main pad="medium" overflow="auto">
                    {currentView === 'items' && (
                        <Box>
                            <Box direction="row" justify="between" align="center" margin={{ bottom: 'medium' }}>
                                <Heading level="2" margin="none">
                                    Items
                                </Heading>
                                <Button label="Create Item" primary onClick={() => setShowCreateItem(true)} />
                            </Box>
                            <AllItemsView />
                        </Box>
                    )}

                    {currentView === 'tags' && <AllTagsView />}

                    {currentView === 'itemsByTag' && selectedTagId !== undefined && (
                        <ItemsByTagView initialTagId={selectedTagId} onSelectItem={handleSelectItem} />
                    )}
                </Main>

                {/* Create Item Modal */}
                {showCreateItem && (
                    <Layer onEsc={() => setShowCreateItem(false)} onClickOutside={() => setShowCreateItem(false)}>
                        <Box pad="medium" gap="medium" width="large">
                            <Box direction="row" justify="between" align="center">
                                <Heading level="3" margin="none">
                                    Create New Item
                                </Heading>
                                <Button icon={<Close />} onClick={() => setShowCreateItem(false)} />
                            </Box>
                            <ItemForm onSubmit={handleCreateItem} onCancel={() => setShowCreateItem(false)} />
                        </Box>
                    </Layer>
                )}

                {/* Item Detail Modal */}
                {selectedItem !== undefined && (
                    <Layer onEsc={handleCloseItemDetail} onClickOutside={handleCloseItemDetail}>
                        <Box pad="medium" gap="medium" width="large" overflow="auto">
                            <Box direction="row" justify="between" align="center">
                                <Heading level="3" margin="none">
                                    Item Details
                                </Heading>
                                <Button icon={<Close />} onClick={handleCloseItemDetail} />
                            </Box>
                            <ItemDetailView
                                item={selectedItem}
                                tags={selectedItemTags}
                                onEdit={() => {
                                    /* TODO: Edit modal */
                                }}
                                onDelete={handleDeleteItem}
                                onRemoveTag={handleRemoveTagFromItem}
                            />
                        </Box>
                    </Layer>
                )}
            </Box>
        </Grommet>
    );
};
