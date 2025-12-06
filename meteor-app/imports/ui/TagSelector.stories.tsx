import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'grommet';
import React, { useState } from 'react';

import type { TagRecord } from '/imports/model/TagRecord';
import { TagSelector } from '/imports/ui/TagSelector';

const meta: Meta<typeof TagSelector> = {
    title: 'UI/TagSelector',
    component: TagSelector,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TagSelector>;

// Sample data
const sampleTags: TagRecord[] = [
    {
        _id: 'tag1',
        name: 'Camping',
        parentTagId: '',
        path: [],
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    },
    {
        _id: 'tag2',
        name: 'Outdoor',
        parentTagId: '',
        path: [],
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    },
    {
        _id: 'tag3',
        name: 'Kitchen',
        parentTagId: '',
        path: [],
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    },
    {
        _id: 'tag4',
        name: 'Electronics',
        parentTagId: '',
        path: [],
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    },
    {
        _id: 'tag5',
        name: 'Sports',
        parentTagId: '',
        path: [],
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    },
];

const manyTags: TagRecord[] = Array.from({ length: 20 }, (_, i) => ({
    _id: `tag${i + 1}`,
    name: `Tag ${i + 1}`,
    parentTagId: '',
    path: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
}));

// Story: No tags available
export const Empty: Story = {
    args: {
        availableTags: [],
        selectedTagIds: [],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: With custom empty message
export const EmptyWithCustomMessage: Story = {
    args: {
        availableTags: [],
        selectedTagIds: [],
        emptyMessage: 'Create your first tag to get started!',
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: With available tags, none selected
export const WithTagsNoneSelected: Story = {
    args: {
        availableTags: sampleTags,
        selectedTagIds: [],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: With some tags selected
export const WithSomeSelected: Story = {
    args: {
        availableTags: sampleTags,
        selectedTagIds: ['tag1', 'tag3'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: With all tags selected
export const WithAllSelected: Story = {
    args: {
        availableTags: sampleTags,
        selectedTagIds: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: Disabled state
export const Disabled: Story = {
    args: {
        availableTags: sampleTags,
        selectedTagIds: ['tag1', 'tag3'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
        disabled: true,
    },
};

// Story: Without create button
export const WithoutCreateButton: Story = {
    args: {
        availableTags: sampleTags,
        selectedTagIds: ['tag2'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        // No onCreateNewTag callback
    },
};

// Story: Many tags with scrolling
export const ManyTags: Story = {
    args: {
        availableTags: manyTags,
        selectedTagIds: ['tag1', 'tag5', 'tag10', 'tag15'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: Single tag
export const SingleTag: Story = {
    args: {
        availableTags: [sampleTags[0]],
        selectedTagIds: [],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: Tags with special characters
export const TagsWithSpecialCharacters: Story = {
    args: {
        availableTags: [
            {
                _id: 'tag1',
                name: '🏕️ Camping & Outdoor',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'tag2',
                name: '⚡ High-Priority Items',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'tag3',
                name: 'Work/Home (Dual-Use)',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
        ],
        selectedTagIds: ['tag1'],
        onToggleTag: (tagId, isSelected) => {
            console.log('Toggle tag:', tagId, isSelected);
        },
        onCreateNewTag: () => {
            console.log('Create new tag');
        },
    },
};

// Story: Fully Interactive
export const FullyInteractive: Story = {
    render: () => {
        const [selectedTagIds, setSelectedTagIds] = useState<string[]>(['tag1', 'tag3']);
        const [showFeedback, setShowFeedback] = useState<string>('');

        const handleToggleTag = (tagId: string, isSelected: boolean): void => {
            setSelectedTagIds(isSelected ? [...selectedTagIds, tagId] : selectedTagIds.filter((id) => id !== tagId));
            const tagName = sampleTags.find((t) => t._id === tagId)?.name;
            setShowFeedback(isSelected ? `Added tag: ${tagName}` : `Removed tag: ${tagName}`);
            setTimeout(() => {
                setShowFeedback('');
            }, 2000);
        };

        const handleCreateNewTag = (): void => {
            setShowFeedback('Opening create tag dialog...');
            setTimeout(() => {
                setShowFeedback('');
            }, 2000);
        };

        return (
            <Box gap="medium" width="medium">
                {showFeedback && (
                    <Box background="brand" pad="small" round="small" animation="slideDown">
                        <Text color="white" textAlign="center">
                            {showFeedback}
                        </Text>
                    </Box>
                )}
                <TagSelector
                    availableTags={sampleTags}
                    selectedTagIds={selectedTagIds}
                    onToggleTag={handleToggleTag}
                    onCreateNewTag={handleCreateNewTag}
                />
            </Box>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `**Fully Interactive Demo**

Click checkboxes to select/deselect tags in real-time. The selection count updates automatically, and feedback messages show your actions. Click "New Tag" to simulate opening the create tag dialog.`,
            },
        },
    },
};

// Story: In a dialog context
export const InDialogContext: Story = {
    render: () => (
        <Box width="medium" height="medium" background="light-1" round="small" pad="medium">
            <Box
                background="white"
                round="small"
                elevation="medium"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
                <TagSelector
                    availableTags={sampleTags}
                    selectedTagIds={['tag2']}
                    onToggleTag={(tagId, isSelected) => {
                        console.log('Toggle tag:', tagId, isSelected);
                    }}
                    onCreateNewTag={() => {
                        console.log('Create new tag');
                    }}
                />
            </Box>
        </Box>
    ),
    parameters: {
        docs: {
            description: {
                story: 'TagSelector displayed in a dialog/modal context with elevation and styling.',
            },
        },
    },
};
