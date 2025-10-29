import { fn } from '@storybook/test';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'grommet';
import React, { useState } from 'react';

import { TagChip } from '/imports/ui/TagChip';

const meta: Meta<typeof TagChip> = {
    title: 'UI/TagChip',
    component: TagChip,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'TagChip displays a tag as a small pill/badge with optional remove button. Pure presentation component with no Meteor dependencies, suitable for displaying tags on items, in lists, or tag selectors. iOS-optimized with 44px minimum tap target for remove button.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        tagName: {
            control: 'text',
            description: 'The name of the tag to display',
        },
        onRemove: {
            description: 'Optional callback when the remove button is clicked',
            action: 'removed',
        },
        disabled: {
            control: 'boolean',
            description: 'Whether the chip is in a disabled state',
        },
        color: {
            control: 'text',
            description: 'Optional color for the chip (default: "brand")',
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic tag chip with just a name, no remove button
 */
export const Basic: Story = {
    args: {
        tagName: 'Electronics',
    },
};

/**
 * Tag chip with remove button
 */
export const WithRemoveButton: Story = {
    args: {
        tagName: 'Camping Gear',
        onRemove: fn(),
    },
};

/**
 * Disabled tag chip - grayed out and non-interactive
 */
export const Disabled: Story = {
    args: {
        tagName: 'Outdated Tag',
        onRemove: fn(),
        disabled: true,
    },
};

/**
 * Tag with custom color
 */
export const CustomColor: Story = {
    args: {
        tagName: 'Important',
        color: 'status-error',
        onRemove: fn(),
    },
};

/**
 * Tag with different custom color
 */
export const CustomColorSuccess: Story = {
    args: {
        tagName: 'Verified',
        color: 'status-ok',
        onRemove: fn(),
    },
};

/**
 * Tag with very long name to test text wrapping
 */
export const LongTagName: Story = {
    args: {
        tagName: 'This is a very long tag name that might wrap or overflow',
        onRemove: fn(),
    },
};

/**
 * Short single letter tag
 */
export const ShortTag: Story = {
    args: {
        tagName: 'A',
        onRemove: fn(),
    },
};

/**
 * Tag with emoji in name
 */
export const WithEmoji: Story = {
    args: {
        tagName: '🏕️ Camping',
        onRemove: fn(),
    },
};

/**
 * Tag with special characters
 */
export const WithSpecialCharacters: Story = {
    args: {
        tagName: 'C++/C# Tools',
        onRemove: fn(),
    },
};

/**
 * Multiple tags displayed together
 */
export const MultipleTagsInList: Story = {
    render: () => (
        <Box direction="row" gap="small" wrap>
            <TagChip tagName="Electronics" onRemove={fn()} />
            <TagChip tagName="Tools" onRemove={fn()} />
            <TagChip tagName="Camping" onRemove={fn()} />
            <TagChip tagName="Kitchen" onRemove={fn()} />
            <TagChip tagName="Books" onRemove={fn()} />
        </Box>
    ),
};

/**
 * Tags with varying colors
 */
export const ColorVariety: Story = {
    render: () => (
        <Box direction="row" gap="small" wrap>
            <TagChip tagName="Brand" color="brand" onRemove={fn()} />
            <TagChip tagName="Accent 1" color="accent-1" onRemove={fn()} />
            <TagChip tagName="Accent 2" color="accent-2" onRemove={fn()} />
            <TagChip tagName="Accent 3" color="accent-3" onRemove={fn()} />
            <TagChip tagName="Accent 4" color="accent-4" onRemove={fn()} />
        </Box>
    ),
};

/**
 * Mix of enabled and disabled tags
 */
export const MixedStates: Story = {
    render: () => (
        <Box direction="row" gap="small" wrap>
            <TagChip tagName="Active" onRemove={fn()} />
            <TagChip tagName="Disabled" onRemove={fn()} disabled />
            <TagChip tagName="Read-only" />
            <TagChip tagName="Important" color="status-warning" onRemove={fn()} />
        </Box>
    ),
};

/**
 * Interactive story demonstrating tag removal
 */
export const InteractiveRemoval: Story = {
    render: function InteractiveRemovalStory() {
        const [tags, setTags] = useState(['Electronics', 'Tools', 'Camping', 'Kitchen']);

        return (
            <Box gap="small">
                <Box as="p" style={{ margin: 0, color: '#666' }}>
                    Click the X button to remove tags:
                </Box>
                <Box direction="row" gap="small" wrap>
                    {tags.map((tag) => (
                        <TagChip
                            key={tag}
                            tagName={tag}
                            onRemove={() => {
                                setTags(tags.filter((t) => t !== tag));
                            }}
                        />
                    ))}
                    {tags.length === 0 && (
                        <Box as="p" style={{ color: '#999', fontStyle: 'italic' }}>
                            No tags remaining
                        </Box>
                    )}
                </Box>
            </Box>
        );
    },
};
