/**
 * Storybook stories for ItemsByTagView component.
 *
 * ItemsByTagView displays items filtered by a selected tag, showing item cards with
 * names, descriptions, and container paths. Useful for finding all items with a specific tag
 * across different locations in the inventory.
 *
 * These stories demonstrate various states: no selection, empty results, few items, many items,
 * items with long names, items in containers, loading state, and fully interactive scenarios.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Box, Button, Text } from 'grommet';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import { ItemsByTagViewPresentation } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';

const meta: Meta<typeof ItemsByTagViewPresentation> = {
    title: 'UI/ItemsByTagView',
    component: ItemsByTagViewPresentation,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box pad="medium" background="background-back" style={{ minHeight: '400px' }}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ItemsByTagViewPresentation>;

// Sample tags
const campingTag: TagRecord = {
    _id: 'tag-camping',
    name: 'Camping',
    parentTagId: '',
    path: [{ _id: 'tag-camping', name: 'Camping' }],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const electronicsTag: TagRecord = {
    _id: 'tag-electronics',
    name: 'Electronics',
    parentTagId: '',
    path: [{ _id: 'tag-electronics', name: 'Electronics' }],
    createdAt: new Date('2024-01-02'),
    modifiedAt: new Date('2024-01-02'),
};

// Sample items
const sampleItems: InventoryItem[] = [
    {
        _id: 'item1',
        name: 'Camping Tent',
        description: 'A 4-person waterproof camping tent with built-in rain fly',
        isContainer: false,
        tagIds: ['tag-camping'],
        createdAt: new Date('2024-01-10'),
        modifiedAt: new Date('2024-01-10'),
    },
    {
        _id: 'item2',
        name: 'Sleeping Bag',
        description: 'Warm sleeping bag rated for 20°F',
        isContainer: false,
        tagIds: ['tag-camping'],
        createdAt: new Date('2024-01-11'),
        modifiedAt: new Date('2024-01-11'),
    },
    {
        _id: 'item3',
        name: 'Camp Stove',
        description: 'Portable propane camp stove with two burners',
        isContainer: false,
        containerId: 'container1',
        tagIds: ['tag-camping'],
        createdAt: new Date('2024-01-12'),
        modifiedAt: new Date('2024-01-12'),
    },
];

const containerPaths: Record<string, Array<{ _id: string; name: string }>> = {
    item3: [{ _id: 'container1', name: 'Garage Storage' }],
};

// Generate many items for testing
const manyItems: InventoryItem[] = Array.from({ length: 20 }, (_, i) => ({
    _id: `item-${i}`,
    name: `Item ${i + 1}`,
    description: `Description for item ${i + 1}. This is a sample item for testing purposes.`,
    isContainer: false,
    tagIds: ['tag-camping'],
    createdAt: new Date(`2024-01-${10 + i}`),
    modifiedAt: new Date(`2024-01-${10 + i}`),
}));

// Story: No tag selected
export const NoTagSelected: Story = {
    args: {
        selectedTag: undefined,
        items: [],
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Tag with no items
export const TagWithNoItems: Story = {
    args: {
        selectedTag: electronicsTag,
        items: [],
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Few items
export const FewItems: Story = {
    args: {
        selectedTag: campingTag,
        items: sampleItems,
        containerPaths,
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Many items with scrolling
export const ManyItems: Story = {
    args: {
        selectedTag: campingTag,
        items: manyItems,
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Items with long names
export const ItemsWithLongNames: Story = {
    args: {
        selectedTag: campingTag,
        items: [
            {
                _id: 'item1',
                name: 'Professional Grade Ultra-Lightweight Waterproof 4-Person Family Camping Tent',
                description:
                    'This is an extremely high-quality camping tent designed for families who want the best outdoor experience possible',
                isContainer: false,
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-10'),
                modifiedAt: new Date('2024-01-10'),
            },
            {
                _id: 'item2',
                name: 'Deluxe Mummy-Style Down-Filled Winter Sleeping Bag with Compression Sack',
                description:
                    'Rated for temperatures down to -20°F, perfect for extreme cold weather camping expeditions',
                isContainer: false,
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-11'),
                modifiedAt: new Date('2024-01-11'),
            },
        ],
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Items in various containers
export const ItemsInContainers: Story = {
    args: {
        selectedTag: campingTag,
        items: [
            {
                _id: 'item1',
                name: 'Tent',
                isContainer: false,
                containerId: 'garage',
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-10'),
                modifiedAt: new Date('2024-01-10'),
            },
            {
                _id: 'item2',
                name: 'Sleeping Bag',
                isContainer: false,
                containerId: 'closet',
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-11'),
                modifiedAt: new Date('2024-01-11'),
            },
            {
                _id: 'item3',
                name: 'Camp Stove',
                isContainer: false,
                containerId: 'shed',
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-12'),
                modifiedAt: new Date('2024-01-12'),
            },
            {
                _id: 'item4',
                name: 'Flashlight',
                description: 'LED flashlight',
                isContainer: false,
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-13'),
                modifiedAt: new Date('2024-01-13'),
            },
        ],
        containerPaths: {
            item1: [{ _id: 'garage', name: 'Garage' }],
            item2: [{ _id: 'closet', name: 'Hall Closet' }],
            item3: [{ _id: 'shed', name: 'Backyard Shed' }],
        },
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Container items (folders)
export const WithContainerItems: Story = {
    args: {
        selectedTag: campingTag,
        items: [
            {
                _id: 'container1',
                name: 'Camping Gear Box',
                description: 'Container holding all camping equipment',
                isContainer: true,
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-10'),
                modifiedAt: new Date('2024-01-10'),
            },
            {
                _id: 'item1',
                name: 'Tent',
                isContainer: false,
                containerId: 'container1',
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-11'),
                modifiedAt: new Date('2024-01-11'),
            },
            {
                _id: 'item2',
                name: 'Sleeping Bag',
                isContainer: false,
                tagIds: ['tag-camping'],
                createdAt: new Date('2024-01-12'),
                modifiedAt: new Date('2024-01-12'),
            },
        ],
        containerPaths: {
            item1: [{ _id: 'container1', name: 'Camping Gear Box' }],
        },
        onSelectItem: (item) => console.log('Selected item:', item.name),
        onClearSelection: () => console.log('Clear selection'),
    },
};

// Story: Loading state
export const Loading: Story = {
    args: {
        selectedTag: campingTag,
        items: [],
        isLoading: true,
    },
};

// Story: Without callbacks (read-only)
export const ReadOnly: Story = {
    args: {
        selectedTag: campingTag,
        items: sampleItems,
        containerPaths,
    },
};

// Story: Fully Interactive
export const FullyInteractive: Story = {
    render: function FullyInteractiveStory() {
        const [selectedTag, setSelectedTag] = useState<TagRecord | undefined>(campingTag);
        const [items, setItems] = useState<InventoryItem[]>(sampleItems);
        const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

        const availableTags = [campingTag, electronicsTag];

        const handleSelectTag = (tag: TagRecord): void => {
            setSelectedTag(tag);
            // Simulate fetching items for the selected tag
            if (tag._id === campingTag._id) {
                setItems(sampleItems);
            } else {
                setItems([]);
            }
        };

        const handleSelectItem = (item: InventoryItem): void => {
            setSelectedItem(item);
            setTimeout(() => setSelectedItem(null), 3000);
        };

        const handleClearSelection = (): void => {
            setSelectedTag(undefined);
            setItems([]);
            setSelectedItem(null);
        };

        return (
            <Box gap="medium">
                {/* Tag selector buttons */}
                <Box direction="row" gap="small" align="center">
                    <Text weight="bold">Select tag:</Text>
                    {availableTags.map((tag) => (
                        <Button
                            key={tag._id}
                            label={tag.name}
                            onClick={() => handleSelectTag(tag)}
                            primary={selectedTag?._id === tag._id}
                            size="small"
                        />
                    ))}
                </Box>

                {/* Feedback message */}
                {selectedItem !== null && (
                    <Box background="brand" pad="small" round="small" animation="slideDown">
                        <Text color="white" textAlign="center">
                            Selected: {selectedItem.name}
                        </Text>
                    </Box>
                )}

                {/* Items view */}
                <ItemsByTagViewPresentation
                    selectedTag={selectedTag}
                    items={items}
                    containerPaths={containerPaths}
                    onSelectItem={handleSelectItem}
                    onClearSelection={handleClearSelection}
                />
            </Box>
        );
    },
    parameters: {
        docs: {
            description: {
                story: `**Fully Interactive Demo**

Click tag buttons to switch between tags. Click item cards to simulate item selection (shows feedback message). The view updates reactively based on the selected tag. Click "Clear Selection" to reset.`,
            },
        },
    },
};
