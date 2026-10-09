/**
 * Test-opt-in loading capture for the real application, disabled in production.
 * Test-only stable observers distinguish descendant entry, layout commit and
 * root lifetime without adding hooks to existing components or scheduling updates.
 */
import { Meteor } from 'meteor/meteor';
import React, { Profiler, useEffect, useLayoutEffect, type ReactElement, type ProfilerOnRenderCallback } from 'react';

import {
    createLoadingCapture,
    validCaptureCapability,
    type CaptureFrame,
    type CaptureBoundary,
    type DescendantBoundary,
} from './e2eLoadingEvidence';

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
export const loadingCaptureEnabled = enabled;
const existing = enabled ? host.inventoryE2eLoadingCapture : undefined;
const collector = enabled
    ? existing?.collector ?? createLoadingCapture(epoch ?? 'document-unavailable', () => performance.now(), true, true)
    : undefined;
if (collector !== undefined && enabled) {
    if (existing !== undefined) collector.markUnavailable('hot-reload');
    else
        host.inventoryE2eLoadingCapture = {
            epoch: epoch ?? 'document-unavailable',
            collector,
            read: () => collector.snapshot(),
            stop: () => {
                stopRootObservation?.();
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

/** Fixed scalar boundaries never evaluate application values or schedule work. */
export function captureBoundary(
    frame: CaptureFrame | undefined,
    phase: 'tracker-before' | 'tracker-after' | 'tree-start' | 'tree-end' | 'route-entry',
    boundary?: CaptureBoundary
): void {
    if (collector !== undefined && frame !== undefined) collector.record(phase, { ...frame, boundary });
}
/** Observes only this shell subtree; descendant commits can reuse an older frame. */
export function captureShell(frame: CaptureFrame | undefined, element: ReactElement): ReactElement {
    if (collector === undefined || frame === undefined) return element;
    const frozen = Object.freeze({ ...frame });
    const onRender: ProfilerOnRenderCallback = (...args) => {
        collector.record('shell-commit', { ...frozen, commitBatch: collector.batchFor(args[5]) });
    };
    return (
        <Profiler id="loading-shell" onRender={onRender}>
            {element}
        </Profiler>
    );
}

/** Entry means this observer ran before its child, not that the child completed. */
function DescendantObserver({
    frame,
    boundary,
    children,
}: {
    frame: CaptureFrame;
    boundary: DescendantBoundary;
    children: ReactElement;
}): ReactElement {
    collector?.record('descendant-entry', { ...frame, boundary });
    useLayoutEffect(() => {
        collector?.record('descendant-layout', { ...frame, boundary });
    });
    useLayoutEffect(() => {
        collector?.record('descendant-mount', { ...frame, boundary });
        return () => {
            collector?.record('descendant-unmount', { ...frame, boundary });
        };
        // Lifetime follows stable observer identity; cleanup retains its mount frame.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return children;
}
export function captureDescendant(
    frame: CaptureFrame | undefined,
    boundary: DescendantBoundary,
    element: ReactElement
): ReactElement {
    if (collector === undefined || frame === undefined) return element;
    return (
        <DescendantObserver frame={Object.freeze({ ...frame })} boundary={boundary}>
            {element}
        </DescendantObserver>
    );
}
let stopRootObservation: (() => void) | undefined = undefined;
/** React18 supports recoverable errors only. Names are whitelisted; messages/stacks never retained. */
export function captureDocumentRoot(target: HTMLElement, element: ReactElement): ReactElement {
    if (collector === undefined) return element;
    const frame = { instance: collector.alias(target), boundary: 'document-root' as const };
    collector.record('root-created', frame);
    const observer = new MutationObserver(() => {
        if (!target.isConnected) {
            collector.record('root-removed', frame);
            observer.disconnect();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    stopRootObservation = () => {
        observer.disconnect();
    };
    return (
        <Profiler
            id="loading-document-root"
            onRender={(...args: Parameters<ProfilerOnRenderCallback>) => {
                collector.record('root-profiler-commit', { ...frame, commitBatch: collector.batchFor(args[5]) });
            }}
        >
            <DescendantObserver frame={frame} boundary="document-root">
                {element}
            </DescendantObserver>
        </Profiler>
    );
}
export function captureRecoverableError(error: unknown): void {
    if (collector === undefined) return;
    const names = ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError'];
    const name =
        error instanceof Error && names.includes(error.name)
            ? (error.name as NonNullable<CaptureFrame['errorName']>)
            : 'other';
    collector.record('root-recoverable-error', { boundary: 'document-root', errorName: name });
    // Keep React's default public reporting when supplying its callback.
    if (typeof reportError === 'function') reportError(error);
    else console.error(error);
}
