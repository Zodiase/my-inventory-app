/**
 * Review-gated experiment for three fixed-name root readiness subscriptions only.
 * Immutable initial document opt-in selects either the original no-deps hook or
 * a retained computation; changing hook structure is intentional and not a repair claim.
 */
import { Meteor } from 'meteor/meteor';

import { useControlledOriginalRootReadiness, useControlledRetainedRootReadiness } from './controlledRootSubscribe';
import { controlledAppEnabled } from './e2eControlledApp';
import { validScalarCapability } from './e2eScalarEvidence';
import { useSubscribe, useTracker } from './reactMeteorData';
export type RootSubscription = 'tags.all' | 'items.all' | 'inventory.identities';
const host = globalThis as unknown as {
    inventoryE2eRetainedCapability?: unknown;
    inventoryE2eRetainedBootstrap?: { readonly enabled: boolean; readonly epoch?: string };
};
const eligible = Meteor.isClient && Meteor.isDevelopment;
if (eligible && host.inventoryE2eRetainedBootstrap === undefined) {
    const capability = host.inventoryE2eRetainedCapability;
    Object.defineProperty(host, 'inventoryE2eRetainedBootstrap', {
        value: Object.freeze({
            enabled: validScalarCapability(capability),
            epoch: validScalarCapability(capability) ? capability.epoch : undefined,
        }),
        writable: false,
        configurable: false,
    });
}
export const retainedRootReadinessEnabled = eligible && host.inventoryE2eRetainedBootstrap?.enabled === true;
function useOriginalRootReadiness(name: RootSubscription): () => boolean {
    return useSubscribe(name);
}
function useRetainedRootReadiness(name: RootSubscription): () => boolean {
    // No dynamic params or callbacks: the entire subscription dependency is its fixed name.
    const loading = useTracker(() => !Meteor.subscribe(name).ready(), [name]);
    return () => loading;
}
// Initial selection is preserved across module re-evaluation. Never flip hooks on a mounted root.
export const useRootReadiness = controlledAppEnabled
    ? retainedRootReadinessEnabled
        ? useControlledRetainedRootReadiness
        : useControlledOriginalRootReadiness
    : retainedRootReadinessEnabled
    ? useRetainedRootReadiness
    : useOriginalRootReadiness;
