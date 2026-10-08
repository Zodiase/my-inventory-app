/**
 * Presents the scanner proof as a usable action-code screen rather than a debugger.
 * Real QR cards and equivalent taps share the supplied foundation dispatcher;
 * synthetic test identities are separated, and diagnostics remain optional.
 */
import React, { type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';

import { TouchButton } from '../TouchButton';

import type { Action, State } from './model';
import { actionCards, fixtureCards, qrImage } from './qrCodes';

const Frame = styled.main`
    max-width: 1100px;
    margin: auto;
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    background: #f5f7fa;
    color: #17283b;
    font:
        16px/1.5 system-ui,
        sans-serif;
    * {
        box-sizing: border-box;
    }
    h1 {
        font-size: 1.6em;
        margin: 0;
    }
    h2 {
        font-size: 1.15em;
        margin: 0 0 8px;
    }
    h3 {
        font-size: 1.1em;
        margin: 0;
    }
    p {
        margin: 8px 0;
    }
    section,
    details {
        margin-top: 20px;
    }
    input,
    select {
        font: inherit;
        min-height: 44px;
        max-width: 100%;
        padding: 8px;
        border: 1px solid #64748b;
        border-radius: 6px;
    }
    input {
        width: 100%;
    }
    button:focus-visible,
    input:focus-visible,
    summary:focus-visible {
        outline: 3px solid #2563eb;
        outline-offset: 3px;
    }
    summary {
        cursor: pointer;
        min-height: 44px;
        display: flex;
        align-items: center;
    }
    label {
        display: block;
    }
    pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    code {
        overflow-wrap: anywhere;
    }
    dialog {
        max-width: min(90vw, 500px);
    }

`;
const Workspace = styled.div`
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
    @media (max-width: 480px) { padding: 12px; }
`;
const Primary = styled.div<{ $compact?: boolean }>`
    display: grid;
    grid-template-columns: ${({ $compact }) => ($compact === true ? 'minmax(0, 1fr)' : '260px minmax(0, 1fr)')};
    gap: 20px;
    align-items: start;
    @media (max-width: 800px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;
const Session = styled.section`
    border: 1px solid #cbd5e1;
    background: white;
    border-radius: 12px;
    padding: 16px;
`;
const Buttons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0;
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: 16px;
`;
const Card = styled.article`
    min-width: 0;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: white;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    img {
        display: block;
        width: 224px;
        height: 224px;
        max-width: 100%;
        aspect-ratio: 1;
        object-fit: contain;
        background: white;
        scroll-margin-block: 4px;
    }
    button {
        margin-top: auto;
        min-width: 180px;
    }
    p {
        min-height: 24px;
    }
`;
const CaptureDock = styled.aside<{ $compactRecovery: boolean }>`
    min-width: 0;
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
    background: white;
    border-top: 2px solid #64748b;
    input { min-height: 44px; font-size: max(16px, 1em); }
    p { margin: 4px 0 0; height: ${({ $compactRecovery }) => ($compactRecovery ? 'auto' : '60px')}; overflow-y: ${({
    $compactRecovery,
}) => ($compactRecovery ? 'visible' : 'auto')}; overflow-wrap: anywhere; }
`;
const CaptureControls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    input { min-width: 0; flex: 1; }
    button { flex: none; }
`;
const RecoveryFooter = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    p { flex: 1; min-width: 0; }
    button { flex: none; min-width: 44px; min-height: 44px; }
`;
const diagnosticIndent = 2;
const names = { off: 'Off', ready: 'Ready', collecting: 'Reading', paused: 'Paused', draining: 'Recovering' };
export function ScannerActionWorkspace({
    state,
    onAction,
    captureInput,
    diagnostics,
    workflow,
    sessionContent,
    modeSelector,
    compactActions = false,
    heading = 'Scanner workspace',
    subtitle = 'Read-only demo · nothing is saved to inventory',
    navigation,
    compactRecovery = false,
    cards = actionCards,
    testCards = fixtureCards,
}: {
    state: State;
    onAction: (action: Action) => void;
    captureInput: ReactNode;
    diagnostics: ReactNode;
    workflow?: ReactNode;
    sessionContent?: ReactNode;
    modeSelector?: ReactNode;
    compactActions?: boolean;
    heading?: string;
    subtitle?: string;
    navigation?: ReactNode;
    compactRecovery?: boolean;
    cards?: ReadonlyArray<{ action: Action; label: string; payload: string; description: string }>;
    testCards?: ReadonlyArray<{ label: string; payload: string; description: string }>;
}): ReactElement {
    const last = state.reads.at(-1);
    const modeName =
        state.mode === 'inspect-demo' ? 'Inspect' : state.mode === 'move-demo' ? 'Move simulation' : 'Show actions';
    const next =
        state.capture === 'off'
            ? 'Tap Start to enable capture, then scan an action or a demo code.'
            : state.capture === 'paused'
            ? 'Tap Resume to restore capture. Returning to this page will not resume it.'
            : state.capture === 'draining'
            ? 'The next read clears an interrupted boundary and will be discarded. Then scan again.'
            : 'Scan an action card to change mode, or scan a demo code below.';
    const outcome =
        compactActions &&
        last !== undefined &&
        last.kind !== 'command' &&
        ['resolved', 'error', 'unknown'].includes(last.outcome)
            ? last.detail
            : last === undefined
            ? 'No demo codes read yet.'
            : last.kind === 'command'
            ? `Action selected: ${modeName}.`
            : last.outcome === 'resolved'
            ? `${last.detail}. Read-only demo result.`
            : last.outcome === 'pending'
            ? 'Reading demo code…'
            : last.outcome === 'discarded'
            ? 'Interrupted boundary cleared. Scan the code again.'
            : last.outcome === 'rejected'
            ? `Last read rejected. ${last.detail}`
            : last.outcome === 'cancelled'
            ? 'Previous read cancelled by a session change.'
            : last.outcome === 'unknown'
            ? 'No matching demo code. Try one of the synthetic test codes below.'
            : 'Demo lookup failed. Open diagnostics to review this read.';
    const recoveryFeedback =
        state.capture === 'paused'
            ? state.uncertain
                ? 'Paused. Resume; next read discarded.'
                : 'Paused. Resume to scan.'
            : state.capture === 'draining'
            ? 'Recovering. Next read discarded; then scan again.'
            : state.capture === 'off'
            ? 'Off. Start to scan.'
            : last === undefined
            ? `${names[state.capture]}. Scan a demo code.`
            : `${names[state.capture]}. Last read ${last.outcome}; details in session.`;
    return (
        <Frame>
            <Workspace data-testid="workspace-scroll">
                <h1>{heading}</h1>
                <p>{subtitle}</p>
                {!compactRecovery && navigation}
                <Primary $compact={compactActions}>
                    <Session aria-label="Capture session">
                        <h2>
                            Capture: <span data-testid="capture-state">{names[state.capture]}</span>
                        </h2>
                        <p data-testid="mode">Mode: {modeName}</p>
                        {modeSelector}
                        {sessionContent}
                        <Buttons>
                            <TouchButton
                                disabled={state.capture !== 'off'}
                                onClick={() => {
                                    onAction('start');
                                }}
                            >
                                Start
                            </TouchButton>
                            <TouchButton
                                disabled={state.capture === 'off'}
                                variant="secondary"
                                onClick={() => {
                                    onAction('pause');
                                }}
                            >
                                Pause
                            </TouchButton>
                            <TouchButton
                                disabled={state.capture === 'off'}
                                variant="danger"
                                onClick={() => {
                                    onAction('exit');
                                }}
                            >
                                Exit
                            </TouchButton>
                        </Buttons>
                        <p role="status">{compactRecovery && state.capture === 'paused' ? state.reason : next}</p>
                        <p role="status" data-testid="last-outcome">
                            {outcome}
                        </p>
                    </Session>
                    {compactActions ? (
                        <details open={state.mode === 'show-actions' || undefined}>
                            <summary>Show action QR codes</summary>{' '}
                            <section aria-label="Action codes">
                                <h2>Choose an action</h2>
                                <p>
                                    Scan the QR code, or tap its matching button. A tap that moves focus requires
                                    Resume.
                                </p>
                                <Grid>
                                    {cards.map((card) => (
                                        <Card key={card.action} data-testid="action-card">
                                            <h3>{card.label}</h3>
                                            <img
                                                alt={`${card.label} action QR code`}
                                                src={qrImage(card.payload)}
                                                data-payload={card.payload}
                                            />
                                            <p>{card.description}</p>
                                            <TouchButton
                                                disabled={state.capture === 'off'}
                                                variant="secondary"
                                                onClick={() => {
                                                    onAction(card.action);
                                                }}
                                            >
                                                {card.label}
                                            </TouchButton>
                                        </Card>
                                    ))}
                                </Grid>
                            </section>
                        </details>
                    ) : (
                        <section aria-label="Action codes">
                            <h2>Choose an action</h2>
                            <p>Scan the QR code, or tap its matching button. A tap that moves focus requires Resume.</p>
                            <Grid>
                                {cards.map((card) => (
                                    <Card key={card.action} data-testid="action-card">
                                        <h3>{card.label}</h3>
                                        <img
                                            alt={`${card.label} action QR code`}
                                            src={qrImage(card.payload)}
                                            data-payload={card.payload}
                                        />
                                        <p>{card.description}</p>
                                        <TouchButton
                                            disabled={state.capture === 'off'}
                                            variant="secondary"
                                            onClick={() => {
                                                onAction(card.action);
                                            }}
                                        >
                                            {card.label}
                                        </TouchButton>
                                    </Card>
                                ))}
                            </Grid>
                        </section>
                    )}
                </Primary>
                {workflow}
                <section aria-label="Synthetic test codes">
                    <h2>Synthetic test codes</h2>
                    <p>
                        These are demo identities, not your belongings. Product codes do not identify an owned instance.
                    </p>
                    <Grid>
                        {testCards.map((card) => (
                            <Card key={card.payload} data-testid="fixture-card">
                                <h3>{card.label}</h3>
                                <img
                                    alt={`${card.label} synthetic QR code`}
                                    src={qrImage(card.payload)}
                                    data-payload={card.payload}
                                />
                                <p>{card.description}</p>
                            </Card>
                        ))}
                    </Grid>
                </section>
                <p>Physical screen scanning has not been tested. No scanner settings codes are shown.</p>
                <details>
                    <summary>Developer diagnostics</summary>
                    <p>Raw text below stays in this temporary, read-only page. Refresh clears it.</p>
                    <pre data-testid="raw-capture">
                        {JSON.stringify({ buffer: state.buffer, lastRead: last?.value }, null, diagnosticIndent)}
                    </pre>
                    {diagnostics}
                </details>
            </Workspace>
            <CaptureDock aria-label="Scanner capture dock" $compactRecovery={compactRecovery}>
                {!compactRecovery && <div>Scanner input · {names[state.capture]}</div>}
                <CaptureControls>
                    {captureInput}
                    {state.capture === 'paused' && (
                        <TouchButton
                            onClick={() => {
                                onAction('resume');
                            }}
                        >
                            Resume
                        </TouchButton>
                    )}
                </CaptureControls>
                {compactRecovery ? (
                    <RecoveryFooter>
                        <p role="status" data-testid="dock-feedback">
                            {recoveryFeedback}
                        </p>
                        {navigation}
                    </RecoveryFooter>
                ) : (
                    <p role="status" data-testid="dock-feedback">
                        {state.capture === 'paused' || state.capture === 'draining'
                            ? `${state.reason} ${next}`
                            : outcome}
                    </p>
                )}
            </CaptureDock>
        </Frame>
    );
}
