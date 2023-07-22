import CollectionItem from "./CollectionItem";

export interface InventoryItem extends CollectionItem {
    /**
     * Name of the inventory item.
     */
    name: string;
}

export default InventoryItem;
