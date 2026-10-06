/** Shared source-test and planned App oracle: reject incomplete or reordered controlled evidence. */
import { stripVTControlCharacters } from 'node:util';
const requireEvidence = (condition, reason) => {
    if (!condition) throw new Error(`Invalid controlled evidence: ${reason}`);
};
export function verifyControlledChain(snapshot, variant) {
    requireEvidence(snapshot.complete === true && snapshot.dropped === 0 && snapshot.variant === variant, 'capture');
    const es = snapshot.events;
    requireEvidence(
        Array.isArray(es) &&
            es.every((e, i) => Number.isSafeInteger(e.sequence) && (i === 0 || e.sequence > es[i - 1].sequence)),
        'event sequence'
    );
    const one = (phase, after = -1) => {
        const found = es.filter((e) => e.phase === phase && e.sequence > after);
        requireEvidence(found.length === 1, phase);
        return found[0];
    };
    const release = one('gate-release'),
        end = one('trigger-end', release.sequence);
    const before = es
        .filter(
            (e) => e.phase === 'subscription-read' && e.name === 'inventory.identities' && e.sequence < release.sequence
        )
        .at(-1);
    requireEvidence(
        before?.underlyingReady === true && before?.observedReady === false && typeof before.computation === 'string',
        'pending identities'
    );
    const comp = before.computation;
    const invalidation = es.find(
        (e) => e.phase === 'invalidate' && e.computation === comp && e.sequence > release.sequence
    );
    requireEvidence(invalidation?.invalidated === true && invalidation?.stopped === false, 'live invalidation');
    const setter = one('trigger-setter', release.sequence),
        setterReturn = one('trigger-setter-return', setter.sequence);
    requireEvidence(
        setter.renderedValue === true && setter.intendedValue === (variant !== 'changed-state'),
        'setter value'
    );
    const drains = es.filter(
        (e) => e.phase === 'drain-start' && e.sequence > release.sequence && e.sequence < end.sequence
    );
    const drainEnds = es.filter(
        (e) => e.phase === 'drain-end' && e.sequence > release.sequence && e.sequence < end.sequence
    );
    const flushFirst = variant === 'flush-first';
    requireEvidence(drains.length === (flushFirst ? 2 : 1) && drainEnds.length === drains.length, 'drain count');
    requireEvidence(
        drains.every(
            (d, i) => d.sequence < drainEnds[i].sequence && (i === 0 || drainEnds[i - 1].sequence < d.sequence)
        ),
        'drain bounds'
    );
    const drain = drains[0],
        drainEnd = drainEnds[0];
    const ordered = (...events) =>
        requireEvidence(
            events.every((e, i) => e !== undefined && (i === 0 || events[i - 1].sequence < e.sequence)),
            'variant lifecycle order'
        );
    const stops = es.filter((e) => e.phase === 'stop' && e.computation === comp && e.sequence > release.sequence);
    if (variant === 'retained-pending') {
        requireEvidence(stops.length === 0, 'retained computation stopped');
        const ready = es.find(
            (e) =>
                e.phase === 'subscription-read' &&
                e.name === 'inventory.identities' &&
                e.computation === comp &&
                e.underlyingReady === true &&
                e.observedReady === true &&
                e.firstRun === false &&
                e.sequence > drain.sequence &&
                e.sequence < drainEnd.sequence
        );
        ordered(release, invalidation, setter, setterReturn, drain, ready, drainEnd, end);
    } else {
        requireEvidence(
            stops.length === 1 && stops[0].stopped === true && stops[0].invalidated === true,
            'old computation stop'
        );
        const stop = stops[0];
        const ready = es.find(
            (e) =>
                e.phase === 'subscription-read' &&
                e.name === 'inventory.identities' &&
                e.computation !== comp &&
                e.underlyingReady === true &&
                e.observedReady === true &&
                e.firstRun === true &&
                e.sequence > stop.sequence &&
                e.sequence < (flushFirst ? drainEnd.sequence : drain.sequence)
        );
        if (flushFirst)
            ordered(
                release,
                invalidation,
                drain,
                stop,
                ready,
                drainEnd,
                setter,
                setterReturn,
                drains[1],
                drainEnds[1],
                end
            );
        else ordered(release, invalidation, setter, stop, ready, setterReturn, drain, drainEnd, end);
    }
}

/** Accept only the original positive heading assertion timeout plus clean public errors and final Loading. */
export function verifyControlledTimeout({
    error,
    elapsedMs,
    headingLocator,
    finalLoading,
    finalHeading,
    pageClosed,
    publicErrors,
}) {
    const result = error?.matcherResult;
    const message = error instanceof Error ? stripVTControlCharacters(error.message) : '';
    requireEvidence(
        error instanceof Error &&
            result?.name === 'toBeVisible' &&
            result.pass === false &&
            result.expected === 'visible' &&
            result.timeout === 5000 &&
            ['hidden', '<element(s) not found>'].includes(result.actual),
        'specific visibility timeout'
    );
    requireEvidence(
        typeof headingLocator === 'string' &&
            headingLocator.includes("getByRole('heading', { name: 'Living room', exact: true })") &&
            message.includes(headingLocator) &&
            /expect\(locator\)\.toBeVisible/.test(message) &&
            !/closed|crash|transport|disconnected/i.test(message),
        'heading assertion identity'
    );
    requireEvidence(
        elapsedMs >= 4900 && pageClosed === false && finalLoading === true && finalHeading === false,
        'final Loading reconciliation'
    );
    requireEvidence(
        publicErrors?.schema === 'public-browser-errors/v1' &&
            publicErrors.started === true &&
            publicErrors.stopped === true &&
            publicErrors.finalSampleCompleted === true &&
            publicErrors.complete === true &&
            publicErrors.dropped === 0 &&
            publicErrors.unlinkedEvents === 0 &&
            Array.isArray(publicErrors.events) &&
            publicErrors.events.length === 0,
        'public errors reconciliation'
    );
}
