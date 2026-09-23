/**
 * Decouples shared inventory mutations from the server-only derived search index.
 * The server registers one observer; tests may replace or clear it explicitly.
 */
export interface InventorySearchSyncObserver {
    upsert: (itemId: string) => Promise<void>;
    delete: (itemId: string) => Promise<void>;
    rebuild: () => Promise<void>;
}

let observer: InventorySearchSyncObserver | undefined = undefined;

export const registerInventorySearchSync = (next: InventorySearchSyncObserver | undefined): (() => void) => {
    const previous = observer;
    observer = next;
    return () => {
        observer = previous;
    };
};

export const syncInventorySearchUpsert = async (itemId: string): Promise<void> => {
    await observer?.upsert(itemId);
};

export const syncInventorySearchDelete = async (itemId: string): Promise<void> => {
    await observer?.delete(itemId);
};

/** Reconcile the complete derived index after a bulk write path. */
export const rebuildInventorySearchIndex = async (): Promise<void> => {
    await observer?.rebuild();
};
