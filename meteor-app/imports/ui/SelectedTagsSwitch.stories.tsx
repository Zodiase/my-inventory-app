/** State stories for the shared catalog-view switch, separate from the composed filter page. */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { SelectedTagsSwitch } from './SelectedTagsSwitch';

const Example = ({ initialChecked, count }: { initialChecked: boolean; count: number }): React.ReactElement => {
    const [checked, setChecked] = useState(initialChecked);
    return (
        <div style={{ padding: 24 }}>
            <SelectedTagsSwitch checked={checked} count={count} onChange={setChecked} />
        </div>
    );
};

const meta = {
    title: 'UI/SelectedTagsSwitch',
    component: Example,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { initialChecked: false, count: 2 } };
export const On: Story = { args: { initialChecked: true, count: 2 } };
export const Empty: Story = { args: { initialChecked: false, count: 0 } };
