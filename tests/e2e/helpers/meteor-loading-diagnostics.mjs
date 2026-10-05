/**
 * Captures bounded, redacted E2E subscription readiness and DDP control events.
 * This observer never subscribes, mutates application data, or retries assertions.
 * Only failed journeys attach evidence; payloads, arguments and URLs are excluded.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

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
    const sample = () => {
        if (stopped || pending) return;
        pending = page
            .evaluate(() => {
                const meteor = window.Meteor;
                if (!meteor?.connection?._subscriptions) return { available: false };
                const subscriptions = Object.entries(meteor.connection._subscriptions);
                return {
                    available: true,
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
            })
            .then((raw) => {
                if (!stopped) evidence.sample(raw, elapsed());
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
            const finalSample = sample() ?? pending;
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
            for (const { socket, received, sent } of sockets) {
                socket.off('framereceived', received);
                socket.off('framesent', sent);
            }
            if (['failed', 'timedOut'].includes(testInfo.status)) {
                const path = testInfo.outputPath('meteor-loading-diagnostics.json');
                await mkdir(dirname(path), { recursive: true });
                await writeFile(path, JSON.stringify({ ...evidence.snapshot(), finalSampleCompleted }), {
                    mode: 0o600,
                });
                await testInfo.attach('meteor-loading-diagnostics', { path, contentType: 'application/json' });
            }
        },
    };
}
