import type { Meta, StoryObj } from '@storybook/react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { ContainerSelector } from '/imports/ui/ContainerSelector';

const meta: Meta<typeof ContainerSelector> = {
    title: 'UI/ContainerSelector',
    component: ContainerSelector,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ContainerSelector>;

// Sample container hierarchy
const home: InventoryItem = {
    _id: 'home',
    name: 'Home',
    description: '',
    isContainer: true,
    containerId: undefined,
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const garage: InventoryItem = {
    _id: 'garage',
    name: 'Garage',
    description: '',
    isContainer: true,
    containerId: 'home',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const bedroom: InventoryItem = {
    _id: 'bedroom',
    name: 'Bedroom',
    description: '',
    isContainer: true,
    containerId: 'home',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const closet: InventoryItem = {
    _id: 'closet',
    name: 'Closet',
    description: '',
    isContainer: true,
    containerId: 'bedroom',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const storage: InventoryItem = {
    _id: 'storage',
    name: 'Storage Shelves',
    description: '',
    isContainer: true,
    containerId: 'garage',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const box: InventoryItem = {
    _id: 'box',
    name: 'Camping Equipment Box',
    description: '',
    isContainer: true,
    containerId: 'storage',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

// Story: Empty list with root option
export const EmptyWithRoot: Story = {
    args: {
        containers: [],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Empty list without root option
export const EmptyWithoutRoot: Story = {
    args: {
        containers: [],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: false,
    },
};

// Story: Single container
export const SingleContainer: Story = {
    args: {
        containers: [home],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Flat list (no hierarchy)
export const FlatList: Story = {
    args: {
        containers: [home, garage, bedroom],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Two-level hierarchy
export const TwoLevelHierarchy: Story = {
    args: {
        containers: [home, garage, bedroom],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Three-level hierarchy
export const ThreeLevelHierarchy: Story = {
    args: {
        containers: [home, garage, bedroom, storage, closet],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Deep hierarchy (4 levels)
export const DeepHierarchy: Story = {
    args: {
        containers: [home, garage, bedroom, storage, closet, box],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Root selected
export const RootSelected: Story = {
    args: {
        containers: [home, garage, bedroom, storage],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Top-level container selected
export const TopLevelSelected: Story = {
    args: {
        containers: [home, garage, bedroom, storage],
        selectedContainerId: 'home',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Nested container selected
export const NestedContainerSelected: Story = {
    args: {
        containers: [home, garage, bedroom, storage, closet],
        selectedContainerId: 'storage',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Deep nested container selected
export const DeepNestedSelected: Story = {
    args: {
        containers: [home, garage, bedroom, storage, closet, box],
        selectedContainerId: 'box',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Without root option
export const WithoutRootOption: Story = {
    args: {
        containers: [home, garage, bedroom, storage],
        selectedContainerId: 'garage',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: false,
    },
};

// Story: Disabled selector
export const Disabled: Story = {
    args: {
        containers: [home, garage, bedroom, storage],
        selectedContainerId: 'garage',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
        disabled: true,
    },
};

// Story: Long container names
export const LongContainerNames: Story = {
    args: {
        containers: [
            {
                ...home,
                name: 'Home - Main Residence with Multiple Rooms',
            },
            {
                ...garage,
                name: 'Garage - Two Car Attached Storage Area with Workbench',
            },
            {
                ...storage,
                name: 'Heavy Duty Industrial Metal Storage Shelving Unit System',
            },
            {
                ...box,
                name: 'Large Waterproof Plastic Storage Container for Camping and Outdoor Equipment',
            },
        ],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Many containers (scrollable)
export const ManyContainers: Story = {
    args: {
        containers: [
            home,
            garage,
            bedroom,
            {
                _id: 'kitchen',
                name: 'Kitchen',
                description: '',
                isContainer: true,
                containerId: 'home',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'living-room',
                name: 'Living Room',
                description: '',
                isContainer: true,
                containerId: 'home',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'basement',
                name: 'Basement',
                description: '',
                isContainer: true,
                containerId: 'home',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'attic',
                name: 'Attic',
                description: '',
                isContainer: true,
                containerId: 'home',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            storage,
            closet,
            box,
            {
                _id: 'shed',
                name: 'Garden Shed',
                description: '',
                isContainer: true,
                containerId: 'garage',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
        ],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Special characters in names
export const SpecialCharactersInNames: Story = {
    args: {
        containers: [
            {
                ...home,
                name: 'Home & Garden',
            },
            {
                ...garage,
                name: 'Garage (Main)',
            },
            {
                ...storage,
                name: 'Storage [A-Z]',
            },
            {
                ...box,
                name: 'Box #42',
            },
        ],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Unicode and emoji in names
export const UnicodeInNames: Story = {
    args: {
        containers: [
            {
                ...home,
                name: '🏠 Home',
            },
            {
                ...garage,
                name: '🚗 Garage',
            },
            {
                ...storage,
                name: '📦 Storage',
            },
            {
                ...box,
                name: '⛺ Camping Gear',
            },
        ],
        selectedContainerId: undefined,
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};

// Story: Complex mixed hierarchy
export const ComplexHierarchy: Story = {
    args: {
        containers: [
            home,
            garage,
            bedroom,
            {
                _id: 'kitchen',
                name: 'Kitchen',
                description: '',
                isContainer: true,
                containerId: 'home',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            storage,
            {
                _id: 'toolbox',
                name: 'Toolbox',
                description: '',
                isContainer: true,
                containerId: 'garage',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            closet,
            {
                _id: 'dresser',
                name: 'Dresser',
                description: '',
                isContainer: true,
                containerId: 'bedroom',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'cabinet',
                name: 'Kitchen Cabinet',
                description: '',
                isContainer: true,
                containerId: 'kitchen',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            box,
        ],
        selectedContainerId: 'storage',
        onSelect: (id) => {
            console.log('Selected:', id);
        },
        showRootOption: true,
    },
};
