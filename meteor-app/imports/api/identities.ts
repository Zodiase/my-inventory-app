/**
 * Client-visible view of the inventory identity bindings maintained by the
 * agent interface. This is read-only UI metadata; identity writes remain
 * guarded by the agent API and are not exposed as Meteor client mutations.
 */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import type { InventoryIdentity } from '/imports/model/InventoryIdentity';

export { getInventoryIdLabel } from '/imports/model/InventoryIdentity';
export type { InventoryIdentity } from '/imports/model/InventoryIdentity';

export const InventoryIdentitiesCollection = new Mongo.Collection<InventoryIdentity>('agent_identities');

if (Meteor.isServer) {
    Meteor.publish('inventory.identities', function publishInventoryIdentities() {
        return InventoryIdentitiesCollection.find({}, { fields: { itemId: 1, identity: 1 } });
    });
}
