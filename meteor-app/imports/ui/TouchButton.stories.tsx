import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'grommet';
import { Add, Trash, Edit, Checkmark, Close } from 'grommet-icons';
import React from 'react';

import { TouchButton } from './TouchButton';

/**
 * TouchButton provides iOS-style visual feedback for touch interactions.
 *
 * Key features:
 * - 44x44px minimum touch target size
 * - Smooth visual feedback on press
 * - Multiple variants (primary, secondary, danger, ghost)
 * - Loading state support
 * - Icon support
 * - Full width option
 */
const meta = {
    title: 'UI/TouchButton',
    component: TouchButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'TouchButton component with iOS-style visual feedback. Ensures 44x44px minimum touch targets and provides consistent interaction feedback across the app.',
            },
        },
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'danger', 'ghost'],
            description: 'Visual style variant',
        },
        isLoading: {
            control: 'boolean',
            description: 'Shows loading spinner when true',
        },
        disabled: {
            control: 'boolean',
            description: 'Disables the button',
        },
        fullWidth: {
            control: 'boolean',
            description: 'Makes button full width',
        },
    },
} satisfies Meta<typeof TouchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Primary button variant - used for main actions
 */
export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
    },
};

/**
 * Secondary button variant - used for less prominent actions
 */
export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
    },
};

/**
 * Danger button variant - used for destructive actions
 */
export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Delete Item',
    },
};

/**
 * Ghost button variant - transparent background, minimal style
 */
export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Cancel',
    },
};

/**
 * Button with icon and text
 */
export const WithIcon: Story = {
    args: {
        variant: 'primary',
        icon: <Add />,
        children: 'Add Item',
    },
};

/**
 * Icon-only button (no text)
 */
export const IconOnly: Story = {
    args: {
        variant: 'primary',
        icon: <Add />,
        'aria-label': 'Add item',
    },
};

/**
 * Loading state - shows spinner instead of content
 */
export const Loading: Story = {
    args: {
        variant: 'primary',
        isLoading: true,
        children: 'Save Changes',
    },
};

/**
 * Disabled state - button cannot be interacted with
 */
export const Disabled: Story = {
    args: {
        variant: 'primary',
        disabled: true,
        children: 'Disabled Button',
    },
};

/**
 * Full width button - stretches to fill container
 */
export const FullWidth: Story = {
    args: {
        variant: 'primary',
        fullWidth: true,
        children: 'Full Width Button',
    },
    decorators: [
        (Story) => (
            <Box width="medium">
                <Story />
            </Box>
        ),
    ],
};

/**
 * All variants side by side for comparison
 */
export const AllVariants: Story = {
    render: () => (
        <Box gap="medium" pad="medium">
            <Box direction="row" gap="small" wrap>
                <TouchButton variant="primary">Primary</TouchButton>
                <TouchButton variant="secondary">Secondary</TouchButton>
                <TouchButton variant="danger">Danger</TouchButton>
                <TouchButton variant="ghost">Ghost</TouchButton>
            </Box>
        </Box>
    ),
};

/**
 * Common action buttons with icons
 */
export const CommonActions: Story = {
    render: () => (
        <Box gap="medium" pad="medium">
            <Box direction="row" gap="small" wrap>
                <TouchButton variant="primary" icon={<Add />}>
                    Add
                </TouchButton>
                <TouchButton variant="secondary" icon={<Edit />}>
                    Edit
                </TouchButton>
                <TouchButton variant="danger" icon={<Trash />}>
                    Delete
                </TouchButton>
                <TouchButton variant="primary" icon={<Checkmark />}>
                    Save
                </TouchButton>
                <TouchButton variant="ghost" icon={<Close />}>
                    Cancel
                </TouchButton>
            </Box>
        </Box>
    ),
};

/**
 * Different sizes - all meet 44px minimum
 */
export const Sizes: Story = {
    render: () => (
        <Box gap="medium" pad="medium">
            <Box direction="row" gap="small" wrap align="center">
                <TouchButton variant="primary" icon={<Add />} aria-label="Add" />
                <TouchButton variant="primary" icon={<Add />}>
                    Add
                </TouchButton>
                <TouchButton variant="primary" icon={<Add />}>
                    Add New Item
                </TouchButton>
            </Box>
        </Box>
    ),
};

/**
 * Form button group example
 */
export const FormButtons: Story = {
    render: () => (
        <Box gap="medium" pad="medium" width="medium">
            <Box direction="row" gap="medium" justify="end">
                <TouchButton variant="ghost">Cancel</TouchButton>
                <TouchButton variant="primary" type="submit">
                    Save Changes
                </TouchButton>
            </Box>
        </Box>
    ),
};

/**
 * Mobile action sheet buttons (full width, stacked)
 */
export const MobileActionSheet: Story = {
    render: () => (
        <Box gap="small" pad="medium" width="medium" background="light-2" round="small">
            <TouchButton variant="primary" fullWidth icon={<Edit />}>
                Edit Item
            </TouchButton>
            <TouchButton variant="secondary" fullWidth icon={<Add />}>
                Duplicate Item
            </TouchButton>
            <TouchButton variant="danger" fullWidth icon={<Trash />}>
                Delete Item
            </TouchButton>
            <TouchButton variant="ghost" fullWidth>
                Cancel
            </TouchButton>
        </Box>
    ),
};

/**
 * Touch target size verification - all buttons should be at least 44x44px
 */
export const TouchTargets: Story = {
    render: () => (
        <Box gap="medium" pad="medium">
            <Box
                direction="row"
                gap="small"
                wrap
                style={{
                    background: 'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 44px, #e0e0e0 44px, #e0e0e0 45px)',
                }}
                pad="small"
            >
                <TouchButton variant="primary" icon={<Add />} aria-label="Icon only" />
                <TouchButton variant="primary">Text</TouchButton>
                <TouchButton variant="primary" icon={<Add />}>
                    Icon + Text
                </TouchButton>
            </Box>
            <Box pad="small" background="light-4">
                <p style={{ fontSize: '14px', margin: 0 }}>
                    Gray stripes show 44px height. All buttons should be at least this tall.
                </p>
            </Box>
        </Box>
    ),
};
