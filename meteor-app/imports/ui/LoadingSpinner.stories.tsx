import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button } from 'grommet';
import React, { useState } from 'react';

import { LoadingSpinner } from './LoadingSpinner';

/**
 * LoadingSpinner provides iOS-style loading indicators optimized for mobile.
 *
 * Key features:
 * - Smooth 60fps animation
 * - Three size variants (small, medium, large)
 * - Optional loading text
 * - Customizable colors
 * - Overlay mode for full-screen loading
 * - Accessible with ARIA labels
 */
const meta = {
    title: 'UI/LoadingSpinner',
    component: LoadingSpinner,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'LoadingSpinner component with iOS-style animation. Provides consistent loading feedback across the app with mobile optimization.',
            },
        },
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['small', 'medium', 'large'],
            description: 'Size variant',
        },
        color: {
            control: 'color',
            description: 'Spinner color',
        },
        overlay: {
            control: 'boolean',
            description: 'Show as full-screen overlay',
        },
    },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Small spinner - for inline loading indicators
 */
export const Small: Story = {
    args: {
        size: 'small',
    },
};

/**
 * Medium spinner (default) - general purpose loading
 */
export const Medium: Story = {
    args: {
        size: 'medium',
    },
};

/**
 * Large spinner - for prominent loading states
 */
export const Large: Story = {
    args: {
        size: 'large',
    },
};

/**
 * Spinner with loading text
 */
export const WithText: Story = {
    args: {
        size: 'medium',
        text: 'Loading items...',
    },
};

/**
 * Small spinner with text
 */
export const SmallWithText: Story = {
    args: {
        size: 'small',
        text: 'Loading...',
    },
};

/**
 * Large spinner with text
 */
export const LargeWithText: Story = {
    args: {
        size: 'large',
        text: 'Please wait while we load your inventory...',
    },
};

/**
 * Custom color spinner
 */
export const CustomColor: Story = {
    args: {
        size: 'medium',
        color: '#ff3b30',
        text: 'Loading...',
    },
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
    render: () => (
        <Box direction="row" gap="large" align="center" pad="large">
            <Box align="center" gap="small">
                <LoadingSpinner size="small" />
                <p style={{ fontSize: '14px', margin: 0 }}>Small (20px)</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" />
                <p style={{ fontSize: '14px', margin: 0 }}>Medium (40px)</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="large" />
                <p style={{ fontSize: '14px', margin: 0 }}>Large (60px)</p>
            </Box>
        </Box>
    ),
};

/**
 * Color variations
 */
export const ColorVariations: Story = {
    render: () => (
        <Box direction="row" gap="large" align="center" pad="large" wrap>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" color="#007aff" />
                <p style={{ fontSize: '14px', margin: 0 }}>iOS Blue</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" color="#34c759" />
                <p style={{ fontSize: '14px', margin: 0 }}>Green</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" color="#ff9500" />
                <p style={{ fontSize: '14px', margin: 0 }}>Orange</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" color="#ff3b30" />
                <p style={{ fontSize: '14px', margin: 0 }}>Red</p>
            </Box>
            <Box align="center" gap="small">
                <LoadingSpinner size="medium" color="#8e8e93" />
                <p style={{ fontSize: '14px', margin: 0 }}>Gray</p>
            </Box>
        </Box>
    ),
};

/**
 * Inline usage in cards
 */
export const InlineUsage: Story = {
    render: () => (
        <Box pad="large" gap="medium">
            <Box
                background="white"
                pad="medium"
                round="small"
                elevation="small"
                height="small"
                justify="center"
                align="center"
            >
                <LoadingSpinner size="small" text="Loading items..." />
            </Box>
            <Box
                background="white"
                pad="medium"
                round="small"
                elevation="small"
                height="medium"
                justify="center"
                align="center"
            >
                <LoadingSpinner size="medium" text="Loading details..." />
            </Box>
        </Box>
    ),
};

/**
 * Full-screen overlay loading
 * Click button to show/hide overlay
 */
export const OverlayMode: Story = {
    render: () => {
        const [showOverlay, setShowOverlay] = useState(false);

        return (
            <Box pad="large" gap="medium">
                <Button
                    label={showOverlay ? 'Hide Overlay' : 'Show Overlay Loading'}
                    onClick={() => {
                        setShowOverlay(!showOverlay);
                    }}
                    primary
                />
                <Box background="light-2" pad="large" height="medium">
                    <p>
                        Click the button above to see the full-screen overlay loading spinner. This is useful for
                        operations that block the entire UI.
                    </p>
                </Box>
                {showOverlay && (
                    <LoadingSpinner size="large" overlay text="Processing your request..." ariaLabel="Processing" />
                )}
            </Box>
        );
    },
};

/**
 * Simulated loading states
 */
export const LoadingStates: Story = {
    render: () => {
        const [loading, setLoading] = useState<string | null>(null);

        const simulateLoading = (type: string): void => {
            setLoading(type);
            setTimeout(() => {
                setLoading(null);
            }, 2000);
        };

        return (
            <Box pad="large" gap="medium">
                <Box direction="row" gap="small" wrap>
                    <Button
                        label="Load Items"
                        onClick={() => {
                            simulateLoading('items');
                        }}
                    />
                    <Button
                        label="Save Changes"
                        onClick={() => {
                            simulateLoading('save');
                        }}
                    />
                    <Button
                        label="Delete Item"
                        onClick={() => {
                            simulateLoading('delete');
                        }}
                    />
                </Box>

                <Box background="light-2" pad="medium" height="medium" justify="center" align="center">
                    {loading === 'items' && <LoadingSpinner size="medium" text="Loading items..." />}
                    {loading === 'save' && <LoadingSpinner size="small" text="Saving changes..." color="#34c759" />}
                    {loading === 'delete' && <LoadingSpinner size="small" text="Deleting item..." color="#ff3b30" />}
                    {loading === null && <p>Click a button to see loading state</p>}
                </Box>
            </Box>
        );
    },
};

/**
 * List loading pattern
 */
export const ListLoading: Story = {
    render: () => (
        <Box pad="large" gap="medium">
            <Box background="white" pad="medium" round="small" elevation="small" height="large" justify="center">
                <LoadingSpinner size="medium" text="Loading your inventory..." />
            </Box>
        </Box>
    ),
};

/**
 * Button loading state
 */
export const ButtonLoading: Story = {
    render: () => (
        <Box pad="large" gap="medium">
            <Box direction="row" gap="small" align="center">
                <Button label="Save" primary disabled />
                <LoadingSpinner size="small" />
            </Box>
            <Box direction="row" gap="small" align="center">
                <Button label="Delete" secondary disabled />
                <LoadingSpinner size="small" color="#ff3b30" />
            </Box>
        </Box>
    ),
};

/**
 * Custom ARIA label for accessibility
 */
export const AccessibilityExample: Story = {
    args: {
        size: 'medium',
        text: 'Processing payment...',
        ariaLabel: 'Processing your payment, please wait',
    },
    parameters: {
        docs: {
            description: {
                story: 'Custom ARIA labels help screen readers provide better context to users.',
            },
        },
    },
};
