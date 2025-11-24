import React, { type ReactElement, useState } from 'react';
import { Box, Button, Grommet, Header, Heading, Layer, Main, Nav } from 'grommet';
import { Apps, Tag as TagIcon, Close, Search as SearchIcon } from 'grommet-icons';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { ItemsByTagView } from './ItemsByTagView';
import { ItemForm } from './ItemForm';
import { ItemDetailView } from './ItemDetailView';
import { SearchBar } from './SearchBar';
import { SearchScopeSelector } from './SearchScopeSelector';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchResultsView } from './SearchResultsView';
import { FilterBar } from './FilterBar';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import type { SearchFragment } from '/imports/model/SearchFragment';
import {
    InventoryItemsCollection,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
} from '/imports/api/items';
import TagsCollection from '/imports/api/tags';
import { useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';
import { Meteor } from 'meteor/meteor';

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

type View = 'items' | 'tags' | 'itemsByTag' | 'search';

export const App = (): ReactElement => {
    const [currentView, setCurrentView] = useState<View>('items');
    const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'global' | 'scoped'>('global');
    const [searchFragments, setSearchFragments] = useState<SearchFragment[]>([]);
    const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Filter state for items view
    const [itemsViewFilters, setItemsViewFilters] = useState<SearchFragment[]>([]);

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

    // Fetch all tags for search components
    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

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

    const handleSearch = async (): Promise<void> => {
        setSearchLoading(true);
        try {
            // Build fragments from current state
            const fragments: SearchFragment[] = [...searchFragments];

            // Add name fragment if search query exists
            if (searchQuery.trim() !== '') {
                fragments.push({ type: 'name', value: searchQuery.trim() });
            }

            // Call search method
            const results = await Meteor.callAsync('items.search', fragments);
            setSearchResults(results as InventoryItem[]);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleClearSearch = (): void => {
        setSearchQuery('');
    };

    const handleSearchFragmentsChange = (fragments: SearchFragment[]): void => {
        setSearchFragments(fragments);
    };

    const handleSearchItemClick = (itemId: string): void => {
        setSelectedItemId(itemId);
    };

    const getItemPath = (_itemId: string): InventoryItem[] => {
        // TODO: Implement breadcrumb path resolution
        // For now, return empty array
        return [];
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
                        <Button
                            icon={<SearchIcon />}
                            label="Search"
                            onClick={() => setCurrentView('search')}
                            primary={currentView === 'search'}
                            plain={currentView !== 'search'}
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

                            {/* Filter bar for items view */}
                            <Box margin={{ bottom: 'medium' }}>
                                <FilterBar
                                    filters={itemsViewFilters}
                                    onChange={setItemsViewFilters}
                                    onClearAll={() => setItemsViewFilters([])}
                                    availableTags={allTags}
                                />
                            </Box>

                            <AllItemsView filters={itemsViewFilters} />
                        </Box>
                    )}

                    {currentView === 'tags' && <AllTagsView />}

                    {currentView === 'itemsByTag' && selectedTagId !== undefined && (
                        <ItemsByTagView initialTagId={selectedTagId} onSelectItem={handleSelectItem} />
                    )}

                    {currentView === 'search' && (
                        <Box gap="medium">
                            <Heading level="2" margin="none">
                                Search
                            </Heading>

                            {/* Search bar with scope selector */}
                            <Box gap="small">
                                <SearchBar
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    onSearch={handleSearch}
                                    onClear={handleClearSearch}
                                    searchMode={searchScope}
                                    scopeLabel="Current Location"
                                />
                                <SearchScopeSelector
                                    value={searchScope}
                                    onChange={setSearchScope}
                                    scopeLabel="Current Location"
                                />
                            </Box>

                            {/* Advanced search filters */}
                            <Box>
                                <Heading level="4" margin={{ top: 'none', bottom: 'small' }}>
                                    Advanced Filters
                                </Heading>
                                <SearchFragmentBuilder
                                    fragments={searchFragments}
                                    onChange={handleSearchFragmentsChange}
                                    availableTags={allTags}
                                />
                            </Box>

                            {/* Search button */}
                            <Box>
                                <Button
                                    label="Search"
                                    primary
                                    onClick={handleSearch}
                                    disabled={searchQuery.trim() === '' && searchFragments.length === 0}
                                />
                            </Box>

                            {/* Search results */}
                            <SearchResultsView
                                items={searchResults}
                                onItemClick={handleSearchItemClick}
                                loading={searchLoading}
                                getItemPath={getItemPath}
                            />
                        </Box>
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
