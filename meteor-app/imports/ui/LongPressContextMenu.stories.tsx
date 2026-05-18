import type { Meta, StoryObj } from '@storybook/react';
import { Box, Card, CardBody, Text } from 'grommet';
import { Edit, Trash, Copy, Share, Up, Down } from 'grommet-icons';
import React from 'react';

import { LongPressContextMenu } from './LongPressContextMenu';

/**
 * LongPressContextMenu provides iOS-style context menus on long-press.
 *
 * Key features:
 * - 500ms long-press activation (iOS standard)
 * - Visual feedback during press (scale animation)
 * - Backdrop dismissal
 * - 44px minimum touch targets for menu items
 * - Keyboard support (Escape to close)
 * - Cancels on movement (scroll detection)
 * - Haptic feedback simulation
 */
const meta = {
    title: 'UI/LongPressContextMenu',
    component: LongPressContextMenu,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'LongPressContextMenu component with iOS-style long-press interaction. Press and hold any element for 500ms to reveal a context menu with touch-friendly actions.',
            },
        },
    },
    argTypes: {
        pressDuration: {
            control: { type: 'range', min: 100, max: 2000, step: 100 },
            description: 'Duration in milliseconds before menu appears',
        },
        moveThreshold: {
            control: { type: 'range', min: 5, max: 50, step: 5 },
            description: 'Movement threshold in pixels to cancel press',
        },
    },
} satisfies Meta<typeof LongPressContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic context menu with common actions
 */
