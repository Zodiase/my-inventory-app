/**
 * Redacted, bounded render evidence for an explicitly opted-in E2E document.
 * Keeps recorder policy independent of React/Meteor so privacy and incomplete
 * capture behavior can be tested without evaluating application getters.
 */
export type CaptureDecision = 'root-loading' | 'contents' | 'invalid' | 'child-loading';
export type DescendantBoundary = 'grommet' | 'app-shell' | 'switch' | 'document-root';
export type CaptureBoundary = 'tags' | 'route-container' | 'search-scope' | 'contents-identity' | DescendantBoundary;
export type CapturePhase =
    | 'descendant-entry'
    | 'descendant-layout'
    | 'descendant-mount'
    | 'descendant-unmount'
    | 'root-created'
    | 'root-removed'
    | 'root-profiler-commit'
    | 'root-recoverable-error'
    | 'tracker-before'
    | 'tracker-after'
    | 'tree-start'
    | 'tree-end'
    | 'route-entry'
    | 'shell-commit'
    | 'root-render'
    | 'route-attempt'
    | 'child-render'
    | 'commit'
    | 'passive-mount'
    | 'passive-unmount';
export interface CaptureFrame {
    errorName?: 'Error' | 'TypeError' | 'ReferenceError' | 'RangeError' | 'SyntaxError' | 'other';
    boundary?: CaptureBoundary;
    instance?: string;
    rootFrame?: number;
    routeAttempt?: number;
    childFrame?: number;
    commitBatch?: number;
    decision?: CaptureDecision;
    tagsLoading?: boolean;
    allItemsLoading?: boolean;
    identitiesLoading?: boolean;
    items?: boolean;
    hoisted?: boolean;
    tags?: boolean;
    identities?: boolean;
}
export const captureLimits = Object.freeze({
    events: 200,
    aliases: 16,
    bytes: 131072,
    counter: 999999,
    maxElapsedMs: 86400000,
    metadataBytes: 4096,
});
const phases: CapturePhase[] = [
    'descendant-entry',
    'descendant-layout',
    'descendant-mount',
    'descendant-unmount',
    'root-created',
    'root-removed',
    'root-profiler-commit',
    'root-recoverable-error',
    'tracker-before',
    'tracker-after',
    'tree-start',
    'tree-end',
    'route-entry',
    'shell-commit',
    'root-render',
    'route-attempt',
    'child-render',
    'commit',
    'passive-mount',
    'passive-unmount',
];
const decisions: CaptureDecision[] = ['root-loading', 'contents', 'invalid', 'child-loading'];
const numeric = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= captureLimits.counter;
export function validCaptureCapability(value: unknown): value is { schema: 1; epoch: string } {
    const v = value as { schema?: unknown; epoch?: unknown } | undefined;
    return v?.schema === 1 && typeof v.epoch === 'string' && /^document-[a-f0-9]{16}$/u.test(v.epoch);
}
type CaptureEvent = CaptureFrame & { phase: CapturePhase; at: number; commitSequence?: number };
interface CaptureSnapshot {
    schema: string;
    documentEpoch: string;
    available: boolean;
    complete: boolean;
    reason?: string;
    stopped: boolean;
    dropped: number;
    aliasOverflow: number;
    byteOverflow: number;
    lastCommit?: CaptureEvent;
    lastShellCommit?: CaptureEvent;
    events: CaptureEvent[];
}
interface LoadingCapture {
    alias: (token: object) => string | undefined;
    nextFrame: (token: object) => number;
    batchFor: (commitTime: number) => number | undefined;
    nextRouteAttempt: () => number;
    record: (phase: CapturePhase, raw: CaptureFrame) => void;
    markUnavailable: (reason: 'hot-reload' | 'unsupported-commit') => void;
    snapshot: () => CaptureSnapshot;
    stop: () => void;
}
export function recordExistingGetter(
    frame: CaptureFrame | undefined,
    slot: 'items' | 'hoisted' | 'tags' | 'identities',
    getter: () => boolean
): boolean {
    const value = getter();
    if (frame !== undefined) frame[slot] = value;
    return value;
}
export function createLoadingCapture(
    epoch: string,
    clock: () => number,
    boundaries = false,
    descendants = false
): LoadingCapture {
    const aliases = new WeakMap<object, string>();
    const sequences = new WeakMap<object, number>();
    let aliasCount = 0;
    let dropped = 0;
    let aliasOverflow = 0;
    let byteOverflow = 0;
    let stopped = false;
    let unavailable: 'hot-reload' | 'unsupported-commit' | 'counter-overflow' | undefined = undefined;
    let routeAttempt = 0;
    let commitSequence = 0;
    let lastCommitTime: number | undefined = undefined;
    let commitBatch = 0;
    type Event = CaptureFrame & { phase: CapturePhase; at: number; commitSequence?: number };
    const events: Event[] = [];
    let lastCommit: Event | undefined = undefined;
    let lastShellCommit: Event | undefined = undefined;
    const alias = (token: object): string | undefined => {
        if (aliases.has(token)) return aliases.get(token);
        if (aliasCount === captureLimits.aliases) {
            aliasOverflow = Math.min(aliasOverflow + 1, captureLimits.counter);
            return undefined;
        }
        const id = `instance-${++aliasCount}`;
        aliases.set(token, id);
        return id;
    };
    const nextFrame = (token: object): number => {
        const previous = sequences.get(token) ?? 0;
        if (previous === captureLimits.counter) unavailable = 'counter-overflow';
        const next = Math.min(previous + 1, captureLimits.counter);
        sequences.set(token, next);
        return next;
    };
    const clean = (raw: CaptureFrame): CaptureFrame => {
        const out: CaptureFrame = {};
        if (
            boundaries &&
            [
                'tags',
                'route-container',
                'search-scope',
                'contents-identity',
                ...(descendants ? ['grommet', 'app-shell', 'switch', 'document-root'] : []),
            ].includes(raw.boundary ?? '')
        )
            out.boundary = raw.boundary;
        if (typeof raw.instance === 'string' && /^instance-([1-9]|1[0-6])$/u.test(raw.instance))
            out.instance = raw.instance;
        for (const key of ['rootFrame', 'routeAttempt', 'childFrame', 'commitBatch'] as const)
            if (numeric(raw[key])) out[key] = raw[key];
        if (raw.decision !== undefined && decisions.includes(raw.decision)) out.decision = raw.decision;
        for (const key of [
            'tagsLoading',
            'allItemsLoading',
            'identitiesLoading',
            'items',
            'hoisted',
            'tags',
            'identities',
        ] as const)
            if (typeof raw[key] === 'boolean') out[key] = raw[key];
        if (
            descendants &&
            raw.errorName !== undefined &&
            ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'other'].includes(raw.errorName)
        )
            out.errorName = raw.errorName;
        return out;
    };
    return {
        alias,
        nextFrame,
        batchFor(commitTime: number) {
            if (!Number.isFinite(commitTime)) {
                unavailable = 'unsupported-commit';
                return undefined;
            }
            if (lastCommitTime !== commitTime) {
                lastCommitTime = commitTime;
                if (commitBatch === captureLimits.counter) unavailable = 'counter-overflow';
                commitBatch = Math.min(commitBatch + 1, captureLimits.counter);
            }
            return commitBatch;
        },
        nextRouteAttempt() {
            if (routeAttempt === captureLimits.counter) unavailable = 'counter-overflow';
            routeAttempt = Math.min(routeAttempt + 1, captureLimits.counter);
            return routeAttempt;
        },
        record(phase: CapturePhase, raw: CaptureFrame) {
            if (stopped || unavailable !== undefined || !phases.includes(phase)) return;
            if (
                !descendants &&
                (phase.startsWith('descendant-') ||
                    ['root-created', 'root-removed', 'root-profiler-commit', 'root-recoverable-error'].includes(phase))
            )
                return;
            const at = clock();
            const event: Event = {
                ...clean(raw),
                phase,
                at: Number.isFinite(at) ? Math.max(0, Math.min(Math.round(at), captureLimits.maxElapsedMs)) : 0,
            };
            if (phase === 'commit' || phase === 'shell-commit') {
                if (commitSequence === captureLimits.counter) {
                    unavailable = 'counter-overflow';
                    return;
                }
                commitSequence = Math.min(commitSequence + 1, captureLimits.counter);
                event.commitSequence = commitSequence;
                if (phase === 'commit') lastCommit = event;
                else lastShellCommit = event;
            }
            events.push(event);
            if (events.length > captureLimits.events) {
                events.shift();
                dropped = Math.min(dropped + 1, captureLimits.counter);
            }
            while (JSON.stringify(events).length > captureLimits.bytes - captureLimits.metadataBytes) {
                events.shift();
                byteOverflow = Math.min(byteOverflow + 1, captureLimits.counter);
            }
        },
        markUnavailable(reason: 'hot-reload' | 'unsupported-commit') {
            unavailable = reason;
        },
        snapshot() {
            const reason =
                unavailable ??
                (aliasOverflow > 0
                    ? 'alias-overflow'
                    : dropped > 0 || byteOverflow > 0
                    ? 'overflow'
                    : lastCommit === undefined
                    ? 'no-completed-commit'
                    : undefined);
            return {
                schema: descendants
                    ? 'root-route-loading/v3'
                    : boundaries
                    ? 'root-route-loading/v2'
                    : 'root-route-loading/v1',
                documentEpoch: validCaptureCapability({ schema: 1, epoch }) ? epoch : 'document-unavailable',
                available: unavailable === undefined,
                complete: reason === undefined,
                reason,
                stopped,
                dropped,
                aliasOverflow,
                byteOverflow,
                lastCommit: lastCommit === undefined ? undefined : { ...lastCommit },
                ...(boundaries
                    ? { lastShellCommit: lastShellCommit === undefined ? undefined : { ...lastShellCommit } }
                    : {}),
                events: events.map((e) => ({ ...e })),
            };
        },
        stop() {
            stopped = true;
        },
    };
}
