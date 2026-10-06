/**
 * Bounded scalar-only render evidence, independent of React and Tracker.
 * Records existing control-flow scalars; never inspects state queues or computations.
 */
export type ScalarPhase = 'root' | 'return' | 'route-entry' | 'route-decision' | 'setter-call';
export interface ScalarValues {
    frame?: number;
    tagsLoading?: boolean;
    allItemsLoading?: boolean;
    identitiesLoading?: boolean;
    sameAsRendered?: boolean;
    decision?: 'root-loading' | 'contents' | 'invalid';
    site?: 'route-sync' | 'root-clear' | 'container-valid' | 'container-invalid';
}
export function validScalarCapability(raw: unknown): raw is { schema: 1; epoch: string } {
    const value = raw as { schema?: unknown; epoch?: unknown } | undefined;
    return value?.schema === 1 && typeof value.epoch === 'string' && /^document-[a-f0-9]{16}$/u.test(value.epoch);
}
type ScalarEvent = ScalarValues & { phase: ScalarPhase; at: number };
interface ScalarSnapshot {
    schema: string;
    epoch: string;
    complete: boolean;
    reason?: string;
    stopped: boolean;
    dropped: number;
    events: ScalarEvent[];
}
interface ScalarEvidence {
    nextFrame: () => number;
    record: (phase: ScalarPhase, raw: ScalarValues) => void;
    invalidate: () => void;
    stop: () => void;
    read: () => ScalarSnapshot;
}
const bounds = Object.freeze({ counter: 999999, elapsed: 86400000, events: 200 });
export function createScalarEvidence(epoch: string, clock: () => number): ScalarEvidence {
    const events: ScalarEvent[] = [];
    let frame = 0;
    let dropped = 0;
    let stopped = false;
    let unavailable: 'hot-reload' | 'counter-overflow' | undefined = undefined;
    return {
        nextFrame() {
            if (frame === bounds.counter) unavailable = 'counter-overflow';
            return (frame = Math.min(frame + 1, bounds.counter));
        },
        record(phase: ScalarPhase, raw: ScalarValues) {
            if (stopped || unavailable !== undefined) return;
            if (!['root', 'return', 'route-entry', 'route-decision', 'setter-call'].includes(phase)) return;
            const clean: ScalarValues = {};
            if (Number.isInteger(raw.frame) && raw.frame !== undefined && raw.frame > 0 && raw.frame <= bounds.counter)
                clean.frame = raw.frame;
            for (const key of ['tagsLoading', 'allItemsLoading', 'identitiesLoading', 'sameAsRendered'] as const)
                if (typeof raw[key] === 'boolean') clean[key] = raw[key];
            if (['root-loading', 'contents', 'invalid'].includes(raw.decision ?? '')) clean.decision = raw.decision;
            if (['route-sync', 'root-clear', 'container-valid', 'container-invalid'].includes(raw.site ?? ''))
                clean.site = raw.site;
            const now = clock();
            events.push({
                phase,
                ...clean,
                at: Number.isFinite(now) ? Math.max(0, Math.min(bounds.elapsed, Math.round(now))) : 0,
            });
            if (events.length > bounds.events) {
                events.shift();
                dropped = Math.min(dropped + 1, bounds.counter);
            }
        },
        invalidate() {
            unavailable = 'hot-reload';
        },
        stop() {
            stopped = true;
        },
        read() {
            return {
                schema: 'root-route-scalar/v1',
                epoch,
                complete: unavailable === undefined && dropped === 0,
                reason: unavailable ?? (dropped > 0 ? 'event-overflow' : undefined),
                stopped,
                dropped,
                events: events.map((event) => ({ ...event })),
            };
        },
    };
}
