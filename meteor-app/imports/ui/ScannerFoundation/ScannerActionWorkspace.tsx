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

const Workspace = styled.main`
    max-width: 1100px;
    margin: auto;
    padding: 24px;
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
    @media (max-width: 480px) {
        padding: 12px;
    }
`;
const Primary = styled.div`
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
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
    }
    button {
        margin-top: auto;
        min-width: 180px;
    }
    p {
        min-height: 24px;
    }
`;
const names = { off: 'Off', ready: 'Ready', collecting: 'Reading', paused: 'Paused', draining: 'Recovering' };
export function ScannerActionWorkspace({
    state,
    onAction,
    captureInput,
    diagnostics,
}: {
    state: State;
    onAction: (action: Action) => void;
    captureInput: ReactNode;
    diagnostics: ReactNode;
}): ReactElement {
    const last = state.reads.at(-1);
    const modeName = state.mode === 'inspect-demo' ? 'Inspect' : 'Show actions';
    const next =
        state.capture === 'off'
            ? 'Tap Start to enable capture, then scan an action or a demo code.'
            : state.capture === 'paused'
              ? 'Tap Resume to restore capture. Returning to this page will not resume it.'
              : state.capture === 'draining'
                ? 'The next read clears an interrupted boundary and will be discarded. Then scan again.'
                : 'Scan an action card to change mode, or scan a demo code below.';
    const outcome =
        last === undefined
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
                      ? 'Read rejected. Follow the capture instructions above.'
                      : last.outcome === 'cancelled'
                        ? 'Previous read cancelled by a session change.'
                        : last.outcome === 'unknown'
                          ? 'No matching demo code. Try one of the synthetic test codes below.'
                          : 'Demo lookup failed. Open diagnostics to review this read.';
    return (
        <Workspace>
            <h1>Scanner workspace</h1>
            <p>Read-only demo · nothing is saved to inventory</p>
            <Primary>
                <Session aria-label="Capture session">
                    <h2>
                        Capture: <span data-testid="capture-state">{names[state.capture]}</span>
                    </h2>
                    <p data-testid="mode">Mode: {modeName}</p>
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
                            disabled={state.capture !== 'paused'}
                            onClick={() => {
                                onAction('resume');
                            }}
                        >
                            Resume
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
                    <p role="status">{next}</p>
                    <label>Scanner input{captureInput}</label>
                    <p role="status" data-testid="last-outcome">
                        {outcome}
                    </p>
                </Session>
                <section aria-label="Action codes">
                    <h2>Choose an action</h2>
                    <p>Scan the QR code, or tap its matching button. A tap that moves focus requires Resume.</p>
                    <Grid>
                        {actionCards.map((card) => (
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
            </Primary>
            <section aria-label="Synthetic test codes">
                <h2>Synthetic test codes</h2>
                <p>These are demo identities, not your belongings. Product codes do not identify an owned instance.</p>
                <Grid>
                    {fixtureCards.map((card) => (
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
                {diagnostics}
            </details>
        </Workspace>
    );
}
