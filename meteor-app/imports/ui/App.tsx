import { Box, Button, Grommet, Header, Heading, Layer, Main, Nav } from 'grommet';
import { Apps, Tag as TagIcon, Close, Search as SearchIcon, Filter, Add } from 'grommet-icons';
import { Meteor } from 'meteor/meteor';
import React, { type ReactElement, useState, useEffect } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';

import Items, { InventoryItemsCollection } from '/imports/api/items';
import Tags, { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { SearchFragment } from '/imports/model/SearchFragment';
import type { TagRecord } from '/imports/model/TagRecord';
import { useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { FilterBar } from './FilterBar';
import { ItemDetailView, ItemDetailViewPresentation } from './ItemDetailView';
import { ItemForm } from './ItemForm';
import { ItemsByTagView } from './ItemsByTagView';
import { NotFoundView } from './NotFoundView';
import { SearchBar } from './SearchBar';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchResultsView } from './SearchResultsView';
import { SearchScopeSelector } from './SearchScopeSelector';

// Grommet theme with iOS-style design and touch-friendly sizing
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
    button: {
        default: {
            // Ensure all buttons meet 44px minimum touch target
            padding: {
                vertical: '10px', // 10px + 16px font + 10px = 36px + border ≈ 44px total
                horizontal: '20px',
            },
        },
        border: {
            radius: '8px',
        },
    },
    formField: {
        border: false,
        content: {
            pad: { vertical: 'small' },
        },
    },
    textInput: {
        extend: `
            min-height: 44px;
            padding: 12px 16px;
        `,
    },
    textArea: {
        extend: `
            min-height: 44px;
            padding: 12px 16px;
        `,
    },
    select: {
        container: {
            extend: `
                min-height: 44px;
            `,
        },
    },
};

