/** Storybook scenarios for the compact logical-container projection. */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Heading } from 'grommet';
import React from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { HoistedContainerGroup } from '/imports/ui/HoistedContainerGroup';

const createdAt = new Date('2026-09-19T12:00:00Z');
const thirdFloor: InventoryItem = {
    _id: 'third-floor',
    name: 'Third floor',
    description: '',
    isContainer: true,
    containerId: 'headen-way-home',
    tagIds: [],
    createdAt,
    modifiedAt: createdAt,
};

const rooms: InventoryItem[] = [
    { _id: 'laundry-room', name: 'Laundry room', description: '', isContainer: true },
    { _id: 'main-bedroom', name: 'Main bedroom', description: 'Has its own bathroom', isContainer: true },
    {
        _id: 'secondary-bedroom',
        name: 'Secondary bedroom',
        description: 'Has its own bathroom',
        isContainer: true,
    },
].map((room) => ({
    ...room,
    containerId: thirdFloor._id,
    tagIds: [],
    createdAt,
    modifiedAt: createdAt,
}));

const meta: Meta<typeof HoistedContainerGroup> = {
    title: 'UI/HoistedContainerGroup',
    component: HoistedContainerGroup,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <Box pad="medium" background="background-back" fill>
                <Heading level={1} margin={{ top: 'none', bottom: 'small' }}>
                    Headen Way home
                </Heading>
                <Box width={{ max: '1100px' }}>
                    <Story />
                </Box>
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof HoistedContainerGroup>;

export const BorderLabel: Story = {
    args: { container: thirdFloor, items: rooms },
    parameters: {
        introduction:
            'A logical container is reduced to a lightweight border label while its three child locations remain directly accessible. Expect a compact single-row layout at desktop widths, consistent icon alignment whether or not a child has a description, and no layout shift when the label is hovered.',
    },
};

export const NarrowPhone: Story = {
    args: { container: thirdFloor, items: rooms },
    parameters: {
        introduction:
            'The same hoisted logical container at a narrow phone width. Expect the child locations to stack vertically without horizontal overflow while the border label remains compact and usable.',
        viewport: { defaultViewport: 'mobile1' },
    },
};
