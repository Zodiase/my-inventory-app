import InventoryItem from '/imports/model/InventoryItem';
import createLogger from '/imports/utility/Logger';
import asMeteorMethods from '/imports/utility/MeteorMethods';
import { NamedCollection } from '/imports/utility/NamedCollection';
import NoId from '/imports/utility/NoId';
import RecordInput from '/imports/utility/RecordInput';

export { InventoryItem } from '/imports/model/InventoryItem';

const logger = createLogger(module);

export const InventoryItemsCollection = new NamedCollection<InventoryItem>('items');

export const createInventoryItem = async (itemInput: RecordInput<InventoryItem>): Promise<string> => {
    const { name } = itemInput;

    if (typeof name === 'undefined') {
        throw new Error('Item must have a name.');
    }

    const now = new Date();
    const newItem: NoId<InventoryItem> = {
        name,
        createdAt: now,
        modifiedAt: now,
    };

    const itemId = await InventoryItemsCollection.insertAsync(newItem);

    return itemId;
};

export default asMeteorMethods(InventoryItemsCollection, {
    createItem: createInventoryItem,
});
