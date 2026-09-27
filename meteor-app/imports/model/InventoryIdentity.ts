/** Runtime-independent identity metadata and printed-label formatting for UI consumers. */
export interface InventoryIdentity {
    /** Deterministic key derived from the external identity namespace and value. */
    _id?: string;
    itemId: string;
    identity: {
        namespace: string;
        value: string;
    };
}

const SHORT_ID_LENGTH = 8;

/** Return the compact label format used on printed household inventory stickers. */
export const getInventoryIdLabel = (identity: InventoryIdentity['identity'], isContainer: boolean): string => {
    const prefix = isContainer ? '箱' : '物';
    return `${prefix}-${identity.value.slice(0, SHORT_ID_LENGTH).toUpperCase()}`;
};
