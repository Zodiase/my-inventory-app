/**
 * Validates runtime configuration required by the private inventory search service.
 * Keeping fail-closed secret handling separate makes startup policy directly testable.
 */
export const requireInventorySearchApiKey = (environment: Record<string, string | undefined> = process.env): string => {
    const value = environment.INVENTORY_SEARCH_API_KEY?.trim();
    if (value === undefined || value === '') {
        throw new Error('INVENTORY_SEARCH_API_KEY must be set');
    }
    return value;
};
