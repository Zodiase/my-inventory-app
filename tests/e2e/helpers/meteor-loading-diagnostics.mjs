/**
 * Captures bounded, redacted E2E subscription readiness and DDP control events.
 * This observer never subscribes, mutates application data, or retries assertions.
 * Only failed journeys attach evidence; payloads, arguments and URLs are excluded.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { sanitizeBoundaryCapture, createPublicErrorEvidence } from './loading-boundary-evidence.mjs';

export const loadingDiagnosticTrace = 'retain-on-failure';

const publicationNames = new Set([
    'items.all',
    'items.byContainer',
    'items.byContainers',
    'tags.all',
    'inventory.identities',
]);
export const diagnosticLimits = Object.freeze({
    samples: 40,
    events: 100,
    subscriptions: 12,
    aliases: 64,
    sockets: 12,
    frameBytes: 8192,
});
const safeName = (name) => (publicationNames.has(name) ? name : 'other');
const boundedCount = (count) => (Number.isSafeInteger(count) && count >= 0 ? Math.min(count, 999) : 0);

export function sanitizeRenderCapture(raw) {
    if (raw?.schema === 'root-route-loading/v2') return sanitizeBoundaryCapture(raw);
    const unavailable = {
        schema: 'root-route-loading/v1',
        available: false,
        complete: false,
        reason: 'not-enabled',
        events: [],
    };
    if (raw?.schema !== 'root-route-loading/v1' || !/^document-[a-f0-9]{16}$/u.test(raw.documentEpoch ?? ''))
        return unavailable;
    let damagedEvent = false;
    const integer = (value, max = 999999) => Number.isSafeInteger(value) && value >= 0 && value <= max;
    const decisions = ['root-loading', 'contents', 'invalid', 'child-loading'];
    const numericFields = ['rootFrame', 'routeAttempt', 'childFrame', 'commitBatch', 'commitSequence', 'at'];
    const booleanFields = [
        'tagsLoading',
        'allItemsLoading',
        'identitiesLoading',
        'items',
        'hoisted',
        'tags',
        'identities',
    ];
    const cleanEvent = (event) => {
        if (
            !['root-render', 'route-attempt', 'child-render', 'commit', 'passive-mount', 'passive-unmount'].includes(
                event?.phase
            )
        )
            return undefined;
        if (
            (event.instance !== undefined && !/^instance-([1-9]|1[0-6])$/u.test(event.instance)) ||
            numericFields.some(
                (key) => event[key] !== undefined && !integer(event[key], key === 'at' ? 86400000 : 999999)
            ) ||
            booleanFields.some((key) => event[key] !== undefined && typeof event[key] !== 'boolean') ||
            (event.decision !== undefined && !decisions.includes(event.decision)) ||
            !integer(event.at, 86400000)
        )
            damagedEvent = true;
        if (event.phase === 'commit') {
            const route =
                integer(event.rootFrame) &&
                event.rootFrame > 0 &&
                integer(event.routeAttempt) &&
                event.routeAttempt > 0 &&
                ['root-loading', 'contents', 'invalid'].includes(event.decision);
            const child =
                integer(event.childFrame) &&
                event.childFrame > 0 &&
                ['child-loading', 'contents'].includes(event.decision);
            if (
                !/^instance-([1-9]|1[0-6])$/u.test(event.instance ?? '') ||
                !integer(event.commitSequence) ||
                event.commitSequence === 0 ||
                !integer(event.commitBatch) ||
                event.commitBatch === 0 ||
                !(route || child)
            )
                damagedEvent = true;
        }
        const out = { phase: event.phase };
        if (/^instance-([1-9]|1[0-6])$/u.test(event.instance ?? '')) out.instance = event.instance;
        for (const key of ['rootFrame', 'routeAttempt', 'childFrame', 'commitBatch', 'commitSequence', 'at'])
            if (Number.isSafeInteger(event[key]) && event[key] >= 0 && event[key] <= (key === 'at' ? 86400000 : 999999))
                out[key] = event[key];
        if (['root-loading', 'contents', 'invalid', 'child-loading'].includes(event.decision))
            out.decision = event.decision;
        for (const key of [
            'tagsLoading',
            'allItemsLoading',
            'identitiesLoading',
            'items',
            'hoisted',
            'tags',
            'identities',
        ])
            if (typeof event[key] === 'boolean') out[key] = event[key];
        return out;
    };
    const events = (Array.isArray(raw.events) ? raw.events : []).slice(-200).map(cleanEvent).filter(Boolean);
    const reasons = [
        'hot-reload',
        'unsupported-commit',
        'counter-overflow',
        'alias-overflow',
        'overflow',
        'no-completed-commit',
    ];
    const extraDropped = Math.max(0, (Array.isArray(raw.events) ? raw.events.length : 0) - 200);
    const lastCommit = cleanEvent(raw.lastCommit);
    const latestRetainedCommit = events.findLast((event) => event.phase === 'commit');
    const invalid =
        damagedEvent ||
        ['available', 'complete', 'stopped'].some((key) => typeof raw[key] !== 'boolean') ||
        ['dropped', 'aliasOverflow', 'byteOverflow'].some((key) => !integer(raw[key])) ||
        (lastCommit !== undefined && JSON.stringify(lastCommit) !== JSON.stringify(latestRetainedCommit)) ||
        !Array.isArray(raw.events) ||
        events.length !== Math.min(raw.events.length, 200) ||
        (raw.reason !== undefined && !reasons.includes(raw.reason));
    const overflow = extraDropped > 0 || ['dropped', 'aliasOverflow', 'byteOverflow'].some((key) => raw[key] > 0);
    const reason = invalid
        ? 'invalid-capture'
        : reasons.includes(raw.reason)
          ? raw.reason
          : overflow
            ? 'overflow'
            : lastCommit?.phase !== 'commit'
              ? 'no-completed-commit'
              : undefined;
    const out = {
        schema: raw.schema,
        documentEpoch: raw.documentEpoch,
        available: raw.available === true,
        complete: raw.available === true && raw.complete === true && reason === undefined,
        reason,
        stopped: raw.stopped === true,
        events,
        lastCommit,
    };
    for (const key of ['dropped', 'aliasOverflow', 'byteOverflow'])
        out[key] = Number.isSafeInteger(raw[key]) && raw[key] >= 0 ? Math.min(raw[key], 999999) : 0;
    out.dropped = Math.min(out.dropped + extraDropped, 999999);
    return out;
}

export function createLoadingEvidence() {
    const aliases = new Map();
    const names = new Map();
    const evidence = {
        schema: 'meteor-loading-diagnostics/v1',
        samples: [],
        events: [],
        droppedSamples: 0,
        droppedEvents: 0,
        ignoredFrames: 0,
        ignoredSockets: 0,
    };
    const alias = (id) => {
        if (typeof id !== 'string') return 'unknown';
        if (!aliases.has(id) && aliases.size < diagnosticLimits.aliases)
            aliases.set(id, `subscription-${aliases.size + 1}`);
        return aliases.get(id) ?? 'overflow';
    };
    const append = (key, value, limit, counter) => {
        evidence[key].push(value);
        if (evidence[key].length > limit) {
            evidence[key].shift();
            evidence[counter] += 1;
        }
    };
    return {
        ignoreSocket() {
            evidence.ignoredSockets += 1;
        },
        snapshot() {
            return structuredClone(evidence);
        },
        sample(raw, elapsedMs) {
            evidence.renderCapture = sanitizeRenderCapture(raw?.renderCapture);
            const subscriptions = (Array.isArray(raw?.subscriptions) ? raw.subscriptions : [])
                .slice(0, diagnosticLimits.subscriptions)
                .map((sub) => {
                    const id = alias(sub.id);
                    const name = safeName(sub.name);
                    names.set(id, name);
                    return {
                        id,
                        name,
                        ready: sub.ready === true,
                        inactive: sub.inactive === true,
                        parameterCount: boundedCount(sub.parameterCount),
                    };
                });
            append(
                'samples',
                {
                    elapsedMs,
                    available: raw?.available === true,
                    connected: raw?.connected === true,
                    loading: raw?.loading === true,
                    route: ['root', 'container', 'other'].includes(raw?.route) ? raw.route : 'unavailable',
                    ...(raw?.navigation === 'unknown' || /^navigation-[1-9][0-9]{0,5}$/u.test(raw?.navigation ?? '')
                        ? { navigation: raw.navigation }
                        : {}),
                    subscriptionCount: boundedCount(raw?.subscriptionCount),
                    subscriptions,
                },
                diagnosticLimits.samples,
                'droppedSamples'
            );
        },
        frame(payload, direction, elapsedMs) {
            if (typeof payload !== 'string' || Buffer.byteLength(payload, 'utf8') > diagnosticLimits.frameBytes) {
                evidence.ignoredFrames += 1;
                return;
            }
            let messages;
            try {
                const parsed = JSON.parse(payload.startsWith('a[') ? payload.slice(1) : payload);
                messages = Array.isArray(parsed) ? parsed.slice(0, diagnosticLimits.subscriptions) : [parsed];
            } catch {
                evidence.ignoredFrames += 1;
                return;
            }
            for (let message of messages) {
                try {
                    if (typeof message === 'string') message = JSON.parse(message);
                } catch {
                    continue;
                }
                if (message === null || typeof message !== 'object') continue;
                if (direction === 'sent' && message.msg === 'sub') {
                    const id = alias(message.id),
                        name = safeName(message.name);
                    names.set(id, name);
                    append('events', { elapsedMs, type: 'sub', id, name }, diagnosticLimits.events, 'droppedEvents');
                } else if (direction === 'sent' && message.msg === 'unsub') {
                    const id = alias(message.id);
                    append(
                        'events',
                        { elapsedMs, type: 'unsub', id, name: names.get(id) ?? 'other' },
                        diagnosticLimits.events,
                        'droppedEvents'
                    );
                } else if (direction === 'received' && message.msg === 'ready' && Array.isArray(message.subs)) {
                    for (const rawId of message.subs.slice(0, diagnosticLimits.subscriptions)) {
                        const id = alias(rawId);
                        append(
                            'events',
                            { elapsedMs, type: 'ready', id, name: names.get(id) ?? 'other' },
                            diagnosticLimits.events,
                            'droppedEvents'
                        );
                    }
                } else if (direction === 'received' && message.msg === 'nosub') {
                    const id = alias(message.id);
                    append(
                        'events',
                        {
                            elapsedMs,
                            type: 'nosub',
                            id,
                            name: names.get(id) ?? 'other',
                            errorPresent: message.error !== undefined,
                        },
                        diagnosticLimits.events,
                        'droppedEvents'
                    );
                }
            }
        },
    };
}

/** @param {import('@playwright/test').Page} page */
export function observeMeteorLoading(page) {
    const started = performance.now();
    const evidence = createLoadingEvidence();
    const publicErrors = createPublicErrorEvidence();
    const navigate = (frame) => {
        if (frame === page.mainFrame?.()) publicErrors.navigate();
    };
    const pageError = (error) => publicErrors.record('pageerror', error?.name, elapsed());
    const consoleError = (message) => publicErrors.record('console', message.type(), elapsed());
    page.on('framenavigated', navigate);
    page.on('pageerror', pageError);
    page.on('console', consoleError);
    const sockets = [];
    let stopped = false,
        pending;
    const elapsed = () => Math.round(performance.now() - started);
    const socketListener = (socket) => {
        if (sockets.length >= diagnosticLimits.sockets) {
            evidence.ignoreSocket();
            return;
        }
        const received = ({ payload }) => evidence.frame(payload, 'received', elapsed());
        const sent = ({ payload }) => evidence.frame(payload, 'sent', elapsed());
        socket.on('framereceived', received);
        socket.on('framesent', sent);
        sockets.push({ socket, received, sent });
    };
    page.on('websocket', socketListener);
    const sample = (finish = false) => {
        if (stopped || pending) return;
        const navigationAtStart = publicErrors.navigation();
        pending = page
            .evaluate(
                ({ finish }) => {
                    const capture = window.inventoryE2eLoadingCapture;
                    if (finish) capture?.stop?.();
                    const renderCapture = capture?.read?.();
                    const meteor = window.Meteor;
                    if (!meteor?.connection?._subscriptions) return { available: false, renderCapture };
                    const subscriptions = Object.entries(meteor.connection._subscriptions);
                    return {
                        available: true,
                        renderCapture,
                        connected: meteor.status().connected,
                        loading: document.querySelector('main')?.textContent?.includes('Loading…') === true,
                        route: location.pathname.startsWith('/container/')
                            ? 'container'
                            : location.pathname === '/' || location.pathname === '/items'
                              ? 'root'
                              : 'other',
                        subscriptionCount: subscriptions.length,
                        subscriptions: subscriptions.slice(0, 12).map(([id, sub]) => ({
                            id,
                            name: sub.name,
                            ready: sub.ready,
                            inactive: sub.inactive,
                            parameterCount: Array.isArray(sub.params) ? sub.params.length : 0,
                        })),
                    };
                },
                { finish }
            )
            .then((raw) => {
                if (!stopped) {
                    publicErrors.link(navigationAtStart, raw?.renderCapture?.documentEpoch);
                    evidence.sample(
                        {
                            ...raw,
                            navigation: navigationAtStart === publicErrors.navigation() ? navigationAtStart : 'unknown',
                        },
                        elapsed()
                    );
                    // Link only the document actually sampled, not a later navigation.
                }
            })
            .catch(() => {
                if (!stopped) evidence.sample({ available: false }, elapsed());
            })
            .finally(() => {
                pending = undefined;
            });
        return pending;
    };
    sample();
    const interval = setInterval(sample, 200);
    return {
        async finish(testInfo) {
            if (stopped) return;
            clearInterval(interval);
            // A stalled page must not turn evidence capture into another unbounded wait.
            const finalSample = Promise.resolve(pending).then(() => sample(true) ?? pending);
            let timeout,
                finalSampleCompleted = false;
            await Promise.race([
                Promise.resolve(finalSample).then(() => {
                    finalSampleCompleted = true;
                }),
                new Promise((resolve) => {
                    timeout = setTimeout(resolve, 500);
                }),
            ]);
            clearTimeout(timeout);
            stopped = true;
            page.off('websocket', socketListener);
            page.off('framenavigated', navigate);
            page.off('pageerror', pageError);
            page.off('console', consoleError);
            publicErrors.stop();
            for (const { socket, received, sent } of sockets) {
                socket.off('framereceived', received);
                socket.off('framesent', sent);
            }
            if (['failed', 'timedOut'].includes(testInfo.status)) {
                const path = testInfo.outputPath('meteor-loading-diagnostics.json');
                await mkdir(dirname(path), { recursive: true });
                const snapshot = evidence.snapshot();
                if (!finalSampleCompleted && snapshot.renderCapture !== undefined) {
                    snapshot.renderCapture = { ...snapshot.renderCapture, complete: false, reason: 'drain-timeout' };
                }
                await writeFile(
                    path,
                    JSON.stringify({
                        ...snapshot,
                        finalSampleCompleted,
                        publicErrors: publicErrors.snapshot(finalSampleCompleted),
                    }),
                    {
                        mode: 0o600,
                    }
                );
                await testInfo.attach('meteor-loading-diagnostics', { path, contentType: 'application/json' });
            }
        },
    };
}
