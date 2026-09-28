/** Server-owned search outcome used by the UI to correlate rendered cards with one backend run. */
import type InventorySearchResult from './InventorySearchResult';

export interface TracedInventorySearch {
    results: InventorySearchResult[];
    runId: string;
    count: number;
    resultIds: string[];
    status: 'success' | 'empty' | 'error';
    errorCode?: 'search-unavailable' | 'search-failed';
}
