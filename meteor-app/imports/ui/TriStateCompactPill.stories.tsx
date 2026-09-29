/** Mock-only proof of a compact tri-state pill with fixed labels and an overlaid thumb. */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './TriStateTagToggle.stories.css';
import './TriStateCompactPill.stories.css';

interface Props {
    initialState: TagFilterState;
}

const compactTags = ['Needs sorting', 'Needs repair', 'Fragile', 'Heavy', 'Camera', 'Hardware'];

const TriStateCompactPillDemo = ({ initialState }: Props): React.ReactElement => {
    const [state, setState] = useState<TagFilterState>(initialState);
    const [otherStates, setOtherStates] = useState<Record<string, TagFilterState>>({});
    return (
        <main className="tri-demo tri-lane-demo" data-testid="tri-state-lane-proof">
            <section className="tri-demo-card" aria-label="Separate indicator lane demonstration">
                <p className="tri-demo-eyebrow">THREE-POSITION TAG FILTER</p>
                <h1>One control per tag</h1>
                <p className="tri-demo-intro">
                    Choose Include, Off, or Exclude directly. The thumb moves over fixed words.
                </p>
                <div className="tri-lane-stage" aria-label="Interactive tag row">
                    <span>Example tag</span>
                    <TriStateTagToggle name="Example tag" state={state} onChange={setState} variant="compact" />
                </div>
                <h2 className="tri-lane-heading">Repeated rows</h2>
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
                                variant="compact"
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
    title: 'Prototypes/Tri-state Compact Pill',
    component: TriStateCompactPillDemo,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof TriStateCompactPillDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { initialState: 'neutral' } };
export const Include: Story = { args: { initialState: 'include' } };
export const Exclude: Story = { args: { initialState: 'exclude' } };
