/**
 * Interactive, read-only Storybook proof of framing, interruptions, and semantic
 * action dispatch. Synthetic resolution and fault controls are local to this view;
 * it has no application routes, household storage, or hardware setup side effects.
 */
import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import styled from 'styled-components';

import { TouchButton } from '../TouchButton';

import { commands, fixtures, initialState, reduce, retryBlockReason, type State, type Read } from './model';
import { ScannerActionWorkspace } from './ScannerActionWorkspace';
import { useCaptureSession } from './useCaptureSession';
/** Live guidance follows current action guards; resolver evidence stays factual. */
function recoveryGuidance(state: State, read: Read): string | undefined {
    if (read.outcome === 'pending' && read.epoch === state.epoch)
        return 'Wait for the result, or cancel this pending read.';
    if (read.outcome !== 'error') return undefined;
    const blocked = retryBlockReason(state, read);
    const correction = read.corrected
        ? 'Correction already marked.'
        : read.epoch === state.epoch
        ? 'Mark correction to flag this record.'
        : 'Record retained for review.';
    return `${blocked ?? 'Retry this failed read.'} ${correction}`;
}
const delays = { slow: 5000, orderSlots: 4, modulus: 3, step: 500, normal: 150, timeout: 3000 };
const jsonIndent = 2;
const Surface = styled.main`
    max-width: 960px;
    margin: auto;
    padding: 20px;
    color: #17283b;
    background: #f5f7fa;
    font:
        16px/1.5 system-ui,
        sans-serif;
    * {
        box-sizing: border-box;
    }
    h1 {
        font-size: 1.6em;
        margin: 0 0 8px;
    }
    h2 {
        font-size: 1.15em;
        margin: 0 0 8px;
    }
    p {
        margin: 8px 0;
    }
    section {
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 16px;
        margin: 16px 0;
    }
    input,
    select {
        width: 100%;
        min-height: 44px;
        font: inherit;
        padding: 8px;
        border: 1px solid #64748b;
        border-radius: 6px;
    }
    label {
        display: block;
        margin: 10px 0;
    }
    code {
        overflow-wrap: anywhere;
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
        outline: 3px solid #2563eb;
        outline-offset: 3px;
    }
    ul {
        list-style: none;
        padding: 0;
    }
    li {
        border-top: 1px solid #cbd5e1;
        padding: 12px 0;
        overflow-wrap: anywhere;
    }
    dialog {
        max-width: min(90vw, 500px);
    }
    @media (max-width: 480px) {
        padding: 12px;
        section {
            padding: 12px;
        }
    }
`;
const Controls = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
`;
export const ScannerFoundationProof = ({ actionCards = false }: { actionCards?: boolean }): ReactElement => {
    const { state, sink, send, action } = useCaptureSession(initialState, reduce);
    const dialog = useRef<HTMLDialogElement>(null);
    const [fault, setFault] = useState('normal');
    const [expected, setExpected] = useState('any');
    const expectation = useRef(expected);
    expectation.current = expected;
    const faults = useRef(fault);
    faults.current = fault;
    const scheduled = useRef(new Set<string>());
    const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const [calls, setCalls] = useState<string[]>([]);
    useEffect(() => {
        for (const read of state.reads) {
            const token = `${read.id}:${read.attempt}`;
            if (read.outcome !== 'pending' || scheduled.current.has(token)) continue;
            scheduled.current.add(token);
            setCalls((old) => [...old, token]);
            const mode = faults.current;
            const wrongKind = expectation.current !== 'any' && expectation.current !== read.kind;
            const delay =
                mode === 'slow'
                    ? delays.slow
                    : mode === 'reordered'
                    ? (delays.orderSlots - (read.sequence % delays.modulus)) * delays.step
                    : delays.normal;
            timers.current.push(
                setTimeout(
                    () => {
                        const fixture = fixtures[read.value];
                        send({
                            type: 'result',
                            id: read.id,
                            epoch: read.epoch,
                            attempt: read.attempt,
                            outcome:
                                wrongKind || mode === 'error' || mode === 'offline' || mode === 'timeout'
                                    ? 'error'
                                    : fixture === undefined
                                    ? 'unknown'
                                    : 'resolved',
                            detail: wrongKind
                                ? 'Wrong kind for synthetic workflow; classification retained, no action.'
                                : mode === 'normal' || mode === 'slow' || mode === 'reordered'
                                ? fixture?.name ?? 'No matching synthetic fixture. No owned identity inferred.'
                                : `Synthetic ${mode}. No inventory change.`,
                        });
                    },
                    mode === 'timeout' ? delays.timeout : delay
                )
            );
        }
    }, [state]);
    useEffect(
        () => () => {
            timers.current.forEach(clearTimeout);
        },
        []
    );
    const last = state.reads.at(-1);
    const captured = state.reads.filter((read) => read.kind !== 'invalid' && read.kind !== 'command');
    const readResults = (
        <section aria-label="Read results">
            <h2>Last outcome</h2>
            <p data-testid="last-outcome">
                {last === undefined ? 'No captures yet.' : `${last.id} · ${last.outcome} · ${last.detail}`}
            </p>
            {last !== undefined && recoveryGuidance(state, last) !== undefined && (
                <p data-testid="last-recovery-guidance">{recoveryGuidance(state, last)}</p>
            )}
            <p data-testid="counters">
                Captured {captured.length} · Pending {captured.filter((r) => r.outcome === 'pending').length} · Resolved{' '}
                {captured.filter((r) => r.outcome === 'resolved').length} · Rejected{' '}
                {state.reads.filter((r) => r.outcome === 'rejected').length} · Discarded{' '}
                {state.reads.filter((r) => r.outcome === 'discarded').length}
            </p>
            <details>
                <summary>Ordered capture evidence</summary>
                <ul>
                    {state.reads.map((read) => (
                        <li key={read.id} data-testid="read-record">
                            <strong>
                                {read.id} · {read.kind} · {read.outcome}
                            </strong>
                            <p>
                                <code>{JSON.stringify(read.value)}</code>
                            </p>
                            <p>
                                {read.detail} · {read.provenance} · attempt {read.attempt} · prior outcomes{' '}
                                {read.attempts.map((a) => a.outcome).join(', ')}
                                {read.corrected ? ' · marked for correction' : ''}
                            </p>
                            {recoveryGuidance(state, read) !== undefined && (
                                <p role="status" data-testid="read-recovery-guidance">
                                    {recoveryGuidance(state, read)}
                                </p>
                            )}
                            <Controls>
                                <TouchButton
                                    variant="secondary"
                                    disabled={retryBlockReason(state, read) !== undefined}
                                    onClick={() => {
                                        send({ type: 'retry', id: read.id });
                                    }}
                                >
                                    Retry
                                </TouchButton>
                                <TouchButton
                                    variant="secondary"
                                    disabled={read.outcome !== 'pending' || read.epoch !== state.epoch}
                                    onClick={() => {
                                        send({ type: 'cancel', id: read.id });
                                    }}
                                >
                                    Cancel
                                </TouchButton>
                                <TouchButton
                                    variant="secondary"
                                    disabled={read.corrected || read.epoch !== state.epoch}
                                    onClick={() => {
                                        send({ type: 'correct', id: read.id });
                                    }}
                                >
                                    Mark correction
                                </TouchButton>
                            </Controls>
                        </li>
                    ))}
                </ul>
            </details>
        </section>
    );
    const proofControls = (
        <section aria-label="Proof controls">
            <h2>Proof controls</h2>
            <label>
                Synthetic expected kind
                <select
                    value={expected}
                    onChange={(e) => {
                        setExpected(e.target.value);
                    }}
                >
                    {['any', 'item', 'container'].map((kind) => (
                        <option key={kind} value={kind}>
                            {kind}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Resolver fault
                <select
                    value={fault}
                    onChange={(e) => {
                        setFault(e.target.value);
                    }}
                >
                    <option value="normal">Normal fixture</option>
                    {['slow', 'reordered', 'error', 'offline', 'timeout'].map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Ordinary editing field
                <input
                    aria-label="Ordinary editing field"
                    placeholder="Scanner may type here while capture is paused"
                />
            </label>
            <Controls>
                <TouchButton
                    variant="secondary"
                    onClick={() => {
                        send({ type: 'pause', reason: 'Dialog opened. Resume explicitly after closing.' });
                        dialog.current?.showModal();
                    }}
                >
                    Open dialog
                </TouchButton>
                <TouchButton
                    variant="secondary"
                    onClick={() => {
                        send({
                            type: 'pause',
                            reason: 'Synthetic reconnect: transport not qualified. Resume explicitly.',
                        });
                    }}
                >
                    Simulate reconnect
                </TouchButton>
            </Controls>
            <dialog ref={dialog}>
                <h2>Capture paused</h2>
                <p>Closing this dialog does not resume capture.</p>
                <TouchButton
                    onClick={() => {
                        dialog.current?.close();
                    }}
                >
                    Close dialog
                </TouchButton>
            </dialog>
            <details>
                <summary>Exact synthetic fixtures and limits</summary>
                <ul>
                    {Object.keys(fixtures).map((code) => (
                        <li key={code}>
                            <code>{code}</code>
                        </li>
                    ))}
                </ul>
                <p>
                    512 characters/frame, 2 seconds inactivity cancellation, 8 pending, 100 records per temporary proof.
                    Refresh clears this temporary proof; nothing is replayed or saved to inventory.
                </p>
            </details>
        </section>
    );
    if (actionCards)
        return (
            <ScannerActionWorkspace
                state={state}
                onAction={action}
                diagnostics={
                    <>
                        {proofControls}
                        {readResults}
                        <pre data-testid="action-history">{JSON.stringify(state.actions, null, jsonIndent)}</pre>
                    </>
                }
                captureInput={
                    <input
                        ref={sink}
                        aria-label="Scanner input"
                        value={state.buffer}
                        readOnly={state.capture === 'off' || state.capture === 'paused'}
                        onChange={() => {
                            /* Native adapter owns framing. */
                        }}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                }
            />
        );
    return (
        <Surface>
            <h1>Scanner foundation</h1>
            <p>Synthetic proof · Enter delimiter · read-only fixtures · hardware not qualified</p>
            <section aria-label="Capture session">
                <h2>
                    Capture: <span data-testid="capture-state">{state.capture}</span>
                </h2>
                <p role="status">{state.reason}</p>
                <p>
                    Session {state.epoch} · Mode {state.mode}
                </p>
                <Controls>
                    <TouchButton
                        disabled={state.capture !== 'off'}
                        onClick={() => {
                            action('start');
                        }}
                    >
                        Start
                    </TouchButton>
                    <TouchButton
                        disabled={state.capture !== 'paused'}
                        onClick={() => {
                            action('resume');
                        }}
                    >
                        Resume
                    </TouchButton>
                    <TouchButton
                        disabled={state.capture === 'off'}
                        variant="secondary"
                        onClick={() => {
                            action('pause');
                        }}
                    >
                        Pause
                    </TouchButton>
                    <TouchButton
                        disabled={state.capture === 'off'}
                        variant="danger"
                        onClick={() => {
                            action('exit');
                        }}
                    >
                        Exit
                    </TouchButton>
                </Controls>
                <label>
                    Synthetic scan input
                    <input
                        ref={sink}
                        aria-label="Synthetic scan input"
                        value={state.buffer}
                        readOnly={state.capture === 'off' || state.capture === 'paused'}
                        onChange={() => {
                            /* Native adapter owns input framing. */
                        }}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                </label>
                <p>
                    Next:{' '}
                    {state.capture === 'off'
                        ? 'Start, then enter a fixture and press Enter.'
                        : state.capture === 'paused'
                        ? 'Resume to restore capture focus.'
                        : state.capture === 'draining'
                        ? 'Finish one discarded read with Enter; then scan again.'
                        : 'Enter one complete fixture; press Enter. Repeated reads stay separate.'}
                </p>
            </section>
            {readResults}
            <section aria-label="Synthetic actions">
                <h2>Tap / scan parity</h2>
                <p>
                    Action payload: <code>inventory-action:v1:verb</code>. Start and Resume require a local tap. Screen
                    scanning is unverified; this proof shows exact payload text.
                </p>
                <Controls>
                    {commands.map((value) => (
                        <TouchButton
                            key={value}
                            disabled={state.capture === 'off'}
                            variant="secondary"
                            onClick={() => {
                                action(value);
                            }}
                        >
                            {value}
                        </TouchButton>
                    ))}
                </Controls>
                <details>
                    <summary>Dispatch and resolver history</summary>
                    <pre data-testid="action-history" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {JSON.stringify(state.actions, null, jsonIndent)}
                    </pre>
                    <p data-testid="resolver-history">
                        Resolver calls: {calls.length === 0 ? 'none' : calls.join(', ')}
                    </p>
                </details>
            </section>
            {proofControls}
        </Surface>
    );
};
