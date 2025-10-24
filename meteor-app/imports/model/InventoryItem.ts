import type CollectionItem from './CollectionItem';
import type { PropertyValues } from '/imports/model/PropertyValues';

export interface InventoryItem extends CollectionItem {
    /**
     * Name of the inventory item (required, max 500 chars)
     */
    name: string;

    /**
     * Optional description (max 5000 chars)
     */
    description?: string;

    /**
     * Reference to parent container item (if this item is contained in another)
     * Must reference an existing item with isContainer: true
     * Cannot create circular references
     */
    containerId?: string;

    /**
     * Flag indicating if this item can contain other items
     * Items with isContainer: true act as locations/containers
     */
    isContainer: boolean;

    /**
     * Array of tag IDs applied to this item (many-to-many relationship)
     */
    tagIds: string[];

    /**
     * Optional properties for detailed item information
     * All fields are nullable, only non-empty properties displayed in UI
     */
    properties?: PropertyValues;
}

export default InventoryItem;
