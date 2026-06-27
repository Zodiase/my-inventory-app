import { Box, Button, Grommet, Heading, Layer, Text } from 'grommet';
import { Add, Close, Filter } from 'grommet-icons';
import { Meteor } from 'meteor/meteor';
import React, { type ReactElement, useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';

import Items, { InventoryItemsCollection } from '/imports/api/items';
import Tags, { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { SearchFragment } from '/imports/model/SearchFragment';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { getValidMoveTargetContainers } from '/imports/utility/moveTargets';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { AppShell } from './AppShell';
import { ContainerSelector } from './ContainerSelector';
import { FilterBar } from './FilterBar';
import { ItemDetailView, ItemDetailViewPresentation } from './ItemDetailView';
import { ItemForm } from './ItemForm';
import { ItemsByTagView } from './ItemsByTagView';
import { NotFoundView } from './NotFoundView';
import { SearchBar } from './SearchBar';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchResultsView } from './SearchResultsView';
import { SearchScopeSelector } from './SearchScopeSelector';
import { SettingsDataView } from './SettingsDataView';
import { theme } from './theme';

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};

const getNonEmptyContainerMessage = (childCount: number): string => {
    return `Cannot delete container with ${childCount} child ${
        childCount === 1 ? 'item' : 'items'
    }. Move or delete children first.`;
};

