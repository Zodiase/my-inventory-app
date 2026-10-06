/**
 * App and Storybook entry for a temporary, synthetic scanner move session.
 * Reuses capture and workspace layout; all resolution and moves stay in memory.
 * No inventory API or Meteor subscription is imported by this view.
 */
import React, { useEffect, useRef, useState, type ReactElement } from 'react';

import type { State } from './model';
import { demoFixtures, initialMoveState, reduceMove, itemA, itemB, containerA, containerB } from './moveSimulation';
import { actionCards, fixtureCards } from './qrCodes';
import { ScannerActionWorkspace } from './ScannerActionWorkspace';
import { useCaptureSession } from './useCaptureSession';

const lookupDelay = { normal: 150, slow: 2500 };
const diagnosticIndent = 2;
const modes = [
    ...actionCards,
    {
        label: 'Move simulation',
        description: 'Choose a container, then scan existing demo items.',
        action: 'move-demo' as const,
        payload: 'inventory-action:v1:move-demo',
    },
];
const codes = [
    fixtureCards[0],
    { label: 'Demo item B', description: 'Second synthetic owned instance', payload: itemB },
    { label: 'Demo shelf A', description: 'Synthetic destination', payload: containerA },
    { label: 'Demo shelf B', description: 'Alternative synthetic destination', payload: containerB },
    fixtureCards[2],
];
export function ScannerMoveDemo({ onLeave }: { onLeave?: () => void }): ReactElement {
    const { state, sink, send, action } = useCaptureSession(initialMoveState, reduceMove);
    const scheduled = useRef(new Set<string>());
    const [delay, setDelay] = useState('normal');
    useEffect(() => {
        const timers: Array<ReturnType<typeof setTimeout>> = [];
        for (const [id, intent] of Object.entries(state.intents)) {
            if (intent === undefined) continue;
            const key = `${id}:${intent.attempt}:${intent.generation}`;
            if (scheduled.current.has(key)) continue;
            scheduled.current.add(key);
            timers.push(
                setTimeout(
                    () => {
                        send({ type: 'resolve-simulation', id, ...intent, fail: delay === 'failure' });
                    },
                    delay === 'slow' ? lookupDelay.slow : lookupDelay.normal
                )
            );
        }
        // Keep pending timers across renders; cleanup only when this view unmounts.
        pendingTimers.current.push(...timers);
    }, [state.intents, delay, send]);
    const pendingTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    useEffect(
        () => () => {
            pendingTimers.current.forEach(clearTimeout);
        },
        []
    );
    const workflow = (
        <section aria-label="Move simulation">
            <h2>Move existing demo items</h2>
            <ul data-testid="simulated-locations">
                {[itemA, itemB].map((id) => (
                    <li key={id}>
                        {demoFixtures[id]?.name}: {demoFixtures[state.locations[id]]?.name ?? state.locations[id]}
                    </li>
                ))}
            </ul>
            <p data-testid="move-count">Simulated moves: {state.moves.length}</p>
            <details>
                <summary>Session results ({state.reads.length})</summary>
                <ol>
                    {state.reads.map((read) => (
                        <li key={read.id} data-testid="simulation-read">
                            {read.sequence}. {read.kind} · {read.outcome} · {read.detail}
                            <code> {read.value}</code>
                        </li>
                    ))}
                </ol>
            </details>
        </section>
    );
    return (
        <ScannerActionWorkspace
            state={state}
            onAction={action}
            heading="Scanner simulation"
            subtitle="Temporary demo · no household inventory changes"
            compactActions
            modeSelector={
                <label>
                    Choose mode
                    <select
                        aria-label="Choose mode"
                        value={state.mode}
                        disabled={state.capture === 'off'}
                        onChange={(event) => {
                            action(event.target.value as State['mode']);
                        }}
                    >
                        <option value="inspect-demo">Inspect demo</option>
                        <option value="move-demo">Move simulation</option>
                        <option value="show-actions">Show actions</option>
                    </select>
                </label>
            }
            sessionContent={
                <>
                    <p data-testid="destination">
                        Destination:{' '}
                        {state.destination !== undefined ? demoFixtures[state.destination]?.name : 'None selected'}
                    </p>
                    <p>
                        {state.mode === 'move-demo'
                            ? state.destination !== undefined
                                ? 'Next: scan a demo item, or another known destination container.'
                                : 'Next: scan a demo destination container.'
                            : 'Scan a demo identity, or choose a mode.'}
                    </p>
                </>
            }
            cards={modes}
            testCards={codes}
            workflow={workflow}
            navigation={
                onLeave !== undefined && (
                    <button style={{ minHeight: 44, font: 'inherit' }} onClick={onLeave}>
                        Leave simulation
                    </button>
                )
            }
            captureInput={
                <input
                    aria-label="Scanner capture input"
                    ref={sink}
                    value={state.buffer}
                    readOnly={state.capture === 'off' || state.capture === 'paused'}
                    onChange={() => undefined}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                />
            }
            diagnostics={
                <>
                    <label>
                        Manual note
                        <input aria-label="Manual note" />
                    </label>
                    <label>
                        Next lookup behavior
                        <select
                            aria-label="Next lookup behavior"
                            value={delay}
                            onChange={(event) => {
                                setDelay(event.target.value);
                            }}
                        >
                            <option value="normal">Normal</option>
                            <option value="slow">Delayed</option>
                            <option value="failure">Fail lookup</option>
                        </select>
                    </label>
                    <pre>
                        {JSON.stringify(
                            { generation: state.generation, locations: state.locations, moves: state.moves },
                            null,
                            diagnosticIndent
                        )}
                    </pre>
                </>
            }
        />
    );
}
