/**
 * Isolated states of the reusable row-actions control.
 * Keeps action availability and disabled semantics independently inspectable
 * from the mock inventory-list composition; callbacks never mutate app data.
 */
import type { Meta, StoryObj } from '@storybook/react';

import { ItemRowActions } from './ItemRowActions';

const noop = (): void => undefined;
const meta = {
    title: 'UI/ItemRowActions',
    component: ItemRowActions,
    args: { name: 'Example item', actions: [{ label: 'View Details', onClick: noop }] },
} satisfies Meta<typeof ItemRowActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {};
export const DisabledAction: Story = {
    args: {
        actions: [
            { label: 'View Details', onClick: noop },
            { label: 'Edit', disabled: true, onClick: noop },
        ],
    },
};
export const NoActions: Story = { args: { actions: [] } };
