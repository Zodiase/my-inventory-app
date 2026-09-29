/** Isolated, mock-only motion proof for the three-position tag-filter handle. */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './TriStateTagToggle.stories.css';

interface Props {
    initialState: TagFilterState;
}

const meaning: Record<TagFilterState, string> = {
    include: 'Include matching items',
    neutral: 'Do not filter by this tag',
    exclude: 'Exclude matching items',
};

const TriStateToggleDemo = ({ initialState }: Props): React.ReactElement => {
    const [state, setState] = useState<TagFilterState>(initialState);
    return (
        <main className="tri-demo" data-testid="tri-state-toggle-proof">
            <section className="tri-demo-card" aria-label="Three-position tag toggle demonstration">
                <p className="tri-demo-eyebrow">TAG FILTER CONTROL · INTERACTION PROOF</p>
                <h1>One handle, three positions</h1>
                <p className="tri-demo-intro">
                    Tap a position on the rail, use the buttons below, or focus the control and use arrow keys.
                </p>
                <div className="tri-demo-stage">
                    <div className="tri-demo-tag">Needs sorting</div>
                    <TriStateTagToggle name="Needs sorting" state={state} onChange={setState} large />
                    <div className="tri-demo-legends" aria-hidden="true">
                        <span>Include</span>
                        <span>Undecided</span>
                        <span>Exclude</span>
                    </div>
                </div>
                <p className="tri-demo-state" aria-live="polite">
                    Current position:{' '}
                    <strong>{state === 'neutral' ? 'Undecided' : state === 'include' ? 'Include' : 'Exclude'}</strong>
                    <span>{meaning[state]}</span>
                </p>
                <div className="tri-demo-actions" aria-label="Move the handle">
                    <button
                        type="button"
                        onClick={() => {
                            setState('include');
                        }}
                    >
                        Move to Include
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setState('neutral');
                        }}
                    >
                        Move to Undecided
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setState('exclude');
                        }}
                    >
                        Move to Exclude
                    </button>
                </div>
                <p className="tri-demo-note">Mock control only. The handle's motion and shape are for visual review.</p>
            </section>
        </main>
    );
};

const meta = {
    title: 'Prototypes/Tri-state Tag Toggle',
    component: TriStateToggleDemo,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof TriStateToggleDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Undecided: Story = { args: { initialState: 'neutral' } };
export const Include: Story = { args: { initialState: 'include' } };
export const Exclude: Story = { args: { initialState: 'exclude' } };
