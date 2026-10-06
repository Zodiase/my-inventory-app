/**
 * Preparation-only controlled App trigger: artificial identities observed readiness,
 * public computation lifecycle and an existing setter bridge. Not natural DDP proof.
 * No global scheduler patch, new React hook, installed mutation or route remount.
 */
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { flushSync } from 'react-dom';

import { validScalarCapability } from './e2eScalarEvidence';
export type ControlledVariant = 'equal-pending' | 'changed-state' | 'flush-first' | 'retained-pending';
interface Capability {
    schema: 1;
    epoch: string;
    variant: ControlledVariant;
}
interface ReadyHandle {
    ready: () => boolean;
}
interface Bridge {
    showFilterBuilder: boolean;
    setShowFilterBuilder: (value: boolean) => void;
    routeContainerId?: string;
}
interface Computation {
    firstRun: boolean;
    invalidated: boolean;
    stopped: boolean;
    onInvalidate: (fn: () => void) => void;
    onStop: (fn: () => void) => void;
}
interface Snapshot {
    schema: string;
    epoch: string;
    variant: ControlledVariant;
    complete: boolean;
    dropped: number;
    stopped: boolean;
    hotReload: boolean;
    gateOpen: boolean;
    primed: boolean;
    triggered: boolean;
    actualReady: Record<string, boolean>;
    renderedFilterBuilder: boolean | undefined;
    containerRoute: boolean;
    events: Array<Record<string, unknown>>;
}
interface Controller {
    read: () => Snapshot;
    observe: (name: string, ready: boolean, handle: ReadyHandle) => boolean;
    prime: () => void;
    trigger: () => void;
    drain: () => void;
    bind: (value: Bridge) => void;
    stop: () => void;
    invalidate: () => void;
}
const MAX_EVENTS = 200;
const variants = ['equal-pending', 'changed-state', 'flush-first', 'retained-pending'];
const names = ['tags.all', 'items.all', 'inventory.identities'];
const host = globalThis as unknown as {
    inventoryE2eControlledCapability?: unknown;
    inventoryE2eControlledBootstrap?: Readonly<{ enabled: boolean; capability?: Capability }>;
    inventoryE2eControlledApp?: Controller;
};
const eligible = Meteor.isClient && Meteor.isDevelopment;
const cap = host.inventoryE2eControlledCapability;
const valid = eligible && validScalarCapability(cap) && variants.includes((cap as Capability).variant);
if (eligible && host.inventoryE2eControlledBootstrap === undefined)
    Object.defineProperty(host, 'inventoryE2eControlledBootstrap', {
        value: Object.freeze({
            enabled: valid,
            capability: valid
                ? Object.freeze({ schema: 1, epoch: cap.epoch, variant: (cap as Capability).variant })
                : undefined,
        }),
        writable: false,
        configurable: false,
    });
