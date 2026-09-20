/**
 * Optional inventory metadata shared by persistence, import/export, and UI projection.
 * Structured-storage definitions live here because they are durable inventory data,
 * while validation and visual projection belong in StructuredStorageLayout.
 */
export interface StorageLayoutCell {
    slotId: string;
    label: string;
    row: number;
    column: number;
    rowSpan?: number;
    columnSpan?: number;
    kind: 'storage' | 'non-storage';
}

export interface StorageLayoutDefinition {
    modelId: string;
    tierCount?: number;
    positions?: Array<'left' | 'right'>;
    columns?: number;
    rows?: number;
    axisLabel?: string;
    cells?: StorageLayoutCell[];
}

export interface StoragePlacement {
    modelId?: string;
    tier?: number;
    position: string;
    slotId?: string;
}

export interface PropertyValues {
    /** Serial number or identification code, max 500 chars */
    serialNumber?: string;

    /** Manufacturer or brand name, max 200 chars */
    make?: string;

    /** Product model or version, max 200 chars */
    model?: string;

    /** Date of purchase, ISO 8601 format */
    purchaseDate?: Date;

    /** Where the item was purchased, max 300 chars */
    purchaseFrom?: string;

    /** Purchase price in cents (USD), positive integer */
    purchasePrice?: number;

    /** Current market value in cents (USD), positive integer */
    marketValue?: number;

    /** Warranty information, max 1000 chars, supports markdown */
    warranty?: string;

    /** Item condition and notes, max 2000 chars, supports markdown */
    condition?: string;

    /** Reusable physical-layout model referenced by a structured container stack. */
    storageLayout?: StorageLayoutDefinition;

    /** Physical slot occupied by an item inside a structured storage layout. */
    storagePlacement?: StoragePlacement;

    /** Known fixture family used to select a physical-layout renderer. */
    fixtureType?: string;

    /** Number of fixed structural storage sections observed on a fixture. */
    structuralSectionCount?: number;

    /** Marks a child as a structural part of its parent fixture. */
    structuralSection?: boolean;

    /** Records that a storage section was observed empty during intake. */
    observedEmpty?: boolean;

    /** Records a decorative front that does not open into storage. */
    falseFrontBelowSink?: boolean;
}
