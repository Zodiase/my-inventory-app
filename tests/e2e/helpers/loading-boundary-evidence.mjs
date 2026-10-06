/**
 * Validates v2/v3 render boundaries and records public browser error metadata.
 * Kept outside the app to reject private payloads at the test artifact boundary;
 * neither collector may execute application getters or serialize console handles.
 */
const phases = new Set([
    'descendant-entry',
    'descendant-layout',
    'descendant-mount',
    'descendant-unmount',
    'root-created',
    'root-removed',
    'root-profiler-commit',
    'root-recoverable-error',
    'root-render',
    'route-attempt',
    'child-render',
    'commit',
    'passive-mount',
    'passive-unmount',
    'tracker-before',
    'tracker-after',
    'tree-start',
    'tree-end',
    'route-entry',
    'shell-commit',
]);
const boundaries = new Set(['tags', 'route-container', 'search-scope', 'contents-identity']);
const descendantBoundaries = new Set(['grommet', 'app-shell', 'switch', 'document-root']);
const errorNames = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'other']);
const decisions = new Set(['root-loading', 'contents', 'invalid', 'child-loading']);
const booleans = ['tagsLoading', 'allItemsLoading', 'identitiesLoading', 'items', 'hoisted', 'tags', 'identities'];
const counts = ['rootFrame', 'routeAttempt', 'childFrame', 'commitBatch', 'commitSequence', 'at'];
const reasons = new Set([
    'hot-reload',
    'unsupported-commit',
    'counter-overflow',
    'alias-overflow',
    'overflow',
    'no-completed-commit',
]);
const integer = (v, max = 999999) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const positive = (v) => integer(v) && v > 0;
const instance = (v) => /^instance-([1-9]|1[0-6])$/u.test(v ?? '');
export function sanitizeBoundaryCapture(raw) {
    const descendants = raw?.schema === 'root-route-loading/v3';
    const allowedBoundaries = new Set([...boundaries, ...(descendants ? descendantBoundaries : [])]);
    let damaged = !/^document-[a-f0-9]{16}$/u.test(raw?.documentEpoch ?? '');
    const clean = (e) => {
        if (!phases.has(e?.phase)) {
            damaged = true;
            return undefined;
        }
        const out = { phase: e.phase };
        if (
            !integer(e.at, 86400000) ||
            (e.instance !== undefined && !instance(e.instance)) ||
            counts.some((k) => e[k] !== undefined && !integer(e[k], k === 'at' ? 86400000 : 999999)) ||
            booleans.some((k) => e[k] !== undefined && typeof e[k] !== 'boolean') ||
            (e.decision !== undefined && !decisions.has(e.decision)) ||
            (e.boundary !== undefined && !allowedBoundaries.has(e.boundary))
        )
            damaged = true;
        if (
            e.phase.startsWith('descendant-') &&
            (!descendants ||
                !descendantBoundaries.has(e.boundary) ||
                !instance(e.instance) ||
                (e.boundary !== 'document-root' && !positive(e.rootFrame)))
        )
            damaged = true;
        if (
            e.phase.startsWith('root-') &&
            ['root-created', 'root-removed', 'root-profiler-commit', 'root-recoverable-error'].includes(e.phase) &&
            (!descendants || e.boundary !== 'document-root')
        )
            damaged = true;
        if (['root-created', 'root-removed', 'root-profiler-commit'].includes(e.phase) && !instance(e.instance))
            damaged = true;
        if (e.phase === 'root-profiler-commit' && !positive(e.commitBatch)) damaged = true;
        if (e.phase === 'root-recoverable-error' && !errorNames.has(e.errorName)) damaged = true;
        if (e.errorName !== undefined && (!descendants || !errorNames.has(e.errorName))) damaged = true;
        const root = instance(e.instance) && positive(e.rootFrame);
        const child = instance(e.instance) && positive(e.childFrame);
        if (
            [
                'root-render',
                'tracker-before',
                'tracker-after',
                'tree-start',
                'tree-end',
                'route-entry',
                'shell-commit',
                'route-attempt',
            ].includes(e.phase) &&
            !root
        )
            damaged = true;
        if (e.phase === 'child-render' && !child) damaged = true;
        if (['tracker-before', 'tracker-after'].includes(e.phase) && !boundaries.has(e.boundary)) damaged = true;
        if (
            e.phase === 'route-attempt' &&
            (!positive(e.routeAttempt) || !['root-loading', 'contents', 'invalid'].includes(e.decision))
        )
            damaged = true;
        if (['commit', 'shell-commit'].includes(e.phase) && (!positive(e.commitBatch) || !positive(e.commitSequence)))
            damaged = true;
        if (
            e.phase === 'commit' &&
            !(
                (root && positive(e.routeAttempt) && ['root-loading', 'contents', 'invalid'].includes(e.decision)) ||
                (child && ['contents', 'child-loading'].includes(e.decision))
            )
        )
            damaged = true;
        if (instance(e.instance)) out.instance = e.instance;
        for (const k of counts) if (integer(e[k], k === 'at' ? 86400000 : 999999)) out[k] = e[k];
        for (const k of booleans) if (typeof e[k] === 'boolean') out[k] = e[k];
        if (decisions.has(e.decision)) out.decision = e.decision;
        if (allowedBoundaries.has(e.boundary)) out.boundary = e.boundary;
        if (descendants && errorNames.has(e.errorName)) out.errorName = e.errorName;
        return out;
    };
    const input = Array.isArray(raw?.events) ? raw.events : [];
    const events = input.slice(-200).map(clean).filter(Boolean);
    const lastCommit = raw?.lastCommit === undefined ? undefined : clean(raw.lastCommit);
    const lastShellCommit = raw?.lastShellCommit === undefined ? undefined : clean(raw.lastShellCommit);
    const latest = (phase) => events.findLast((e) => e.phase === phase);
    if (
        !Array.isArray(raw?.events) ||
        events.length !== Math.min(input.length, 200) ||
        ['available', 'complete', 'stopped'].some((k) => typeof raw?.[k] !== 'boolean') ||
        ['dropped', 'aliasOverflow', 'byteOverflow'].some((k) => !integer(raw?.[k])) ||
        (raw?.reason !== undefined && !reasons.has(raw.reason)) ||
        JSON.stringify(lastCommit) !== JSON.stringify(latest('commit')) ||
        JSON.stringify(lastShellCommit) !== JSON.stringify(latest('shell-commit'))
    )
        damaged = true;
    const extra = Math.max(0, input.length - 200);
    const overflow = extra > 0 || ['dropped', 'aliasOverflow', 'byteOverflow'].some((k) => raw?.[k] > 0);
    const reason = damaged
        ? 'invalid-capture'
        : (raw.reason ?? (overflow ? 'overflow' : lastCommit === undefined ? 'no-completed-commit' : undefined));
    return {
        schema: descendants ? 'root-route-loading/v3' : 'root-route-loading/v2',
        documentEpoch: /^document-[a-f0-9]{16}$/u.test(raw?.documentEpoch ?? '')
            ? raw.documentEpoch
            : 'document-unavailable',
        available: raw?.available === true,
        complete: raw?.available === true && raw.complete === true && reason === undefined,
        reason,
        stopped: raw?.stopped === true,
        events,
        lastCommit,
        lastShellCommit,
        dropped: Math.min((integer(raw?.dropped) ? raw.dropped : 0) + extra, 999999),
        aliasOverflow: integer(raw?.aliasOverflow) ? raw.aliasOverflow : 0,
        byteOverflow: integer(raw?.byteOverflow) ? raw.byteOverflow : 0,
    };
}
export const publicErrorLimits = Object.freeze({ events: 32, bytes: 8192 });
const names = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError']);
const levels = new Set(['error', 'warning']);
/** Unknown early errors remain unknown; linkage is never assigned retrospectively. */
export function createPublicErrorEvidence() {
    let navigation = 0,
        epoch,
        stopped = false,
        dropped = 0,
        unlinkedEvents = 0;
    const events = [];
    const alias = () => (navigation > 0 ? `navigation-${navigation}` : 'unknown');
    return {
        navigate() {
            if (!stopped) {
                navigation = Math.min(navigation + 1, 999999);
                epoch = undefined;
            }
        },
        navigation() {
            return alias();
        },
        link(navigationAtStart, candidate) {
            if (!stopped && navigationAtStart === alias() && /^document-[a-f0-9]{16}$/u.test(candidate ?? ''))
                epoch = candidate;
        },
        record(kind, value, elapsedMs) {
            if (stopped || !['pageerror', 'console'].includes(kind) || !integer(elapsedMs, 86400000)) return;
            if (kind === 'console' && !levels.has(value)) return;
            const event = {
                elapsedMs,
                navigation: alias(),
                documentEpoch: epoch ?? 'unknown',
                kind,
                ...(kind === 'console' ? { level: value } : { errorName: names.has(value) ? value : 'other' }),
            };
            if (epoch === undefined) unlinkedEvents = Math.min(unlinkedEvents + 1, 999999);
            events.push(event);
            while (
                events.length > publicErrorLimits.events ||
                Buffer.byteLength(JSON.stringify(events)) > publicErrorLimits.bytes
            ) {
                events.shift();
                dropped = Math.min(dropped + 1, 999999);
            }
        },
        stop() {
            stopped = true;
        },
        snapshot(finalSampleCompleted) {
            return {
                schema: 'public-browser-errors/v1',
                started: true,
                stopped,
                finalSampleCompleted: finalSampleCompleted === true,
                complete: stopped && finalSampleCompleted === true && dropped === 0,
                dropped,
                unlinkedEvents,
                events: structuredClone(events),
            };
        },
    };
}
