/** Ranked inventory retrieval result with authoritative location and match evidence. */
import type InventoryItem from './InventoryItem';

export interface InventorySearchEvidence {
    score: number;
    matchedFields: string[];
}

export interface InventorySearchResult extends InventoryItem {
    /** Canonical nested record for callers that consume result metadata. */
    item: InventoryItem;
    path: InventoryItem[];
    evidence?: InventorySearchEvidence;
}

export default InventorySearchResult;
