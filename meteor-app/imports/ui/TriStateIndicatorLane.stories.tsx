/** Mock-only comparison proof with the tri-state indicator below fixed rail labels. */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './TriStateTagToggle.stories.css';
import './TriStateIndicatorLane.stories.css';

interface Props {
    initialState: TagFilterState;
}

const compactTags = ['Needs sorting', 'Needs repair', 'Fragile', 'Heavy', 'Camera', 'Hardware'];

const TriStateIndicatorLaneDemo = ({ initialState }: Props): React.ReactElement => {
    const [state, setState] = useState<TagFilterState>(initialState);
    const [otherStates, setOtherStates] = useState<Record<string, TagFilterState>>({});
    return (
        <main className="tri-demo tri-lane-demo" data-testid="tri-state-lane-proof">
            <section className="tri-demo-card" aria-label="Separate indicator lane demonstration">
                <p className="tri-demo-eyebrow">ALTERNATIVE · INDICATOR LANE</p>
                <h1>Words stay put. Indicator moves.</h1>
                <p className="tri-demo-intro">
                    Tap any rail position or use arrow keys. The small indicator travels below the fixed words.
                </p>
                <div className="tri-demo-stage tri-lane-stage">
                    <div className="tri-demo-tag">Example tag</div>
                    <TriStateTagToggle name="Example tag" state={state} onChange={setState} variant="lane" large />
                </div>
                <div className="tri-demo-actions" aria-label="Move the indicator">
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
                        Move to Off
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
                <h2 className="tri-lane-heading">At list size</h2>
                <div className="tri-lane-list" aria-label="Compact tag rows">
                    {compactTags.map((tag, index) => (
                        <div className="tri-lane-compact-row" key={tag}>
                            <span>{tag}</span>
                            <TriStateTagToggle
                                name={tag}
                                state={index === 0 ? state : otherStates[tag] ?? 'neutral'}
                                onChange={(value) => {
                                    if (index === 0) setState(value);
                                    else setOtherStates((values) => ({ ...values, [tag]: value }));
                                }}
                                variant="lane"
                            />
                        </div>
                    ))}
                </div>
                <p className="tri-demo-note">Comparison prototype only. No inventory app behavior changes.</p>
            </section>
        </main>
    );
};

const meta = {
    title: 'Prototypes/Tri-state Indicator Lane',
    component: TriStateIndicatorLaneDemo,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof TriStateIndicatorLaneDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { initialState: 'neutral' } };
export const Include: Story = { args: { initialState: 'include' } };
export const Exclude: Story = { args: { initialState: 'exclude' } };
