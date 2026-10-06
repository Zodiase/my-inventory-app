/**
 * Development-only scalar recorder with immutable initial-document opt-in.
 * Adds no hooks, elements, observers, timers, package patches or scheduling calls.
 */
import { Meteor } from 'meteor/meteor';

import { createScalarEvidence, validScalarCapability, type ScalarPhase, type ScalarValues } from './e2eScalarEvidence';
const host = globalThis as unknown as {
    inventoryE2eScalarCapability?: unknown;
    inventoryE2eLoadingCapability?: unknown;
    inventoryE2eScalarCapture?: ReturnType<typeof createScalarEvidence>;
    inventoryE2eScalarBootstrap?: boolean;
};
const eligible = Meteor.isClient && Meteor.isDevelopment;
const capability = eligible ? host.inventoryE2eScalarCapability : undefined;
if (eligible && host.inventoryE2eScalarBootstrap === undefined)
    Object.defineProperty(host, 'inventoryE2eScalarBootstrap', {
        value: validScalarCapability(capability),
        writable: false,
        configurable: false,
    });
const enabled =
    eligible &&
    host.inventoryE2eScalarBootstrap === true &&
    validScalarCapability(capability) &&
    host.inventoryE2eLoadingCapability === undefined;
const prior = enabled ? host.inventoryE2eScalarCapture : undefined;
const collector = enabled ? (prior ?? createScalarEvidence(capability.epoch, () => performance.now())) : undefined;
if (collector !== undefined) {
    if (prior !== undefined) collector.invalidate();
    else host.inventoryE2eScalarCapture = collector;
}
export function scalarRoot(values: ScalarValues): number | undefined {
    if (collector === undefined) return undefined;
    const frame = collector.nextFrame();
    collector.record('root', { ...values, frame });
    return frame;
}
export function scalarRecord(frame: number | undefined, phase: ScalarPhase, values: ScalarValues = {}): void {
    if (collector !== undefined && frame !== undefined) collector.record(phase, { ...values, frame });
}