export const controlledAppEnabled = eligible && host.inventoryE2eControlledBootstrap?.enabled === true;
function createController(capability: Capability): Controller {
    const dependency = new Tracker.Dependency();
    let open = false;
    let bridge: Bridge | undefined = undefined;
    let primed = false;
    let triggered = false;
    let stopped = false;
    let dropped = 0;
    let hotReload = false;
    const events: Array<Record<string, unknown>> = [];
    const aliases = new WeakMap<object, number>();
    const stopObserved = new WeakSet<object>();
    const handles = new Map<string, ReadyHandle>();
    const currentReady = (): Record<string, boolean> =>
        Object.fromEntries(Array.from(handles, ([name, handle]) => [name, handle.ready()]));
    let nextAlias = 0;
    const record = (phase: string, values: Record<string, unknown> = {}): void => {
        if (stopped) return;
        if (events.length >= MAX_EVENTS) {
            dropped++;
            return;
        }
        events.push({ sequence: events.length + 1, at: performance.now(), phase, ...values });
    };
    function observe(name: string, underlyingReady: boolean, handle: ReadyHandle): boolean {
        if (!names.includes(name)) throw new Error('Controlled fixed roots only');
        const c = Tracker.currentComputation as unknown as Computation | null;
        if (c === null) throw new Error('Reactive computation required');
        let alias = aliases.get(c);
        if (alias === undefined) {
            alias = ++nextAlias;
            aliases.set(c, alias);
        }
        if (!stopObserved.has(c)) {
            stopObserved.add(c);
            c.onStop(() => {
                record('stop', { name, computation: alias, invalidated: c.invalidated, stopped: c.stopped });
            });
        }
        c.onInvalidate(() => {
            record('invalidate', { name, computation: alias, invalidated: c.invalidated, stopped: c.stopped });
        });
        handles.set(name, handle);
        let observedReady = underlyingReady;
        if (name === 'inventory.identities') {
            dependency.depend();
            observedReady = underlyingReady && open;
        }
        record('subscription-read', {
            name,
            computation: alias,
            firstRun: c.firstRun,
            invalidated: c.invalidated,
            underlyingReady,
            observedReady,
        });
        return observedReady;
    }
    const read = (): Snapshot => ({
        schema: 'controlled-app/v1',
        epoch: capability.epoch,
        variant: capability.variant,
        complete: dropped === 0 && !hotReload,
        dropped,
        stopped,
        hotReload,
        gateOpen: open,
        primed,
        triggered,
        actualReady: currentReady(),
        renderedFilterBuilder: bridge?.showFilterBuilder,
        containerRoute: bridge?.routeContainerId !== undefined,
        events: events.map((e) => ({ ...e })),
    });
    const ensureRoots = (): Bridge => {
        if (bridge?.routeContainerId === undefined || !names.every((n) => currentReady()[n]))
            throw new Error('Real ready roots and container route required');
        return bridge;
    };
    const drain = (): void => {
        record('drain-start');
        flushSync(() => {
            Tracker.flush();
        });
        record('drain-end');
    };
    const prime = (): void => {
        const prior = ensureRoots();
        if (open || primed || bridge?.showFilterBuilder !== false) throw new Error('Invalid prime state');
        record('prime-setter', { site: 'filter-toggle', renderedValue: false, intendedValue: true });
        flushSync(() => {
            prior.setShowFilterBuilder(true);
        });
        if (read().renderedFilterBuilder !== true) throw new Error('Prime did not render changed state');
        primed = true;
        record('prime-complete');
    };
    const trigger = (): void => {
        const prior = ensureRoots();
        if (!primed || triggered || open || bridge?.showFilterBuilder !== true)
            throw new Error('Invalid trigger state');
        triggered = true;
        record('trigger-start');
        open = true;
        record('gate-release');
        dependency.changed();
        if (capability.variant === 'flush-first') drain();
        const value = capability.variant !== 'changed-state';
        record('trigger-setter', {
            site: 'filter-toggle',
            renderedValue: prior.showFilterBuilder,
            intendedValue: value,
        });
        flushSync(() => {
            prior.setShowFilterBuilder(value);
        });
        record('trigger-setter-return');
        drain();
        record('trigger-end');
    };
    return {
        read,
        observe,
        prime,
        trigger,
        drain,
        bind: (value: Bridge): void => {
            bridge = value;
            record('bridge-render', { showFilterBuilder: value.showFilterBuilder });
        },
        stop: (): void => {
            stopped = true;
        },
        invalidate: (): void => {
            hotReload = true;
        },
    };
}
const initialCapability = host.inventoryE2eControlledBootstrap?.capability;
if (controlledAppEnabled && initialCapability !== undefined) {
    if (host.inventoryE2eControlledApp !== undefined) host.inventoryE2eControlledApp.invalidate();
    else
        Object.defineProperty(host, 'inventoryE2eControlledApp', {
            value: createController(initialCapability),
            writable: false,
            configurable: false,
        });
}
export function observeReady(name: string, ready: boolean, handle: ReadyHandle): boolean {
    return controlledAppEnabled ? requireController().observe(name, ready, handle) : ready;
}
export function bindControlledApp(bridge: Bridge): void {
    if (controlledAppEnabled) requireController().bind(bridge);
}

function requireController(): Controller {
    if (host.inventoryE2eControlledApp === undefined) throw new Error('Controlled API missing');
    return host.inventoryE2eControlledApp;
}
