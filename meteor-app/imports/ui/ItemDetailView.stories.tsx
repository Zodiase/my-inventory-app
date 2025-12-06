import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Heading, Layer, Text } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';

const meta: Meta<typeof ItemDetailViewPresentation> = {
    title: 'UI/ItemDetailView',
    component: ItemDetailViewPresentation,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ItemDetailViewPresentation>;

// Sample data
const sampleItem: InventoryItem = {
    _id: 'item1',
    name: 'Camping Tent',
    description:
        'A 4-person waterproof camping tent with built-in rain fly and mesh windows. Perfect for family camping trips.',
    isContainer: false,
    containerId: 'container1',
    tagIds: ['tag1', 'tag2'],
    createdAt: new Date('2024-01-15'),
    modifiedAt: new Date('2024-01-20'),
};

const containerItem: InventoryItem = {
    _id: 'container1',
    name: 'Garage Storage',
    description: 'Large storage area in the garage for camping and outdoor gear.',
    isContainer: true,
    containerId: undefined,
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-10'),
};

const rootContainer: InventoryItem = {
    _id: 'root',
    name: 'Home',
    description: '',
    isContainer: true,
    containerId: undefined,
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const sampleContainerPath: InventoryItem[] = [rootContainer, containerItem];

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
];

// Story: Basic item with all features
export const WithAllFeatures: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Container item (shows folder icon)
export const ContainerItem: Story = {
    args: {
        item: containerItem,
        containerPath: [rootContainer],
        tags: [],
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
    },
};

// Story: Item at root (no container path)
export const ItemAtRoot: Story = {
    args: {
        item: {
            ...sampleItem,
            containerId: undefined,
        },
        containerPath: [],
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Item without description
export const WithoutDescription: Story = {
    args: {
        item: {
            ...sampleItem,
            description: '',
        },
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Item without tags
export const WithoutTags: Story = {
    args: {
        item: {
            ...sampleItem,
            tagIds: [],
        },
        containerPath: sampleContainerPath,
        tags: [],
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
    },
};

// Story: Minimal item (no description, tags, or container)
export const MinimalItem: Story = {
    args: {
        item: {
            ...sampleItem,
            name: 'Flashlight',
            description: '',
            containerId: undefined,
            tagIds: [],
        },
        containerPath: [],
        tags: [],
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
    },
};

// Story: Many tags
export const ManyTags: Story = {
    args: {
        item: {
            ...sampleItem,
            tagIds: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
        },
        containerPath: sampleContainerPath,
        tags: [
            ...sampleTags,
            {
                _id: 'tag3',
                name: 'Waterproof',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'tag4',
                name: 'Family',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'tag5',
                name: 'Summer',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'tag6',
                name: 'Essential',
                parentTagId: '',
                path: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
        ],
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Deep container path
export const DeepContainerPath: Story = {
    args: {
        item: sampleItem,
        containerPath: [
            rootContainer,
            {
                _id: 'garage',
                name: 'Garage',
                description: '',
                isContainer: true,
                containerId: 'root',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'storage',
                name: 'Storage Shelves',
                description: '',
                isContainer: true,
                containerId: 'garage',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'box',
                name: 'Camping Equipment Box',
                description: '',
                isContainer: true,
                containerId: 'storage',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
        ],
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Long description
export const LongDescription: Story = {
    args: {
        item: {
            ...sampleItem,
            description:
                'This is a premium 4-person waterproof camping tent designed for all-weather use. Features include: ' +
                'aluminum poles for lightweight durability, built-in rain fly that extends 12 inches beyond the tent body, ' +
                'mesh windows on all sides for ventilation, two entrance doors for easy access, internal gear pockets for organization, ' +
                'reflective guy lines for nighttime safety, and a carrying bag with compression straps. ' +
                'The tent has been tested in heavy rain and wind conditions up to 40mph. ' +
                'Floor dimensions are 8ft x 8ft with a peak height of 6ft. Weight is approximately 12 lbs. ' +
                'Purchased from REI in March 2023 for $350. Used on 5 camping trips so far with excellent results.',
        },
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Disabled actions
export const DisabledActions: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
        disabled: true,
    },
};

// Story: No action callbacks (read-only mode)
export const ReadOnlyMode: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Only edit button (no move or delete)
export const EditOnly: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Long item name
export const LongItemName: Story = {
    args: {
        item: {
            ...sampleItem,
            name: 'Professional Grade Ultra-Lightweight Waterproof 4-Person Family Camping Tent with Extended Rain Fly',
        },
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => {
            console.log('Edit clicked');
        },
        onDelete: () => {
            console.log('Delete clicked');
        },
        onMove: () => {
            console.log('Move clicked');
        },
        onNavigateToContainer: (id) => {
            console.log('Navigate to:', id);
        },
        onRemoveTag: (tagId) => {
            console.log('Remove tag:', tagId);
        },
    },
};

// Story: Fully Interactive Demo
// This story demonstrates real-time state management and interactivity
export const FullyInteractive: Story = {
    render: () => {
        const [item, setItem] = useState<InventoryItem>(sampleItem);
        const [tags, setTags] = useState<TagRecord[]>(sampleTags);
        const [isDeleted, setIsDeleted] = useState(false);
        const [showEditDialog, setShowEditDialog] = useState(false);
        const [showMoveDialog, setShowMoveDialog] = useState(false);
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [feedback, setFeedback] = useState<string>('');

        const showFeedback = (message: string): void => {
            setFeedback(message);
            setTimeout(() => {
                setFeedback('');
            }, 3000);
        };

        const handleRemoveTag = (tagId: string): void => {
            const removedTag = tags.find((t) => t._id === tagId);
            setTags(tags.filter((t) => t._id !== tagId));
            setItem({
                ...item,
                tagIds: item.tagIds.filter((id) => id !== tagId),
            });
            showFeedback(`Removed tag: ${removedTag?.name ?? 'Unknown'}`);
        };

        const handleEdit = (): void => {
            setShowEditDialog(true);
        };

        const handleSaveEdit = (newName: string, newDescription: string): void => {
            setItem({
                ...item,
                name: newName,
                description: newDescription,
                modifiedAt: new Date(),
            });
            setShowEditDialog(false);
            showFeedback('Item updated successfully!');
        };

        const handleMove = (): void => {
            setShowMoveDialog(true);
        };

        const handleConfirmMove = (): void => {
            setShowMoveDialog(false);
            showFeedback('Item moved to new location!');
        };

        const handleDelete = (): void => {
            setShowDeleteConfirm(true);
        };

        const handleConfirmDelete = (): void => {
            setIsDeleted(true);
            setShowDeleteConfirm(false);
            showFeedback('Item deleted!');
        };

        if (isDeleted) {
            return (
                <Box fill align="center" justify="center" pad="large" gap="medium">
                    <Text size="large" weight="bold">
                        Item Deleted
                    </Text>
                    <Text>The item has been removed from your inventory.</Text>
                    <Button
                        label="Undo Delete"
                        onClick={() => {
                            setIsDeleted(false);
                        }}
                        primary
                    />
                </Box>
            );
        }

        return (
            <Box fill>
                {/* Feedback Toast */}
                {feedback && (
                    <Box
                        background="brand"
                        pad="small"
                        round="small"
                        margin={{ bottom: 'medium' }}
                        animation="slideDown"
                    >
                        <Text color="white" textAlign="center">
                            {feedback}
                        </Text>
                    </Box>
                )}

                {/* Main View */}
                <ItemDetailViewPresentation
                    item={item}
                    containerPath={sampleContainerPath}
                    tags={tags}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    onRemoveTag={handleRemoveTag}
                    onNavigateToContainer={(id: string) => {
                        showFeedback(`Navigating to: ${id}`);
                    }}
                />

                {/* Edit Dialog */}
                {showEditDialog && (
                    <Layer
                        onEsc={() => {
                            setShowEditDialog(false);
                        }}
                        onClickOutside={() => {
                            setShowEditDialog(false);
                        }}
                    >
                        <Box pad="medium" gap="medium" width="medium">
                            <Heading level={3} margin="none">
                                Edit Item
                            </Heading>
                            <Box gap="small">
                                <Text size="small" weight="bold">
                                    Name:
                                </Text>
                                <input
                                    type="text"
                                    defaultValue={item.name}
                                    id="edit-name"
                                    style={{
                                        padding: '8px',
                                        fontSize: '14px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                    }}
                                />
                            </Box>
                            <Box gap="small">
                                <Text size="small" weight="bold">
                                    Description:
                                </Text>
                                <textarea
                                    defaultValue={item.description}
                                    id="edit-description"
                                    rows={4}
                                    style={{
                                        padding: '8px',
                                        fontSize: '14px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </Box>
                            <Box direction="row" gap="small" justify="end">
                                <Button
                                    label="Cancel"
                                    onClick={() => {
                                        setShowEditDialog(false);
                                    }}
                                />
                                <Button
                                    label="Save"
                                    onClick={() => {
                                        const nameInput = document.getElementById('edit-name') as HTMLInputElement;
                                        const descInput = document.getElementById(
                                            'edit-description'
                                        ) as HTMLTextAreaElement;
                                        handleSaveEdit(nameInput.value, descInput.value);
                                    }}
                                    primary
                                />
                            </Box>
                        </Box>
                    </Layer>
                )}

                {/* Move Dialog */}
                {showMoveDialog && (
                    <Layer
                        onEsc={() => {
                            setShowMoveDialog(false);
                        }}
                        onClickOutside={() => {
                            setShowMoveDialog(false);
                        }}
                    >
                        <Box pad="medium" gap="medium" width="medium">
                            <Heading level={3} margin="none">
                                Move Item
                            </Heading>
                            <Text>Select a new location for this item:</Text>
                            <Box gap="small">
                                <Button label="📦 Storage Box A" onClick={handleConfirmMove} />
                                <Button label="📦 Kitchen Cabinet" onClick={handleConfirmMove} />
                                <Button label="📦 Bedroom Closet" onClick={handleConfirmMove} />
                            </Box>
                            <Button
                                label="Cancel"
                                onClick={() => {
                                    setShowMoveDialog(false);
                                }}
                            />
                        </Box>
                    </Layer>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <Layer
                        onEsc={() => {
                            setShowDeleteConfirm(false);
                        }}
                        onClickOutside={() => {
                            setShowDeleteConfirm(false);
                        }}
                    >
                        <Box pad="medium" gap="medium" width="medium">
                            <Heading level={3} margin="none">
                                Confirm Delete
                            </Heading>
                            <Text>
                                Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                            </Text>
                            <Box direction="row" gap="small" justify="end">
                                <Button
                                    label="Cancel"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                    }}
                                />
                                <Button label="Delete" onClick={handleConfirmDelete} color="status-critical" primary />
                            </Box>
                        </Box>
                    </Layer>
                )}
            </Box>
        );
    },
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: `**Fully Interactive Demo**

This story demonstrates complete interactivity with state management:

- **Remove Tags**: Click the X button on any tag to remove it in real-time
- **Edit Item**: Click Edit to modify the item name and description
- **Move Item**: Click Move to see location selection dialog
- **Delete Item**: Click Delete to confirm deletion (with undo option)
- **Navigate**: Click breadcrumb items to simulate navigation
- **Feedback**: Toast notifications show action results

All changes are reflected immediately in the UI, demonstrating how the component would behave when connected to a real data source.`,
            },
        },
    },
};
