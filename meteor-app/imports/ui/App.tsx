/**
 * Top-level application shell and route composition.
 * Coordinates URL-backed inventory views, creation modal state, and cross-view search state.
 */
import { Box, Button, Grommet, Heading, Text } from 'grommet';
import { Meteor } from 'meteor/meteor';
import React, { type ReactElement, useState, useEffect, useRef } from 'react';
import { Link, Route, Switch, useLocation, useSearch } from 'wouter';

import { getInventoryIdLabel, InventoryIdentitiesCollection } from '/imports/api/identities';
import Items, { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type InventorySearchResult from '/imports/model/InventorySearchResult';
import type { SearchFragment } from '/imports/model/SearchFragment';
import type { TracedInventorySearch } from '/imports/model/TracedInventorySearch';
import { LoadingState } from '/imports/ui/common/LoadingState';
import {
    captureRoot,
    captureRoute,
    captureTree,
    captureBoundary,
    captureShell,
    captureDescendant,
} from '/imports/utility/e2eLoadingCapture';
import { scalarRoot, scalarRecord } from '/imports/utility/e2eScalarCapture';
import { useTracker } from '/imports/utility/reactMeteorData';
import type RecordInput from '/imports/utility/RecordInput';
import { useRootReadiness } from '/imports/utility/useRootReadiness';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';
import { AppShell } from './AppShell';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { FilterBar } from './FilterBar';
import { InventoryContentsHeader } from './InventoryContentsHeader';
import { ItemDetailView } from './ItemDetailView';
import { ItemDialog } from './ItemDialog';
import { ItemForm } from './ItemForm';
import { ItemsByTagView } from './ItemsByTagView';
import { NotFoundView } from './NotFoundView';
import { SearchAppliedFilters } from './SearchAppliedFilters';
import { SearchBanner } from './SearchBanner';
import { hasRunnableFilter, resetSearchFilters, setItemTypeFilter, setTagFilterState } from './searchFilterState';
import { SearchFragmentBuilder } from './SearchFragmentBuilder';
import { SearchPageLayout } from './SearchPageLayout';
import { SearchResultsView } from './SearchResultsView';
import { getSearchUrl, readSearchUrlState, type SearchUrlState } from './searchUrlState';
import { SettingsDataView } from './SettingsDataView';
import { DesignSystemGlobalStyle, theme } from './theme';

const SEARCH_RESULT_ITEM_DETAIL_SOURCE = 'search-results';
const SEARCH_TYPING_DELAY_MS = 350;

interface ItemDetailNavigationState {
    inventoryItemDetailSource?: typeof SEARCH_RESULT_ITEM_DETAIL_SOURCE;
    searchReturnPath?: string;
}

const findInventoryItemById = (itemId: string): InventoryItem | undefined => {
    return InventoryItemsCollection.find({ _id: itemId }, { limit: 1 }).fetch()[0];
};

const isSearchResultItemDetailState = (state: unknown): state is ItemDetailNavigationState => {
    return (
        typeof state === 'object' &&
        state !== null &&
        (state as ItemDetailNavigationState).inventoryItemDetailSource === SEARCH_RESULT_ITEM_DETAIL_SOURCE &&
        typeof (state as ItemDetailNavigationState).searchReturnPath === 'string' &&
        /^\/search(?:\?|$)/u.test((state as ItemDetailNavigationState).searchReturnPath ?? '')
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
    const search = useSearch();
    const currentRoutePath = `${location}${
        typeof window === 'undefined' ? (search === '' ? '' : `?${search}`) : window.location.search
    }`;
    const searchUrlState = readSearchUrlState(search);
    const isSearchResultItemDetail = isSearchResultItemDetailState(getCurrentHistoryState());
    const [showCreateItem, setShowCreateItem] = useState(false);
    const [currentItemsContainerId, setCurrentItemsContainerId] = useState<string | undefined>();
    const [lastSearchContainerId, setLastSearchContainerId] = useState<string | undefined>();
    const searchContainerId = searchUrlState.containerId ?? lastSearchContainerId;
    const containerRouteMatch = /^\/container\/([^/]+)$/.exec(location);
    const isContainerRoute = containerRouteMatch !== null;
    const routeContainerId = containerRouteMatch !== null ? decodeRouteParam(containerRouteMatch[1]) : undefined;

    // Search state
    const [searchResults, setSearchResults] = useState<InventorySearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | undefined>();
    const [searchRun, setSearchRun] = useState<TracedInventorySearch | undefined>();
    const [completedSearchKey, setCompletedSearchKey] = useState<string | undefined>();
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchSubmitCount, setSearchSubmitCount] = useState(0);
    const searchRequestKey = `${currentRoutePath}#${searchSubmitCount}`;
    const searchRequestId = useRef(0);
    // A completed result is a checkpoint; consume it once when editing starts.
    const searchHistoryCheckpoint = useRef<string | undefined>();
    const searchResultsRegion = useRef<HTMLDivElement>(null);
    const searchScrollPositions = useRef(new Map<string, number>());

    // Filter state for items view
    const [itemsViewFilters, setItemsViewFilters] = useState<SearchFragment[]>([]);
    const [showFilterBuilder, setShowFilterBuilder] = useState(false);
    // The App stays mounted across the own-details detour. Keep list state and
    // scroll only for that exact pair of routes; other navigation resets it.
    const contentsDetailsContext = useRef<{ contentsPath: string; detailPath: string; scrollTop: number }>();
    const contentsDetailsButton = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
    useEffect(() => {
        if (location !== contentsDetailsContext.current?.contentsPath) return;
        const frame = requestAnimationFrame(() => contentsDetailsButton.current?.focus({ preventScroll: true }));
        return () => {
            cancelAnimationFrame(frame);
        };
    }, [location]);
    const contentsRegion = useRef<HTMLDivElement>(null);

    // Fetch all tags for search components
    const isLoadingTags = useRootReadiness('tags.all');
    const isLoadingAllItems = useRootReadiness('items.all');
    const isLoadingIdentities = useRootReadiness('inventory.identities');
    const tagsLoading = isLoadingTags();
    const allItemsLoading = isLoadingAllItems();
    const identitiesLoading = isLoadingIdentities();
    const scalarFrame = scalarRoot({ tagsLoading, allItemsLoading, identitiesLoading });
    const loadingCaptureRoot = captureRoot(contentsRegion, { tagsLoading, allItemsLoading, identitiesLoading });
    captureBoundary(loadingCaptureRoot, 'tracker-before', 'tags');
    const allTags = useTracker(() => {
        return TagsCollection.find({}, { sort: { name: 1 } }).fetch();
    }, []);

    captureBoundary(loadingCaptureRoot, 'tracker-after', 'tags');
    captureBoundary(loadingCaptureRoot, 'tracker-before', 'route-container');
    const routeContainer = useTracker(() => {
        if (routeContainerId === undefined) return undefined;
        return findInventoryItemById(routeContainerId);
    }, [routeContainerId]);

    captureBoundary(loadingCaptureRoot, 'tracker-after', 'route-container');
    captureBoundary(loadingCaptureRoot, 'tracker-before', 'search-scope');
    const currentSearchScopeItem = useTracker(() => {
        if (searchContainerId === undefined) return undefined;
        return findInventoryItemById(searchContainerId);
    }, [searchContainerId]);

    captureBoundary(loadingCaptureRoot, 'tracker-after', 'search-scope');
    captureBoundary(loadingCaptureRoot, 'tracker-before', 'contents-identity');
    const currentItemsContainerIdentity = useTracker(() => {
        if (currentItemsContainerId === undefined) return undefined;
        return InventoryIdentitiesCollection.findOne({ itemId: currentItemsContainerId });
    }, [currentItemsContainerId]);

    captureBoundary(loadingCaptureRoot, 'tracker-after', 'contents-identity');

    // Clear filters when navigating between views
    useEffect(() => {
        const itemDetailRouteMatch = /^\/items\/[^/]+$/.exec(location);
        setShowCreateItem(false);
        const context = contentsDetailsContext.current;
        const ownDetailsDetour =
            context !== undefined && (location === context.contentsPath || location === context.detailPath);
        if (!ownDetailsDetour) {
            contentsDetailsContext.current = undefined;
            setItemsViewFilters([]);
            setShowFilterBuilder(false);
        }

        if (isContainerRoute) {
            scalarRecord(scalarFrame, 'setter-call', {
                site: 'route-sync',
                sameAsRendered: currentItemsContainerId === routeContainerId,
            });
            setCurrentItemsContainerId(routeContainerId);
            setLastSearchContainerId(routeContainerId);
        } else if (location === '/' || location === '/items') {
            scalarRecord(scalarFrame, 'setter-call', {
                site: 'root-clear',
                sameAsRendered: currentItemsContainerId === undefined,
            });
            setCurrentItemsContainerId(undefined);
        } else if (itemDetailRouteMatch !== null) {
            if (!isSearchResultItemDetail && !ownDetailsDetour) {
                setCurrentItemsContainerId(undefined);
            }
        } else if (location !== '/search') {
            setCurrentItemsContainerId(undefined);
        }
        // Diagnostic closure retains the original render frame; original effect dependencies are unchanged.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isContainerRoute, isSearchResultItemDetail, location, routeContainerId]);

    useEffect(() => {
        if (!isContainerRoute || routeContainerId === undefined || allItemsLoading) return;

        if (routeContainer?.isContainer === true) {
            scalarRecord(scalarFrame, 'setter-call', {
                site: 'container-valid',
                sameAsRendered: currentItemsContainerId === routeContainerId,
            });
            setCurrentItemsContainerId(routeContainerId);
        } else {
            scalarRecord(scalarFrame, 'setter-call', {
                site: 'container-invalid',
                sameAsRendered: currentItemsContainerId === undefined,
            });
            setCurrentItemsContainerId(undefined);
        }
        // Diagnostic closure retains the original render frame; original effect dependencies are unchanged.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allItemsLoading, isContainerRoute, routeContainer?._id, routeContainer?.isContainer, routeContainerId]);

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

    const updateSearchUrl = (changes: Partial<SearchUrlState>): void => {
        const nextPath = getSearchUrl({ ...searchUrlState, ...changes });
        if (nextPath === currentRoutePath) return;
        const preserveCompletedSearch =
            changes.query !== undefined &&
            changes.query !== searchUrlState.query &&
            searchHistoryCheckpoint.current === currentRoutePath;
        searchHistoryCheckpoint.current = undefined;
        setLocation(nextPath, { replace: !preserveCompletedSearch });
    };

    // Typing updates the shareable URL immediately; execution waits for the user to pause.
    useEffect(() => {
        if (location !== '/search' || searchUrlState.submitted) return;
        if (searchUrlState.query.trim() === '' && !hasRunnableFilter(searchUrlState.fragments)) return;
        const timer = window.setTimeout(
            () => {
                setLocation(getSearchUrl({ ...searchUrlState, submitted: true }), { replace: true });
            },
            searchUrlState.query.trim() === '' ? 0 : SEARCH_TYPING_DELAY_MS
        );
        return () => {
            window.clearTimeout(timer);
        };
    }, [location, search]);

    useEffect(() => {
        searchHistoryCheckpoint.current = undefined;
        if (location !== '/search') return;
        const requestId = ++searchRequestId.current;
        if (!searchUrlState.submitted) {
            setSearchResults([]);
            setSearchError(undefined);
            setSearchRun(undefined);
            setCompletedSearchKey(undefined);
            setSearchLoading(false);
            return;
        }

        const fragments: SearchFragment[] = [...searchUrlState.fragments];
        if (searchUrlState.scope === 'scoped' && searchUrlState.containerId !== undefined) {
            fragments.unshift({ type: 'containerScope', containerRootId: searchUrlState.containerId });
        }
        if (searchUrlState.query.trim() !== '') {
            fragments.push({ type: 'text', value: searchUrlState.query.trim() });
        }

        setSearchLoading(true);
        setSearchError(undefined);
        setSearchRun(undefined);
        setCompletedSearchKey(undefined);
        void Meteor.callAsync<TracedInventorySearch>('items.searchTraced', fragments)
            .then((run) => {
                if (requestId !== searchRequestId.current) return;
                setSearchRun(run);
                setSearchResults(run.results);
                setCompletedSearchKey(searchRequestKey);
                searchHistoryCheckpoint.current = currentRoutePath;
                if (run.status === 'error') {
                    setSearchError(
                        run.errorCode === 'search-unavailable'
                            ? 'Search is temporarily unavailable. Try again after the local search service recovers.'
                            : 'Search failed. Please try again.'
                    );
                }
                requestAnimationFrame(() => {
                    if (searchResultsRegion.current !== null) {
                        searchResultsRegion.current.scrollTop =
                            searchScrollPositions.current.get(window.location.href) ?? 0;
                    }
                });
            })
            .catch((error: unknown) => {
                if (requestId !== searchRequestId.current) return;
                console.error('Search failed:', error);
                setSearchResults([]);
                setSearchRun(undefined);
                setCompletedSearchKey(searchRequestKey);
                searchHistoryCheckpoint.current = currentRoutePath;
                const errorCode =
                    typeof error === 'object' && error !== null && 'error' in error
                        ? Reflect.get(error, 'error')
                        : undefined;
                setSearchError(
                    errorCode === 'search-unavailable'
                        ? 'Search is temporarily unavailable. Try again after the local search service recovers.'
                        : 'Search failed. Please try again.'
                );
            })
            .finally(() => {
                if (requestId === searchRequestId.current) setSearchLoading(false);
            });
        return () => {
            searchRequestId.current += 1;
        };
    }, [location, search, searchSubmitCount]);

    const handleSearchItemClick = (itemId: string): void => {
        searchScrollPositions.current.set(window.location.href, searchResultsRegion.current?.scrollTop ?? 0);
        setLocation(`/items/${encodeURIComponent(itemId)}`, {
            state: {
                inventoryItemDetailSource: SEARCH_RESULT_ITEM_DETAIL_SOURCE,
                searchReturnPath: currentRoutePath,
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
            <Box fill style={{ minHeight: 0 }}>
                <InventoryContentsHeader
                    detailsRef={(node) => {
                        contentsDetailsButton.current = node;
                    }}
                    detailsHref={
                        initialContainerId === undefined
                            ? undefined
                            : `/items/${encodeURIComponent(initialContainerId)}`
                    }
                    title={getItemsViewHeading(initialContainerId)}
                    identityLabel={
                        currentItemsContainerIdentity !== undefined && initialContainerId !== undefined
                            ? getInventoryIdLabel(currentItemsContainerIdentity.identity, true)
                            : undefined
                    }
                    onDetails={
                        initialContainerId === undefined
                            ? undefined
                            : () => {
                                  const detailPath = `/items/${encodeURIComponent(initialContainerId)}`;
                                  contentsDetailsContext.current = {
                                      contentsPath: location,
                                      detailPath,
                                      scrollTop:
                                          contentsRegion.current?.querySelector('[data-testid="items-list"]')
                                              ?.scrollTop ?? 0,
                                  };
                                  setLocation(detailPath);
                              }
                    }
                    showFilters={showFilterBuilder}
                    onToggleFilters={() => {
                        setShowFilterBuilder(!showFilterBuilder);
                    }}
                    onCreate={() => {
                        setShowCreateItem(true);
                    }}
                />

                {/* Filter status and clear */}
                {itemsViewFilters.length > 0 && (
                    <Box margin={{ bottom: 'medium' }} flex={false}>
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
                    <Box margin={{ bottom: 'medium' }} pad="medium" background="light-2" round="small" flex={false}>
                        <SearchFragmentBuilder
                            fragments={itemsViewFilters}
                            onChange={setItemsViewFilters}
                            availableTags={allTags}
                        />
                    </Box>
                )}

                <Box style={{ minHeight: 0, flex: '1 1 0%' }} ref={contentsRegion}>
                    <AllItemsView
                        initialContainerId={initialContainerId}
                        initialScrollTop={
                            contentsDetailsContext.current?.contentsPath === location
                                ? contentsDetailsContext.current.scrollTop
                                : undefined
                        }
                        filters={itemsViewFilters}
                        onNavigate={handleItemsViewNavigate}
                    />
                </Box>
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
        scalarRecord(scalarFrame, 'route-entry');
        const containerId = decodeRouteParam(rawRouteContainerId);
        if (containerId === undefined) {
            scalarRecord(scalarFrame, 'route-decision', { decision: 'invalid' });
            return captureTree(captureRoute(loadingCaptureRoot, 'invalid'), renderInvalidContainerView());
        }

        if (allItemsLoading || identitiesLoading) {
            scalarRecord(scalarFrame, 'route-decision', { decision: 'root-loading' });
            return captureTree(captureRoute(loadingCaptureRoot, 'root-loading'), <LoadingState />);
        }

        const container = containerId === routeContainerId ? routeContainer : findInventoryItemById(containerId);
        if (container?.isContainer !== true) {
            scalarRecord(scalarFrame, 'route-decision', { decision: 'invalid' });
            return captureTree(captureRoute(loadingCaptureRoot, 'invalid'), renderInvalidContainerView());
        }

        scalarRecord(scalarFrame, 'route-decision', { decision: 'contents' });
        return captureTree(captureRoute(loadingCaptureRoot, 'contents'), renderItemsView(containerId));
    };

    const headerContainerPath = currentItemsContainerId === undefined ? [] : getItemPath(currentItemsContainerId);
    const headerParentPath = headerContainerPath.slice(0, -1);
    const searchScopeLabel = currentSearchScopeItem?.name ?? 'Current';
    const searchExitHref =
        searchUrlState.scope === 'scoped' && searchUrlState.containerId !== undefined
            ? `/container/${encodeURIComponent(searchUrlState.containerId)}`
            : '/items';
    const searchExitLabel =
        searchUrlState.scope === 'scoped' && searchUrlState.containerId !== undefined
            ? `Return to ${searchScopeLabel}`
            : 'Exit search to All Items';
    const searchReturnPath = isSearchResultItemDetail
        ? (getCurrentHistoryState() as ItemDetailNavigationState).searchReturnPath
        : undefined;
    captureBoundary(loadingCaptureRoot, 'tree-start');
    const appTree = captureDescendant(
        loadingCaptureRoot,
        'grommet',
        <Grommet theme={theme} full>
            <DesignSystemGlobalStyle />
            {captureShell(
                loadingCaptureRoot,
                captureDescendant(
                    loadingCaptureRoot,
                    'app-shell',
                    <AppShell
                        location={location}
                        searchHref={
                            isContainerRoute && routeContainerId !== undefined
                                ? getSearchUrl({
                                      query: '',
                                      scope: 'scoped',
                                      containerId: routeContainerId,
                                      fragments: [],
                                      submitted: false,
                                  })
                                : searchReturnPath ?? '/search'
                        }
                        headerContent={
                            location === '/search' ? (
                                <SearchBanner
                                    exitHref={searchExitHref}
                                    exitLabel={searchExitLabel}
                                    query={searchUrlState.query}
                                    onQueryChange={(query) => {
                                        updateSearchUrl({ query, submitted: false });
                                    }}
                                    onSearch={(query) => {
                                        if (query.trim() === '' && !hasRunnableFilter(searchUrlState.fragments)) return;
                                        if (searchUrlState.submitted && query === searchUrlState.query)
                                            setSearchSubmitCount((count) => count + 1);
                                        else updateSearchUrl({ query, submitted: true });
                                    }}
                                    scope={searchUrlState.scope}
                                    scopeLabel={searchScopeLabel}
                                    scopeAvailable={searchContainerId !== undefined}
                                    onScopeChange={(scope) => {
                                        updateSearchUrl({
                                            scope,
                                            containerId: searchContainerId,
                                            submitted:
                                                searchUrlState.query.trim() !== '' ||
                                                hasRunnableFilter(searchUrlState.fragments),
                                        });
                                    }}
                                    fragments={searchUrlState.fragments}
                                    availableTags={allTags}
                                    onSetTagState={(tagId, state) => {
                                        const fragments = setTagFilterState(searchUrlState.fragments, tagId, state);
                                        updateSearchUrl({
                                            fragments,
                                            submitted:
                                                searchUrlState.query.trim() !== '' || hasRunnableFilter(fragments),
                                        });
                                    }}
                                    onTypeChange={(type) => {
                                        const fragments = setItemTypeFilter(searchUrlState.fragments, type);
                                        updateSearchUrl({
                                            fragments,
                                            submitted:
                                                searchUrlState.query.trim() !== '' || hasRunnableFilter(fragments),
                                        });
                                    }}
                                    onResetFilters={() => {
                                        const fragments = resetSearchFilters();
                                        updateSearchUrl({
                                            scope: 'global',
                                            fragments,
                                            submitted:
                                                searchUrlState.query.trim() !== '' || hasRunnableFilter(fragments),
                                        });
                                    }}
                                />
                            ) : !isSearchResultItemDetail && currentItemsContainerId !== undefined ? (
                                <BreadcrumbTrail
                                    path={headerParentPath}
                                    showHomeIcon
                                    lastCrumbIsCurrent={false}
                                    onNavigateRoot={() => {
                                        setLocation('/items');
                                    }}
                                    onNavigate={(item) => {
                                        setLocation(`/container/${item._id}`);
                                    }}
                                    className="app-shell-breadcrumb"
                                />
                            ) : undefined
                        }
                    >
                        {captureDescendant(
                            loadingCaptureRoot,
                            'switch',
                            <Switch>
                                {/* Home route - Items view */}
                                <Route path="/">{() => renderItemsView()}</Route>

                                {/* Items list route */}
                                <Route path="/items">{() => renderItemsView()}</Route>

                                {/* Container route */}
                                <Route path="/container/:containerId">
                                    {({ containerId }) => {
                                        captureBoundary(loadingCaptureRoot, 'route-entry');
                                        return renderContainerRoute(containerId);
                                    }}
                                </Route>

                                {/* Tags list route */}
                                <Route path="/tags">{() => <AllTagsView />}</Route>

                                {/* Search route */}
                                <Route path="/search">
                                    {() => (
                                        <SearchPageLayout
                                            resultsRef={searchResultsRegion}
                                            filterEditor={
                                                searchUrlState.fragments.some(
                                                    (fragment) =>
                                                        fragment.type === 'tagInclude' ||
                                                        fragment.type === 'tagExclude' ||
                                                        (fragment.type === 'containerType' && fragment.value !== 'all')
                                                ) ? (
                                                    <SearchAppliedFilters
                                                        fragments={searchUrlState.fragments}
                                                        tags={allTags}
                                                        onRemoveTag={(tagId) => {
                                                            const fragments = setTagFilterState(
                                                                searchUrlState.fragments,
                                                                tagId,
                                                                'neutral'
                                                            );
                                                            updateSearchUrl({
                                                                fragments,
                                                                submitted:
                                                                    searchUrlState.query.trim() !== '' ||
                                                                    hasRunnableFilter(fragments),
                                                            });
                                                        }}
                                                        onClearType={() => {
                                                            const fragments = setItemTypeFilter(
                                                                searchUrlState.fragments,
                                                                'all'
                                                            );
                                                            updateSearchUrl({
                                                                fragments,
                                                                submitted:
                                                                    searchUrlState.query.trim() !== '' ||
                                                                    hasRunnableFilter(fragments),
                                                            });
                                                        }}
                                                    />
                                                ) : undefined
                                            }
                                            results={
                                                tagsLoading || allItemsLoading ? (
                                                    <LoadingState />
                                                ) : (
                                                    <SearchResultsView
                                                        results={
                                                            completedSearchKey === searchRequestKey ? searchResults : []
                                                        }
                                                        onItemClick={handleSearchItemClick}
                                                        loading={
                                                            searchLoading ||
                                                            (searchUrlState.submitted &&
                                                                completedSearchKey !== searchRequestKey)
                                                        }
                                                        hasSearched={searchUrlState.submitted}
                                                        errorMessage={
                                                            completedSearchKey === searchRequestKey
                                                                ? searchError
                                                                : undefined
                                                        }
                                                        searchRun={
                                                            completedSearchKey === searchRequestKey
                                                                ? searchRun
                                                                : undefined
                                                        }
                                                        availableTags={allTags}
                                                    />
                                                )
                                            }
                                        />
                                    )}
                                </Route>

                                {/* Item detail route */}
                                <Route path="/items/:itemId">
                                    {() => (
                                        <Box fill style={{ minHeight: 0 }}>
                                            {contentsDetailsContext.current?.detailPath === location && (
                                                <Box flex={false} align="start" margin={{ bottom: 'small' }}>
                                                    <Button
                                                        as={Link}
                                                        href={contentsDetailsContext.current.contentsPath}
                                                        label="Back to contents"
                                                    />
                                                </Box>
                                            )}
                                            <ItemDetailView
                                                deleteReturnPath={searchReturnPath}
                                                searchReturnPath={searchReturnPath}
                                            />
                                        </Box>
                                    )}
                                </Route>

                                {/* Items by tag route */}
                                <Route path="/tags/:tagId">{() => <ItemsByTagView />}</Route>

                                {/* Settings route */}
                                <Route path="/settings/data">{() => <SettingsDataView />}</Route>

                                {/* 404 Not Found */}
                                <Route>{() => <NotFoundView />}</Route>
                            </Switch>
                        )}

                        {/* Create Item Modal */}
                        {showCreateItem && (
                            <ItemDialog
                                title="Create New Item"
                                onClose={() => {
                                    setShowCreateItem(false);
                                }}
                            >
                                <ItemForm
                                    availableTags={allTags}
                                    onSubmit={handleCreateItem}
                                    onCancel={() => {
                                        setShowCreateItem(false);
                                    }}
                                />
                            </ItemDialog>
                        )}
                    </AppShell>
                )
            )}
        </Grommet>
    );
    captureBoundary(loadingCaptureRoot, 'tree-end');
    scalarRecord(scalarFrame, 'return');
    return appTree;
};
