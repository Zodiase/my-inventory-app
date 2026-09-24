/**
 * Shared registration point for ranked search implemented by the server-only service.
 * Missing registration is an unavailable dependency, never a valid zero-match response.
 */
export interface InventorySearchHit {
    id: string;
    score: number;
    matchedFields: string[];
}

export interface InventorySearchPage {
    hits: InventorySearchHit[];
    estimatedTotalHits: number;
}

export interface InventorySearchProvider {
    search: (query: string, offset: number, limit: number) => Promise<InventorySearchPage>;
    health: () => Promise<void>;
}

export class InventorySearchUnavailableError extends Error {
    constructor(message = 'Inventory search is unavailable', options?: ErrorOptions) {
        super(message, options);
        this.name = 'InventorySearchUnavailableError';
    }
}

let provider: InventorySearchProvider | undefined = undefined;

export const registerInventorySearchProvider = (next: InventorySearchProvider | undefined): (() => void) => {
    const previous = provider;
    provider = next;
    return () => {
        provider = previous;
    };
};

export const searchInventoryIndex = async (
    query: string,
    offset: number,
    limit: number
): Promise<InventorySearchPage> => {
    if (provider === undefined) throw new InventorySearchUnavailableError();
    return await provider.search(query, offset, limit);
};

export const checkInventorySearchHealth = async (): Promise<void> => {
    if (provider === undefined) throw new InventorySearchUnavailableError();
    await provider.health();
};
