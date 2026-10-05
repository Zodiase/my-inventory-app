/**
 * Test-opt-in loading capture for the real application, disabled in production.
 * Profiler boundaries and a null lifecycle sibling observe commits without
 * adding hooks to existing components, changing getters, or scheduling updates.
 */
import { Meteor } from 'meteor/meteor';
import React, { Profiler, useEffect, type ReactElement, type ProfilerOnRenderCallback } from 'react';

import { createLoadingCapture, validCaptureCapability, type CaptureFrame } from './e2eLoadingEvidence';

type Capture = ReturnType<typeof createLoadingCapture>;
interface CaptureWindow {
    inventoryE2eLoadingCapability?: unknown;
    inventoryE2eLoadingBootstrap?: { enabled: boolean; epoch?: string };
    inventoryE2eLoadingCapture?: {
        epoch: string;
        collector: Capture;
        read: () => ReturnType<Capture['snapshot']>;
        stop: () => void;
    };
}
const host = globalThis as unknown as CaptureWindow;
const capability = host.inventoryE2eLoadingCapability;
const eligible = Meteor.isClient && Meteor.isDevelopment;
if (eligible && host.inventoryE2eLoadingBootstrap === undefined) {
    Object.defineProperty(host, 'inventoryE2eLoadingBootstrap', {
        value: Object.freeze({
            enabled: validCaptureCapability(capability),
            epoch: validCaptureCapability(capability) ? capability.epoch : undefined,
        }),
        configurable: false,
        writable: false,
    });
}
const enabled =
    eligible &&
    host.inventoryE2eLoadingBootstrap?.enabled === true &&
    validCaptureCapability({ schema: 1, epoch: host.inventoryE2eLoadingBootstrap.epoch });
const epoch = host.inventoryE2eLoadingBootstrap?.epoch;
// Module re-evaluation invalidates measurement rather than toggling the observer
// topology for a retained component. Only a new document starts a fresh capture.
const existing = enabled ? host.inventoryE2eLoadingCapture : undefined;
const collector = enabled
    ? existing?.collector ?? createLoadingCapture(epoch ?? 'document-unavailable', () => performance.now())
    : undefined;
if (collector !== undefined && enabled) {
    if (existing !== undefined) collector.markUnavailable('hot-reload');
    else
        host.inventoryE2eLoadingCapture = {
            epoch: epoch ?? 'document-unavailable',
            collector,
            read: () => collector.snapshot(),
            stop: () => {
                collector.stop();
            },
        };
}
export function captureRoot(
    token: object,
    values: Pick<CaptureFrame, 'tagsLoading' | 'allItemsLoading' | 'identitiesLoading'>
): CaptureFrame | undefined {
    if (collector === undefined) return undefined;
    const frame = { instance: collector.alias(token), rootFrame: collector.nextFrame(token), ...values };
    collector.record('root-render', frame);
    return frame;
}
export function captureRoute(
    root: CaptureFrame | undefined,
    decision: CaptureFrame['decision']
): CaptureFrame | undefined {
    if (collector === undefined || root === undefined) return undefined;
    const frame = { ...root, routeAttempt: collector.nextRouteAttempt(), decision };
    collector.record('route-attempt', frame);
    return frame;
}
export function captureChild(token: object): CaptureFrame | undefined {
    return collector !== undefined
        ? { instance: collector.alias(token), childFrame: collector.nextFrame(token) }
        : undefined;
}
export { recordExistingGetter } from './e2eLoadingEvidence';
function PassiveLifecycle({ instance }: { instance: string | undefined }): null {
    useEffect(() => {
        collector?.record('passive-mount', { instance });
        return () => {
            collector?.record('passive-unmount', { instance });
        };
    }, [instance]);
    return null;
}
export function captureTree(frame: CaptureFrame | undefined, element: ReactElement, child = false): ReactElement {
    if (collector === undefined || frame === undefined) return element;
    const snapshot = Object.freeze({ ...frame });
    if (child) collector.record('child-render', snapshot);
    // Type, id and keys stay constant; frame/decision is callback data, never a key.
    return (
        <Profiler
            id={child ? 'loading-capture-child' : 'loading-capture-route'}
            onRender={(...args: Parameters<ProfilerOnRenderCallback>) => {
                collector.record('commit', { ...snapshot, commitBatch: collector.batchFor(args[5]) });
            }}
        >
            {element}
            {child && <PassiveLifecycle instance={snapshot.instance} />}
        </Profiler>
    );
}
