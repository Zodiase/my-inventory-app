import type { Meta, StoryObj } from '@storybook/react';
import { Box, Grommet, Text } from 'grommet';
import React, { useRef, useState } from 'react';

import { useSwipeNavigation } from '/imports/utility/swipeNavigation';

const meta = {
    title: 'Utilities/Swipe Navigation',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'iOS-style swipe-back navigation gesture. Swipe from the left edge to navigate back in hierarchy.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive demo showing swipe-back navigation
 */
function SwipeNavigationDemo(): React.ReactElement {
    const [depth, setDepth] = useState(0);
    const [lastSwipeTime, setLastSwipeTime] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useSwipeNavigation(
        containerRef,
        {
            enabled: depth > 0,
            threshold: 100,
            edgeThreshold: 50,
            maxVerticalDeviation: 50,
        },
        () => {
            if (depth > 0) {
                setDepth(depth - 1);
                setLastSwipeTime(Date.now());
            }
        }
    );

    const colors = ['#4A90E2', '#7ED321', '#F5A623', '#BD10E0', '#50E3C2'];
    const bgColor = colors[depth % colors.length];

    return (
        <Grommet>
            <Box
                ref={containerRef}
                fill
                background={bgColor}
                pad="medium"
                gap="medium"
                style={{ transition: 'background 0.3s ease' }}
            >
                <Box gap="small">
                    <Text size="xxlarge" weight="bold" color="white">
                        Level {depth}
                    </Text>
                    <Text size="medium" color="white">
                        {depth === 0 ? 'Tap "Go Deeper" to navigate down' : 'Swipe from left edge to go back'}
                    </Text>
                </Box>

                {/* Navigation buttons */}
                <Box direction="row" gap="small">
                    <Box
                        pad="medium"
                        background="white"
                        round="small"
                        onClick={() => {
                            setDepth(depth + 1);
                        }}
                        style={{
                            cursor: 'pointer',
                            minHeight: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text weight="bold">Go Deeper →</Text>
                    </Box>
                    {depth > 0 && (
                        <Box
                            pad="medium"
                            background="rgba(255,255,255,0.3)"
                            round="small"
                            onClick={() => {
                                setDepth(depth - 1);
                            }}
                            style={{
                                cursor: 'pointer',
                                minHeight: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text weight="bold" color="white">
                                ← Go Back
                            </Text>
                        </Box>
                    )}
                </Box>

                {/* Instructions */}
                <Box background="rgba(255,255,255,0.9)" pad="medium" round="small" gap="small">
                    <Text weight="bold">How to test:</Text>
                    <Box as="ul" margin={{ left: 'medium' }} gap="xsmall">
                        <Text as="li">Navigate to a deeper level using "Go Deeper"</Text>
                        <Text as="li">On a touch device: Swipe from the left edge to go back</Text>
                        <Text as="li">Swipe must start within 50px of left edge</Text>
                        <Text as="li">Swipe must move at least 100px horizontally</Text>
                        <Text as="li">Vertical movement must stay under 50px</Text>
                    </Box>
                    {lastSwipeTime !== null && (
                        <Box background="light-3" pad="small" round="xsmall" margin={{ top: 'small' }}>
                            <Text size="small" color="status-ok">
                                ✓ Swipe detected at {new Date(lastSwipeTime).toLocaleTimeString()}
                            </Text>
                        </Box>
                    )}
                </Box>

                {/* Breadcrumb-style path indicator */}
                <Box direction="row" gap="xsmall" align="center">
                    <Text color="white" weight="bold">
                        Path:
                    </Text>
                    {Array.from({ length: depth + 1 }, (_, i) => i).map((level, idx) => (
                        <React.Fragment key={level}>
                            {idx > 0 && <Text color="white">›</Text>}
                            <Text
                                color="white"
                                weight={level === depth ? 'bold' : 'normal'}
                                style={{
                                    opacity: level === depth ? 1 : 0.6,
                                    cursor: 'pointer',
                                }}
                                onClick={() => {
                                    setDepth(level);
                                }}
                            >
                                Level {level}
                            </Text>
                        </React.Fragment>
                    ))}
                </Box>
            </Box>
        </Grommet>
    );
}

export const Interactive: Story = {
    render: () => <SwipeNavigationDemo />,
};

/**
 * Shows swipe navigation at various depths
 */
export const AtDepth3: Story = {
    render: () => {
        const containerRef = useRef<HTMLDivElement>(null);
        const [depth, setDepth] = useState(3);

        useSwipeNavigation(
            containerRef,
            {
                enabled: true,
                threshold: 100,
                edgeThreshold: 50,
            },
            () => {
                setDepth(Math.max(0, depth - 1));
            }
        );

        return (
            <Grommet>
                <Box ref={containerRef} fill background="brand" pad="large" align="center" justify="center">
                    <Text size="xxlarge" weight="bold" color="white">
                        Kitchen › Pantry › Top Shelf
                    </Text>
                    <Text color="white" margin={{ top: 'medium' }}>
                        Swipe from left edge to go back to Pantry
                    </Text>
                </Box>
            </Grommet>
        );
    },
};

/**
 * Disabled at root level (no swipe-back available)
 */
export const DisabledAtRoot: Story = {
    render: () => {
        const containerRef = useRef<HTMLDivElement>(null);

        useSwipeNavigation(
            containerRef,
            {
                enabled: false, // Disabled at root
            },
            () => {
                console.log('Should not trigger - at root level');
            }
        );

        return (
            <Grommet>
                <Box
                    ref={containerRef}
                    fill
                    background="neutral-1"
                    pad="large"
                    align="center"
                    justify="center"
                    gap="medium"
                >
                    <Text size="xxlarge" weight="bold">
                        All Items (Root)
                    </Text>
                    <Text color="text-weak">Swipe-back disabled at root level</Text>
                    <Box background="light-3" pad="medium" round="small">
                        <Text size="small">
                            At the root of the hierarchy, there's nowhere to go back to, so the swipe gesture is
                            disabled.
                        </Text>
                    </Box>
                </Box>
            </Grommet>
        );
    },
};