export const Basic: Story = {
    args: {
        children: <div>Press and hold</div>,
        actions: [
            {
                label: 'Edit',
                icon: <Edit />,
                onClick: () => {
                    alert('Edit clicked');
                },
            },
            {
                label: 'Duplicate',
                icon: <Copy />,
                onClick: () => {
                    alert('Duplicate clicked');
                },
            },
            {
                label: 'Delete',
                icon: <Trash />,
                onClick: () => {
                    alert('Delete clicked');
                },
                variant: 'danger',
            },
        ],
    },
    render: (args) => (
        <Box pad="large" background="light-2" height="medium" justify="center" align="center">
            <LongPressContextMenu {...args}>
                <Card background="white" pad="medium" elevation="small">
                    <CardBody>
                        <Text size="large" weight="bold">
                            Press and Hold Me
                        </Text>
                        <Text size="small" color="dark-6">
                            (Hold for 500ms to show menu)
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Item card with context menu - typical use case
 */
export const ItemCard: Story = {
    args: { children: <div />, actions: [] },
    render: () => (
        <Box pad="large" background="light-2" gap="medium">
            <LongPressContextMenu
                actions={[
                    {
                        label: 'View Details',
                        onClick: () => {
                            alert('View details');
                        },
                    },
                    {
                        label: 'Edit Item',
                        icon: <Edit />,
                        onClick: () => {
                            alert('Edit item');
                        },
                    },
                    {
                        label: 'Move Up',
                        icon: <Up />,
                        onClick: () => {
                            alert('Move up');
                        },
                    },
                    {
                        label: 'Move Down',
                        icon: <Down />,
                        onClick: () => {
                            alert('Move down');
                        },
                    },
                    {
                        label: 'Share',
                        icon: <Share />,
                        onClick: () => {
                            alert('Share');
                        },
                    },
                    {
                        label: 'Delete',
                        icon: <Trash />,
                        onClick: () => {
                            alert('Delete');
                        },
                        variant: 'danger',
                    },
                ]}
            >
                <Card background="white" pad="medium" elevation="small" width="medium">
                    <CardBody gap="small">
                        <Text size="large" weight="bold">
                            Sample Inventory Item
                        </Text>
                        <Text size="small" color="dark-6">
                            Location: Storage Room A
                        </Text>
                        <Text size="small" color="dark-6">
                            Quantity: 5
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Multiple items with individual context menus
 */
export const MultipleItems: Story = {
    args: { children: <div />, actions: [] },
    render: () => {
        const items = [
            { id: 1, name: 'Item One', location: 'Shelf A' },
            { id: 2, name: 'Item Two', location: 'Shelf B' },
            { id: 3, name: 'Item Three', location: 'Shelf C' },
        ];

        return (
            <Box pad="large" background="light-2" gap="medium">
                {items.map((item) => (
                    <LongPressContextMenu
                        key={item.id}
                        actions={[
                            {
                                label: 'Edit',
                                icon: <Edit />,
                                onClick: () => {
                                    alert(`Edit ${item.name}`);
                                },
                            },
                            {
                                label: 'Delete',
                                icon: <Trash />,
                                onClick: () => {
                                    alert(`Delete ${item.name}`);
                                },
                                variant: 'danger',
                            },
                        ]}
                    >
                        <Card background="white" pad="small" elevation="small" width="medium">
                            <CardBody direction="row" justify="between">
                                <Text weight="bold">{item.name}</Text>
                                <Text size="small" color="dark-6">
                                    {item.location}
                                </Text>
                            </CardBody>
                        </Card>
                    </LongPressContextMenu>
                ))}
            </Box>
        );
    },
};

/**
 * Context menu with disabled actions
 */
export const DisabledActions: Story = {
    args: {
        children: <div>Press and hold</div>,
        actions: [
            {
                label: 'Edit',
                icon: <Edit />,
                onClick: () => {
                    alert('Edit');
                },
            },
            {
                label: 'Move (Disabled)',
                icon: <Up />,
                onClick: () => {
                    alert('Move');
                },
                disabled: true,
            },
            {
                label: 'Delete (Disabled)',
                icon: <Trash />,
                onClick: () => {
                    alert('Delete');
                },
                variant: 'danger',
                disabled: true,
            },
        ],
    },
    render: (args) => (
        <Box pad="large" background="light-2" justify="center" align="center">
            <LongPressContextMenu {...args}>
                <Card background="white" pad="medium" elevation="small">
                    <CardBody>
                        <Text size="large" weight="bold">
                            Item (Read-only)
                        </Text>
                        <Text size="small" color="dark-6">
                            Some actions are disabled
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Custom press duration (faster activation)
 */
export const FastActivation: Story = {
    args: {
        children: <div>Press and hold</div>,
        pressDuration: 200,
        actions: [
            {
                label: 'Quick Action',
                onClick: () => {
                    alert('Quick action!');
                },
            },
        ],
    },
    render: (args) => (
        <Box pad="large" background="light-2" justify="center" align="center">
            <LongPressContextMenu {...args}>
                <Card background="white" pad="medium" elevation="small">
                    <CardBody>
                        <Text size="large" weight="bold">
                            Fast Menu
                        </Text>
                        <Text size="small" color="dark-6">
                            (Hold for only 200ms)
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Custom movement threshold (more sensitive to scrolling)
 */
export const SensitiveScroll: Story = {
    args: {
        children: <div>Press and hold</div>,
        moveThreshold: 5,
        actions: [
            {
                label: 'Edit',
                icon: <Edit />,
                onClick: () => {
                    alert('Edit');
                },
            },
        ],
    },
    render: (args) => (
        <Box pad="large" background="light-2" justify="center" align="center">
            <LongPressContextMenu {...args}>
                <Card background="white" pad="medium" elevation="small">
                    <CardBody>
                        <Text size="large" weight="bold">
                            Scroll Sensitive
                        </Text>
                        <Text size="small" color="dark-6">
                            (Cancels with 5px movement)
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Menu callbacks demonstration
 */
export const WithCallbacks: Story = {
    args: {
        children: <div>Press and hold</div>,
        actions: [
            {
                label: 'Action',
                onClick: () => {
                    alert('Action clicked');
                },
            },
        ],
        onMenuOpen: () => {
            console.log('Menu opened');
        },
        onMenuClose: () => {
            console.log('Menu closed');
        },
    },
    render: (args) => (
        <Box pad="large" background="light-2" justify="center" align="center">
            <LongPressContextMenu {...args}>
                <Card background="white" pad="medium" elevation="small">
                    <CardBody>
                        <Text size="large" weight="bold">
                            With Callbacks
                        </Text>
                        <Text size="small" color="dark-6">
                            (Check console for events)
                        </Text>
                    </CardBody>
                </Card>
            </LongPressContextMenu>
        </Box>
    ),
};

/**
 * Touch target verification - menu items meet 44px minimum
 */
export const TouchTargets: Story = {
    args: {
        children: <div>Press and hold</div>,
        actions: [
            { label: 'Short', onClick: () => {} },
            { label: 'Medium Length Action', onClick: () => {} },
            { label: 'Very Long Action Label Text', onClick: () => {} },
        ],
    },
    render: (args) => (
        <Box pad="large" background="light-2" justify="center" align="center">
            <Box gap="small">
                <LongPressContextMenu {...args}>
                    <Card background="white" pad="medium" elevation="small">
                        <CardBody>
                            <Text size="large" weight="bold">
                                Touch Target Test
                            </Text>
                            <Text size="small" color="dark-6">
                                Menu items should all be ≥44px tall
                            </Text>
                        </CardBody>
                    </Card>
                </LongPressContextMenu>
                <Text size="small" color="dark-6" textAlign="center">
                    Open menu and verify each item is at least 44px tall
                </Text>
            </Box>
        </Box>
    ),
};
