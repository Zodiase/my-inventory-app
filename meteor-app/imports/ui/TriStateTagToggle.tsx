/** A directly targetable three-position tag filter control shared by Storybook proofs. */
import React from 'react';
import './TriStateTagToggle.css';

export type TagFilterState = 'include' | 'neutral' | 'exclude';

interface Props {
    name: string;
    state: TagFilterState;
    onChange: (state: TagFilterState) => void;
    large?: boolean;
}

const positions: TagFilterState[] = ['include', 'neutral', 'exclude'];
const symbol: Record<TagFilterState, string> = { include: '+', neutral: '○', exclude: '−' };

export const TriStateTagToggle = ({ name, state, onChange, large = false }: Props): React.ReactElement => (
    <span
        className={'direct-tag-control tri-state-rail' + (large ? ' tri-state-rail-large' : '')}
        role="radiogroup"
        aria-label={'Filter ' + name}
        data-state={state}
    >
        <span className="tri-state-handle" aria-hidden="true">
            {symbol[state]}
        </span>
        {positions.map((position) => (
            <label key={position} className={'tri-state-position ' + position}>
                <input
                    type="radio"
                    name={'filter-' + name}
                    value={position}
                    checked={state === position}
                    aria-label={
                        (position === 'include' ? 'Include ' : position === 'exclude' ? 'Exclude ' : 'No filter for ') +
                        name
                    }
                    onChange={() => {
                        onChange(position);
                    }}
                />
                <span aria-hidden="true">{symbol[position]}</span>
            </label>
        ))}
    </span>
);
