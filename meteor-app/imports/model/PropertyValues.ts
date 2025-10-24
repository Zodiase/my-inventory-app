/**
 * PropertyValues interface for optional item metadata
 *
 * All fields are optional and nullable. Empty/null properties are not displayed in the UI
 * but are preserved in the data model.
 */
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
}
