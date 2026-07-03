/**
 * Top-level application shell and route composition.
 * Coordinates URL-backed inventory views, creation modal state, and cross-view search state.
 */
import { Box, Button, Grommet, Heading, Layer, Text } from 'grommet';
import { Add, Close, Filter } from 'grommet-icons';
import { Meteor } from 'meteor/meteor';
import React, { type ReactElement, useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';

import Items, { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { SearchFragment } from '/imports/model/SearchFragment';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { AppShell } from './AppShell';
import { FilterBar } from './FilterBar';
import { ItemDetailView } from './ItemDetailView';
import { ItemForm } from './ItemForm';
import { ItemsByTagView } from './ItemsByTagView';
import { NotFoundView } from './NotFoundView';
import { SearchBar } from './SearchBar';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchResultsView } from './SearchResultsView';
import { SearchScopeSelector } from './SearchScopeSelector';
import { SettingsDataView } from './SettingsDataView';
import { DesignSystemGlobalStyle, theme } from './theme';

const SEARCH_RESULT_ITEM_DETAIL_SOURCE = 'search-results';

interface ItemDetailNavigationState {
    inventoryItemDetailSource?: typeof SEARCH_RESULT_ITEM_DETAIL_SOURCE;
}

const findInventoryItemById = (itemId: string): InventoryItem | undefined => {
    return InventoryItemsCollection.find({ _id: itemId }, { limit: 1 }).fetch()[0];
};

const isSearchResultItemDetailState = (state: unknown): state is ItemDetailNavigationState => {
    return (
        typeof state === 'object' &&
        state !== null &&
        (state as ItemDetailNavigationState).inventoryItemDetailSource === SEARCH_RESULT_ITEM_DETAIL_SOURCE
    );
};

const getCurrentHistoryState = (): unknown => {
    if (typeof window === 'undefined') return undefined;
    return window.history.state;
};

const decodeRouteParam = (routeParam: string): string | undefined => {
    try {
        const decodedParam = decodeURIComponent(routeParam);
        return decodedParam.length > 0 ? decodedParam : undefined;
    } catch {
        return undefined;
    }
};

export const App = (): ReactElement => {
    const [location, setLocation] = useLocation();
    const isSearchResultItemDetail = isSearchResultItemDetailState(getCurrentHistoryState());
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [currentItemsContainerId, setCurrentItemsContainerId] = useState<string | undefined>();
    const containerRouteMatch = /^\/container\/([^/]+)$/.exec(location);
    const isContainerRoute = containerRouteMatch !== null;
    const routeContainerId = containerRouteMatch !== null ? decodeRouteParam(containerRouteMatch[1]) : undefined;

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

    // Fetch all tags for search components
    const isLoadingTags = useSubscribe('tags.all');
    const isLoadingAllItems = useSubscribe('items.all');
    const tagsLoading = isLoadingTags();
    const allItemsLoading = isLoadingAllItems();
    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

    const routeContainer = useTracker(() => {
        if (routeContainerId === undefined) return undefined;
        return findInventoryItemById(routeContainerId);
    }, [routeContainerId]);

    const currentSearchScopeItem = useTracker(() => {
        if (currentItemsContainerId === undefined) return undefined;
        return findInventoryItemById(currentItemsContainerId);
    }, [currentItemsContainerId]);

    // Clear filters when navigating between views
    useEffect(() => {
        const itemDetailRouteMatch = /^\/items\/[^/]+$/.exec(location);
        setShowCreateItem(false);
        setItemsViewFilters([]);
        setShowFilterBuilder(false);

        if (isContainerRoute) {
            setCurrentItemsContainerId(routeContainerId);
        } else if (location === '/' || location === '/items') {
            setCurrentItemsContainerId(undefined);
        } else if (itemDetailRouteMatch !== null) {
            if (!isSearchResultItemDetail) {
                setCurrentItemsContainerId(undefined);
            }
        } else if (location !== '/search') {
            setCurrentItemsContainerId(undefined);
        }
    }, [isContainerRoute, isSearchResultItemDetail, location, routeContainerId]);

    useEffect(() => {
        if (!isContainerRoute || routeContainerId === undefined || allItemsLoading) return;

        if (routeContainer?.isContainer === true) {
            setCurrentItemsContainerId(routeContainerId);
        } else {
            setCurrentItemsContainerId(undefined);
        }
    }, [allItemsLoading, isContainerRoute, routeContainer?._id, routeContainer?.isContainer, routeContainerId]);

    useEffect(() => {
        if (currentItemsContainerId === undefined && searchScope === 'scoped') {
            setSearchScope('global');
        }
    }, [currentItemsContainerId, searchScope]);

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
        setLocation(`/items/${itemId}`, {
            state: {
                inventoryItemDetailSource: SEARCH_RESULT_ITEM_DETAIL_SOURCE,
            },
        });
    };

    const getItemPath = (pathItemId: string): InventoryItem[] => {
        const item = findInventoryItemById(pathItemId);
        if (item === undefined) return [];

        const path: InventoryItem[] = [item];
        const visitedItemIds = new Set<string>([item._id]);
        let currentItem = item;

        while (currentItem.containerId !== undefined) {
            if (visitedItemIds.has(currentItem.containerId)) break;

            const parent = findInventoryItemById(currentItem.containerId);
            if (parent === undefined) break;

            path.unshift(parent);
            visitedItemIds.add(parent._id);
            currentItem = parent;
        }

        return path;
    };

    const handleItemsViewNavigate = (containerId: string | undefined): void => {
        setCurrentItemsContainerId(containerId);
        // Clear filters when navigating to a different container
        setItemsViewFilters([]);
        setShowFilterBuilder(false);
    };

    const getItemsViewHeading = (initialContainerId?: string): string => {
        if (initialContainerId === undefined) return 'All Items';
        return findInventoryItemById(initialContainerId)?.name ?? 'Container';
    };

    const renderItemsView = (initialContainerId?: string): ReactElement => {
        return (
            <Box>
                <Box direction="row" justify="between" align="center" margin={{ bottom: 'medium' }}>
                    <Heading level="2" margin="none">
                        {getItemsViewHeading(initialContainerId)}
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

                <AllItemsView
                    initialContainerId={initialContainerId}
                    filters={itemsViewFilters}
                    onNavigate={handleItemsViewNavigate}
                />
            </Box>
        );
    };

    const renderInvalidContainerView = (): ReactElement => {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Container Not Found
                </Heading>
                <Text>The container you're looking for doesn't exist, is not a container, or has been deleted.</Text>
                <a href="/items" className="app-primary-link-button">
                    Go to Items
                </a>
            </Box>
        );
    };

    const renderContainerRoute = (rawRouteContainerId: string): ReactElement => {
        const containerId = decodeRouteParam(rawRouteContainerId);
        if (containerId === undefined) {
            return renderInvalidContainerView();
        }

        if (allItemsLoading) {
            return <LoadingState />;
        }

        const container = containerId === routeContainerId ? routeContainer : findInventoryItemById(containerId);
        if (container?.isContainer !== true) {
            return renderInvalidContainerView();
        }

        return renderItemsView(containerId);
    };

    return (
        <Grommet theme={theme} full>
            <DesignSystemGlobalStyle />
            <AppShell location={location}>
                <Switch>
                    {/* Home route - Items view */}
                    <Route path="/">{() => renderItemsView()}</Route>

                    {/* Items list route */}
                    <Route path="/items">{() => renderItemsView()}</Route>

                    {/* Container route */}
                    <Route path="/container/:containerId">
                        {({ containerId }) => renderContainerRoute(containerId)}
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

                                {tagsLoading || allItemsLoading ? (
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
                    <Route path="/items/:itemId">
                        {() => <ItemDetailView deleteReturnPath={isSearchResultItemDetail ? '/search' : undefined} />}
                    </Route>

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
            </AppShell>
        </Grommet>
    );
};
