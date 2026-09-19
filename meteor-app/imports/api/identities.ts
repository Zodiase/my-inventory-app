/**
 * Client-visible view of the inventory identity bindings maintained by the
 * agent interface. This is read-only UI metadata; identity writes remain
 * guarded by the agent API and are not exposed as Meteor client mutations.
 */
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export interface InventoryIdentity {
    itemId: string;
    identity: {
        namespace: string;
        value: string;
    };
}

/** Return the compact label format used on printed household inventory stickers. */
export const getInventoryIdLabel = (identity: InventoryIdentity['identity'], isContainer: boolean): string => {
    const prefix = isContainer ? '箱' : '物';
    return `${prefix}-${identity.value.slice(0, 8).toUpperCase()}`;
};

/** Avoid repeating an ID when the item name already carries its printed label. */
export const itemNameIncludesInventoryId = (
    name: string,
    identity: InventoryIdentity['identity'],
    isContainer: boolean
): boolean => name.toLocaleUpperCase().includes(getInventoryIdLabel(identity, isContainer));

export const InventoryIdentitiesCollection = new Mongo.Collection<InventoryIdentity>('agent_identities');

if (Meteor.isServer) {
    Meteor.publish('inventory.identities', function publishInventoryIdentities() {
        return InventoryIdentitiesCollection.find({}, { fields: { itemId: 1, identity: 1 } });
    });
}
