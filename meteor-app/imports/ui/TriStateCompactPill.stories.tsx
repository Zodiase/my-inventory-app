/**
 * Storybook-only proof of the compact tag filter at actual list density.
 * Documents the design decisions and keeps each demo tag's selection independent.
 */
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
    const [exampleState, setExampleState] = useState<TagFilterState>(initialState);
    const [rowStates, setRowStates] = useState<Record<string, TagFilterState>>({
        [compactTags[0]]: initialState,
    });
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
                    <TriStateTagToggle
                        name="Example tag"
                        state={exampleState}
                        onChange={setExampleState}
                        variant="compact"
                    />
                </div>
                <h2 className="tri-lane-heading">Repeated rows</h2>
                <div className="tri-lane-list" aria-label="Compact tag rows">
                    {compactTags.map((tag) => (
                        <div className="tri-lane-compact-row" key={tag}>
                            <span>{tag}</span>
                            <TriStateTagToggle
                                name={tag}
                                state={rowStates[tag] ?? 'neutral'}
                                onChange={(value) => {
                                    setRowStates((values) => ({ ...values, [tag]: value }));
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
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'This is a Storybook-only design proof, not the running inventory app. Each tag has its own Include / Off / Exclude choice. The three fixed words and an unlabeled translucent thumb occupy the same vertical space so the control stays short within a normal list row; neutral is deliberately subdued. The large invisible hit areas preserve direct touch input without enlarging the visible pill. The featured tag and first list row start in the same state for comparison, but must change independently. Do not split labels and thumb into separate vertical lanes or enlarge the control for this showcase: that would hide the real repeated-row density. Measurements and review status: `docs/visual-review/tri-state-density-2026-09-29/CONTRACT.md`. Broader search behavior: `docs/SEARCH_INTERACTION_DESIGN.md`.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof TriStateCompactPillDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    args: { initialState: 'neutral' },
    parameters: {
        docs: {
            description: {
                story: 'Default, quiet state at actual list density. Try changing the featured tag and the first list row separately.',
            },
        },
    },
};
export const Include: Story = {
    args: { initialState: 'include' },
    parameters: {
        docs: {
            description: {
                story: 'Starts the featured tag and first list row at Include for visual comparison. Their selections are independent after interaction.',
            },
        },
    },
};
export const Exclude: Story = {
    args: { initialState: 'exclude' },
    parameters: {
        docs: {
            description: {
                story: 'Starts the featured tag and first list row at Exclude for visual comparison. Their selections are independent after interaction.',
            },
        },
    },
};
