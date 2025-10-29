import type { Meta, StoryObj } from '@storybook/react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';

import { ItemDetailView } from '/imports/ui/ItemDetailView';

const meta: Meta<typeof ItemDetailView> = {
    title: 'UI/ItemDetailView',
    component: ItemDetailView,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ItemDetailView>;

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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
    },
};

// Story: Container item (shows folder icon)
export const ContainerItem: Story = {
    args: {
        item: containerItem,
        containerPath: [rootContainer],
        tags: [],
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
    },
};

// Story: Disabled actions
export const DisabledActions: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
        disabled: true,
    },
};

// Story: No action callbacks (read-only mode)
export const ReadOnlyMode: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
    },
};

// Story: Only edit button (no move or delete)
export const EditOnly: Story = {
    args: {
        item: sampleItem,
        containerPath: sampleContainerPath,
        tags: sampleTags,
        onEdit: () => console.log('Edit clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
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
        onEdit: () => console.log('Edit clicked'),
        onDelete: () => console.log('Delete clicked'),
        onMove: () => console.log('Move clicked'),
        onNavigateToContainer: (id) => console.log('Navigate to:', id),
        onRemoveTag: (tagId) => console.log('Remove tag:', tagId),
    },
};
