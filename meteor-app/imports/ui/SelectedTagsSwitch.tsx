/** Small reusable binary switch for narrowing a tag catalog without changing its filters. */
import React, { type ReactElement, type Ref } from 'react';

import './SelectedTagsSwitch.css';

interface SelectedTagsSwitchProps {
    checked: boolean;
    count: number;
    onChange: (checked: boolean) => void;
    inputRef?: Ref<HTMLInputElement>;
}

export const SelectedTagsSwitch = ({ checked, count, onChange, inputRef }: SelectedTagsSwitchProps): ReactElement => (
    <label className="selected-tags-switch">
        <span>Show selected only ({count})</span>
        <input
            ref={inputRef}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={count === 0}
            onChange={(event) => {
                onChange(event.target.checked);
            }}
        />
        <span className="selected-tags-switch-track" aria-hidden="true" />
    </label>
);