export const App = (): ReactElement => {
    const [location] = useLocation();
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
    const [currentItemsContainerId, setCurrentItemsContainerId] = useState<string | undefined>();
    const [isEditingSelectedItem, setIsEditingSelectedItem] = useState(false);
    const [isMovingSelectedItem, setIsMovingSelectedItem] = useState(false);
    const [isConfirmingSelectedDelete, setIsConfirmingSelectedDelete] = useState(false);
    const [selectedMoveTargetId, setSelectedMoveTargetId] = useState<string | undefined>();
    const [isSubmittingSelectedItem, setIsSubmittingSelectedItem] = useState(false);
    const [selectedItemError, setSelectedItemError] = useState<string | undefined>();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'global' | 'scoped'>('global');
    const [searchFragments, setSearchFragments] = useState<SearchFragment[]>([]);
    const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showSearchFilters, setShowSearchFilters] = useState(false);

    // Filter state for items view
    const [itemsViewFilters, setItemsViewFilters] = useState<SearchFragment[]>([]);
    const [showFilterBuilder, setShowFilterBuilder] = useState(false);

    // Fetch selected item for detail view
    const isLoadingSelectedItem = useSubscribe('items.byId', selectedItemId ?? '');
    const selectedItem = useTracker(() => {
        if (selectedItemId === undefined) return undefined;
        return InventoryItemsCollection.findOne({ _id: selectedItemId });
    }, [selectedItemId]);

    // Fetch tags for selected item
    const selectedItemTags = useTracker(() => {
        if (selectedItem === undefined) return [];
        return TagsCollection.find({ _id: { $in: selectedItem.tagIds } }).fetch();
    }, [selectedItem?.tagIds.join(',')]);

    const selectedItemChildCount = useTracker(() => {
        if (selectedItemId === undefined) return 0;
        return InventoryItemsCollection.find({ containerId: selectedItemId }).count();
    }, [selectedItemId]);

    // Fetch all tags for search components
    const isLoadingTags = useSubscribe('tags.all');
    useSubscribe('items.all');
    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

    const availableContainers = useTracker(() => {
        const containers = InventoryItemsCollection.find(
            { isContainer: true, _id: { $ne: selectedItemId } },
            { sort: { name: 1 } }
        ).fetch();
        return getValidMoveTargetContainers(containers, selectedItemId);
    }, [selectedItemId]);

    const currentSearchScopeItem = useTracker(() => {
        if (currentItemsContainerId === undefined) return undefined;
        return InventoryItemsCollection.findOne({ _id: currentItemsContainerId });
    }, [currentItemsContainerId]);

    // Clear filters when navigating between views
    useEffect(() => {
        setItemsViewFilters([]);
        setShowFilterBuilder(false);
        if (location !== '/' && location !== '/items' && location !== '/search') {
            setCurrentItemsContainerId(undefined);
        }
    }, [location]);

    useEffect(() => {
        if (currentItemsContainerId === undefined && searchScope === 'scoped') {
            setSearchScope('global');
        }
    }, [currentItemsContainerId, searchScope]);

    const handleCloseItemDetail = (): void => {
        setSelectedItemId(undefined);
        setIsEditingSelectedItem(false);
        setIsMovingSelectedItem(false);
        setIsConfirmingSelectedDelete(false);
        setSelectedItemError(undefined);
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

    const handleDeleteItem = async (): Promise<void> => {
        if (selectedItem === undefined) return;
        if (selectedItem.isContainer && selectedItemChildCount > 0) {
            setSelectedItemError(getNonEmptyContainerMessage(selectedItemChildCount));
            return;
        }

        try {
            setIsSubmittingSelectedItem(true);
            setSelectedItemError(undefined);
            await Items.deleteItem(selectedItem._id);
            handleCloseItemDetail();
        } catch (error) {
            setSelectedItemError(getErrorMessage(error));
            console.error('Failed to delete item:', error);
        } finally {
            setIsSubmittingSelectedItem(false);
        }
    };

    const handleUpdateSelectedItem = async (itemData: RecordInput<InventoryItem>): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            setIsSubmittingSelectedItem(true);
            setSelectedItemError(undefined);
            await Items.updateItem(selectedItem._id, {
                name: itemData.name,
                description: itemData.description,
                isContainer: itemData.isContainer,
                tagIds: itemData.tagIds,
                properties: itemData.properties,
            });
            setIsEditingSelectedItem(false);
        } catch (error) {
            setSelectedItemError(getErrorMessage(error));
            console.error('Failed to update item:', error);
        } finally {
            setIsSubmittingSelectedItem(false);
        }
    };

    const handleMoveSelectedItem = async (): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            setIsSubmittingSelectedItem(true);
            setSelectedItemError(undefined);
            await Items.moveItem(selectedItem._id, selectedMoveTargetId);
            setIsMovingSelectedItem(false);
        } catch (error) {
            setSelectedItemError(getErrorMessage(error));
            console.error('Failed to move item:', error);
        } finally {
            setIsSubmittingSelectedItem(false);
        }
    };

    const handleRemoveTagFromItem = async (tagId: string): Promise<void> => {
        if (selectedItem === undefined) return;
        try {
            setSelectedItemError(undefined);
            await Tags.removeFromItem(selectedItem._id, tagId);
        } catch (error) {
            setSelectedItemError(getErrorMessage(error));
            console.error('Failed to remove tag from item:', error);
        }
    };

    const handleSearch = async (): Promise<void> => {
        setHasSearched(true);
        setSearchLoading(true);
        try {
            // Build fragments from current state
            const fragments: SearchFragment[] = [...searchFragments];

            if (searchScope === 'scoped' && currentItemsContainerId !== undefined) {
                fragments.unshift({ type: 'containerScope', containerRootId: currentItemsContainerId });
            }

            // Add name fragment if search query exists
            if (searchQuery.trim() !== '') {
                fragments.push({ type: 'name', value: searchQuery.trim() });
            }

            // Call search method
            const results = (await Meteor.callAsync('items.search', fragments)) as unknown as InventoryItem[];
            setSearchResults(results);
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
        setSelectedItemError(undefined);
        setIsEditingSelectedItem(false);
        setIsMovingSelectedItem(false);
        setIsConfirmingSelectedDelete(false);
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
            <AppShell location={location}>
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
                                    <Box margin={{ bottom: 'medium' }} pad="medium" background="light-2" round="small">
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
                                    <Box margin={{ bottom: 'medium' }} pad="medium" background="light-2" round="small">
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
                                <Box direction="row" justify="between" align="center" gap="medium" wrap>
                                    <Heading level="2" margin="none">
                                        Search
                                    </Heading>
                                    <Button
                                        icon={<Filter />}
                                        label={showSearchFilters ? 'Hide Filters' : 'Filters'}
                                        onClick={() => {
                                            setShowSearchFilters(!showSearchFilters);
                                        }}
                                        secondary={!showSearchFilters}
                                        primary={showSearchFilters}
                                    />
                                </Box>

                                {isLoadingTags() ? (
                                    <LoadingState />
                                ) : (
                                    <>
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
                                                scopeLabel={currentSearchScopeItem?.name ?? 'Current Location'}
                                                submitDisabled={
                                                    searchQuery.trim() === '' && searchFragments.length === 0
                                                }
                                            />
                                            <SearchScopeSelector
                                                value={searchScope}
                                                onChange={setSearchScope}
                                                scopeLabel={currentSearchScopeItem?.name ?? 'Current Location'}
                                                scopedDisabled={currentItemsContainerId === undefined}
                                            />
                                        </Box>

                                        <FilterBar
                                            filters={searchFragments}
                                            onChange={setSearchFragments}
                                            onClearAll={() => {
                                                setSearchFragments([]);
                                            }}
                                            availableTags={allTags}
                                        />

                                        {showSearchFilters && (
                                            <Box pad="medium" background="light-2" round="small">
                                                <Heading level="4" margin={{ top: 'none', bottom: 'small' }}>
                                                    Filters
                                                </Heading>
                                                <SearchFragmentBuilder
                                                    fragments={searchFragments}
                                                    onChange={handleSearchFragmentsChange}
                                                    availableTags={allTags}
                                                />
                                            </Box>
                                        )}

                                        {/* Search results */}
                                        <SearchResultsView
                                            items={searchResults}
                                            onItemClick={handleSearchItemClick}
                                            loading={searchLoading}
                                            hasSearched={hasSearched}
                                            getItemPath={getItemPath}
                                            availableTags={allTags}
                                        />
                                    </>
                                )}
                            </Box>
                        )}
                    </Route>

                    {/* Item detail route */}
                    <Route path="/items/:itemId">{() => <ItemDetailView />}</Route>

                    {/* Items by tag route */}
                    <Route path="/tags/:tagId">{() => <ItemsByTagView />}</Route>

                    {/* Settings route */}
                    <Route path="/settings/data">{() => <SettingsDataView />}</Route>

                    {/* 404 Not Found */}
                    <Route>{() => <NotFoundView />}</Route>
                </Switch>

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
                                availableTags={allTags}
                                onSubmit={handleCreateItem}
                                onCancel={() => {
                                    setShowCreateItem(false);
                                }}
                            />
                        </Box>
                    </Layer>
                )}

                {/* Item Detail Modal */}
                {selectedItemId !== undefined && (
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
                            {isLoadingSelectedItem() ? (
                                <LoadingState />
                            ) : selectedItem !== undefined && isConfirmingSelectedDelete ? (
                                <Box gap="medium">
                                    <Text>Delete "{selectedItem.name}"? This cannot be undone.</Text>
                                    {selectedItem.isContainer && (
                                        <Text color="text-weak" size="small">
                                            Containers must be empty before they can be deleted.
                                        </Text>
                                    )}
                                    {selectedItemError !== undefined && (
                                        <Text color="status-critical">{selectedItemError}</Text>
                                    )}
                                    <Box direction="row" justify="end" gap="small">
                                        <Button
                                            label="Cancel"
                                            onClick={() => {
                                                setIsConfirmingSelectedDelete(false);
                                            }}
                                            disabled={isSubmittingSelectedItem}
                                        />
                                        <Button
                                            primary
                                            color="status-critical"
                                            label="Delete Item"
                                            onClick={() => {
                                                void handleDeleteItem();
                                            }}
                                            disabled={isSubmittingSelectedItem}
                                        />
                                    </Box>
                                </Box>
                            ) : selectedItem !== undefined && isEditingSelectedItem ? (
                                <Box gap="medium">
                                    {selectedItemError !== undefined && (
                                        <Text color="status-critical">{selectedItemError}</Text>
                                    )}
                                    <ItemForm
                                        initialValues={selectedItem}
                                        availableTags={allTags}
                                        onSubmit={handleUpdateSelectedItem}
                                        onCancel={() => {
                                            setIsEditingSelectedItem(false);
                                        }}
                                        isSubmitting={isSubmittingSelectedItem}
                                    />
                                </Box>
                            ) : selectedItem !== undefined && isMovingSelectedItem ? (
                                <Box gap="medium">
                                    {selectedItemError !== undefined && (
                                        <Text color="status-critical">{selectedItemError}</Text>
                                    )}
                                    <ContainerSelector
                                        containers={availableContainers}
                                        selectedContainerId={selectedMoveTargetId}
                                        onSelect={setSelectedMoveTargetId}
                                        disabled={isSubmittingSelectedItem}
                                    />
                                    <Box direction="row" justify="end" gap="small">
                                        <Button
                                            label="Cancel"
                                            onClick={() => {
                                                setIsMovingSelectedItem(false);
                                            }}
                                            disabled={isSubmittingSelectedItem}
                                        />
                                        <Button
                                            primary
                                            label="Move Item"
                                            onClick={() => {
                                                void handleMoveSelectedItem();
                                            }}
                                            disabled={isSubmittingSelectedItem}
                                        />
                                    </Box>
                                </Box>
                            ) : selectedItem !== undefined ? (
                                <ItemDetailViewPresentation
                                    item={selectedItem}
                                    tags={selectedItemTags}
                                    onEdit={() => {
                                        setSelectedItemError(undefined);
                                        setIsConfirmingSelectedDelete(false);
                                        setIsEditingSelectedItem(true);
                                    }}
                                    onMove={() => {
                                        setSelectedItemError(undefined);
                                        setIsConfirmingSelectedDelete(false);
                                        setSelectedMoveTargetId(selectedItem.containerId);
                                        setIsMovingSelectedItem(true);
                                    }}
                                    onDelete={() => {
                                        setSelectedItemError(undefined);
                                        setIsConfirmingSelectedDelete(true);
                                        return undefined;
                                    }}
                                    onRemoveTag={(tagId) => {
                                        void handleRemoveTagFromItem(tagId);
                                        return undefined;
                                    }}
                                    disabled={isSubmittingSelectedItem}
                                />
                            ) : (
                                <Box align="center" pad="large">
                                    <Heading level="3" color="status-error">
                                        Item Not Found
                                    </Heading>
                                </Box>
                            )}
                        </Box>
                    </Layer>
                )}
            </AppShell>
        </Grommet>
    );
};
