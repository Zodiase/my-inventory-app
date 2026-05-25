import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'grommet';
import React from 'react';

import { DesktopOnly } from './DesktopOnly';

const meta: Meta<typeof DesktopOnly> = {
    title: 'UI/DesktopOnly',
    component: DesktopOnly,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof DesktopOnly>;

export const DesktopView: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'desktop', // Storybook default desktop viewport
        },
    },
    render: () => (
        // We force a min-width container for Storybook if the viewport addon isn't fully controlling the iframe size
        <Box width={{ min: '800px' }} fill>
            <DesktopOnly>
                <Box pad="large" background="status-ok" align="center" justify="center" fill>
                    <Text size="xlarge" color="white" weight="bold">
                        Desktop Content Visible
                    </Text>
                    <Text color="white">The viewport is &gt;= 768px</Text>
                </Box>
            </DesktopOnly>
        </Box>
    ),
};

export const MobileFallback: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'mobile1', // Storybook default mobile viewport
        },
    },
    render: () => (
        // We constrain the width to simulate a mobile device for this specific story
        <Box width={{ max: '400px' }} fill>
            <DesktopOnly>
                <Box pad="large" background="status-error" align="center" justify="center" fill>
                    <Text>This should NOT be visible on mobile</Text>
                </Box>
            </DesktopOnly>
        </Box>
    ),
};

export const CustomFallback: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    render: () => (
        <Box width={{ max: '400px' }} fill>
            <DesktopOnly
                fallback={
                    <Box pad="large" background="status-warning" align="center" justify="center" fill>
                        <Text size="large" weight="bold">
                            Custom Mobile Message
                        </Text>
                    </Box>
                }
            >
                <Text>Desktop content</Text>
            </DesktopOnly>
        </Box>
    ),
};