export const App = (): ReactElement => {
    const [location, setLocation] = useLocation();
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
    const [currentItemsContainerId, setCurrentItemsContainerId] = useState<string | undefined>();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'global' | 'scoped'>('global');
    const [searchFragments, setSearchFragments] = useState<SearchFragment[]>([]);
    const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Filter state for items view
    const [itemsViewFilters, setItemsViewFilters] = useState<SearchFragment[]>([]);
    const [showFilterBuilder, setShowFilterBuilder] = useState(false);

    // Fetch selected item for detail view
    const selectedItem = useTracker(() => {
        if (selectedItemId === undefined) return undefined;
        return InventoryItemsCollection.findOne({ _id: selectedItemId });
    }, [selectedItemId]);

    // Fetch tags for selected item
    const selectedItemTags = useTracker(() => {
        if (selectedItem === undefined) return [];
        return TagsCollection.find({ _id: { $in: selectedItem.tagIds } }).fetch();
    }, [selectedItem?.tagIds.join(',')]);

    // Fetch all tags for search components
    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

    // Clear filters when navigating between views
    useEffect(() => {
        setItemsViewFilters([]);
        setShowFilterBuilder(false);
        if (location !== '/' && location !== '/items') {
            setCurrentItemsContainerId(undefined);
        }
    }, [location]);

    const handleSelectItem = (item: InventoryItem): void => {
        setSelectedItemId(item._id);
    };

    const handleCloseItemDetail = (): void => {
        setSelectedItemId(undefined);
    };

    const handleCreateItem = async (itemData: RecordInput<InventoryItem>): Promise<void> => {
        try {
            const itemDataWithCurrentContainer: RecordInput<InventoryItem> =
                typeof currentItemsContainerId !== 'undefined' && typeof itemData.containerId === 'undefined'
                    ? { ...itemData, containerId: currentItemsContainerId }
                    : itemData;

            await Items.createItem(itemDataWithCurrentContainer);
            setShowCreateItem(false);
        } catch (error) {
            console.error('Failed to create item:', error);
        }
    };

    const handleEditItem = async (itemData: RecordInput<InventoryItem>): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await Items.updateItem(selectedItem._id, itemData);
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

    const handleDeleteItem = async (): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await Items.deleteItem(selectedItem._id);
            handleCloseItemDetail();
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleAddTagToItem = async (tagId: string): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await Tags.addToItem(selectedItem._id, tagId);
        } catch (error) {
            console.error('Failed to add tag to item:', error);
        }
    };

    const handleRemoveTagFromItem = async (tagId: string): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            await Tags.removeFromItem(selectedItem._id, tagId);
        } catch (error) {
            console.error('Failed to remove tag from item:', error);
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

    const handleItemsViewNavigate = (containerId: string | undefined): void => {
        setCurrentItemsContainerId(containerId);
        // Clear filters when navigating to a different container
        setItemsViewFilters([]);
        setShowFilterBuilder(false);
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
                        <Link href="/items">
                            <Button
                                icon={<Apps />}
                                label="Items"
                                primary={location === '/items' || location === '/'}
                                plain={location !== '/items' && location !== '/'}
                                style={{ minHeight: '44px' }}
                            />
                        </Link>
                        <Link href="/tags">
                            <Button
                                icon={<TagIcon />}
                                label="Tags"
                                primary={location === '/tags'}
                                plain={location !== '/tags'}
                                style={{ minHeight: '44px' }}
                            />
                        </Link>
                        <Link href="/search">
                            <Button
                                icon={<SearchIcon />}
                                label="Search"
                                primary={location === '/search'}
                                plain={location !== '/search'}
                                style={{ minHeight: '44px' }}
                            />
                        </Link>
                    </Nav>
                </Header>

                {/* Main content area */}
                <Main pad="medium" overflow="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <Switch>
                        {/* Home route - Items view */}
                        <Route path="/">
                            {() => (
                                <Box>
                                    <Box direction="row" justify="between" align="center" margin={{ bottom: 'medium' }}>
                                        <Heading level="2" margin="none">
                                            Items
                                        </Heading>
                                        <Box direction="row" gap="small">
                                            <Button
                                                icon={<Filter />}
                                                label={showFilterBuilder ? 'Hide Filters' : 'Add Filters'}
                                                onClick={() => {
                                                    setShowFilterBuilder(!showFilterBuilder);
                                                }}
                                                secondary={!showFilterBuilder}
                                                primary={showFilterBuilder}
                                            />
                                            <Button
                                                icon={<Add />}
                                                label="Create Item"
                                                primary
                                                onClick={() => {
                                                    setShowCreateItem(true);
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Filter status and clear */}
                                    {itemsViewFilters.length > 0 && (
                                        <Box margin={{ bottom: 'medium' }}>
                                            <FilterBar
                                                filters={itemsViewFilters}
                                                onChange={setItemsViewFilters}
                                                onClearAll={() => {
                                                    setItemsViewFilters([]);
                                                }}
                                                availableTags={allTags}
                                            />
                                        </Box>
                                    )}

                                    {/* Filter builder (collapsible) */}
                                    {showFilterBuilder && (
                                        <Box
                                            margin={{ bottom: 'medium' }}
                                            pad="medium"
                                            background="light-2"
                                            round="small"
                                        >
                                            <SearchFragmentBuilder
                                                fragments={itemsViewFilters}
                                                onChange={setItemsViewFilters}
                                                availableTags={allTags}
                                            />
                                        </Box>
                                    )}

                                    <AllItemsView filters={itemsViewFilters} onNavigate={handleItemsViewNavigate} />
                                </Box>
                            )}
                        </Route>

                        {/* Items list route */}
                        <Route path="/items">
                            {() => (
                                <Box>
                                    <Box direction="row" justify="between" align="center" margin={{ bottom: 'medium' }}>
                                        <Heading level="2" margin="none">
                                            Items
                                        </Heading>
                                        <Box direction="row" gap="small">
                                            <Button
                                                icon={<Filter />}
                                                label={showFilterBuilder ? 'Hide Filters' : 'Add Filters'}
                                                onClick={() => {
                                                    setShowFilterBuilder(!showFilterBuilder);
                                                }}
                                                secondary={!showFilterBuilder}
                                                primary={showFilterBuilder}
                                            />
                                            <Button
                                                icon={<Add />}
                                                label="Create Item"
                                                primary
                                                onClick={() => {
                                                    setShowCreateItem(true);
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Filter status and clear */}
                                    {itemsViewFilters.length > 0 && (
                                        <Box margin={{ bottom: 'medium' }}>
                                            <FilterBar
                                                filters={itemsViewFilters}
                                                onChange={setItemsViewFilters}
                                                onClearAll={() => {
                                                    setItemsViewFilters([]);
                                                }}
                                                availableTags={allTags}
                                            />
                                        </Box>
                                    )}

                                    {/* Filter builder (collapsible) */}
                                    {showFilterBuilder && (
                                        <Box
                                            margin={{ bottom: 'medium' }}
                                            pad="medium"
                                            background="light-2"
                                            round="small"
                                        >
                                            <SearchFragmentBuilder
                                                fragments={itemsViewFilters}
                                                onChange={setItemsViewFilters}
                                                availableTags={allTags}
                                            />
                                        </Box>
                                    )}

                                    <AllItemsView filters={itemsViewFilters} onNavigate={handleItemsViewNavigate} />
                                </Box>
                            )}
                        </Route>

                        {/* Tags list route */}
                        <Route path="/tags">{() => <AllTagsView />}</Route>

                        {/* Search route */}
                        <Route path="/search">
                            {() => (
                                <Box gap="medium">
                                    <Heading level="2" margin="none">
                                        Search
                                    </Heading>

                                    {/* Search bar with scope selector */}
                                    <Box gap="small">
                                        <SearchBar
                                            value={searchQuery}
                                            onChange={setSearchQuery}
                                            onSearch={() => {
                                                void handleSearch();
                                                return undefined;
                                            }}
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
                                            onClick={() => {
                                                void handleSearch();
                                                return undefined;
                                            }}
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
                        </Route>

                        {/* Item detail route */}
                        <Route path="/items/:itemId">{() => <ItemDetailView />}</Route>

                        {/* Items by tag route */}
                        <Route path="/tags/:tagId">{() => <ItemsByTagView />}</Route>

                        {/* 404 Not Found */}
                        <Route>{() => <NotFoundView />}</Route>
                    </Switch>
                </Main>

                {/* Create Item Modal */}
                {showCreateItem && (
                    <Layer
                        onEsc={() => {
                            setShowCreateItem(false);
                        }}
                        onClickOutside={() => {
                            setShowCreateItem(false);
                        }}
                    >
                        <Box pad="medium" gap="medium" width="large">
                            <Box direction="row" justify="between" align="center">
                                <Heading level="3" margin="none">
                                    Create New Item
                                </Heading>
                                <Button
                                    icon={<Close />}
                                    onClick={() => {
                                        setShowCreateItem(false);
                                    }}
                                />
                            </Box>
                            <ItemForm
                                onSubmit={handleCreateItem}
                                onCancel={() => {
                                    setShowCreateItem(false);
                                }}
                            />
                        </Box>
                    </Layer>
                )}

                {/* Item Detail Modal */}
                {selectedItem !== undefined && (
                    <Layer onEsc={handleCloseItemDetail} onClickOutside={handleCloseItemDetail}>
                        <Box
                            pad="medium"
                            gap="medium"
                            width="large"
                            overflow="auto"
                            style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                            <Box direction="row" justify="between" align="center">
                                <Heading level="3" margin="none">
                                    Item Details
                                </Heading>
                                <Button icon={<Close />} onClick={handleCloseItemDetail} />
                            </Box>
                            <ItemDetailViewPresentation
                                item={selectedItem}
                                tags={selectedItemTags}
                                onEdit={() => {
                                    /* TODO: Edit modal */
                                }}
                                onDelete={() => {
                                    void handleDeleteItem();
                                    return undefined;
                                }}
                                onRemoveTag={(tagId) => {
                                    void handleRemoveTagFromItem(tagId);
                                    return undefined;
                                }}
                            />
                        </Box>
                    </Layer>
                )}
            </Box>
        </Grommet>
    );
};
