import type { Meta, StoryObj } from '@storybook/react';

import type { InventoryItem } from '/imports/model/InventoryItem';

import { BreadcrumbTrail } from '/imports/ui/BreadcrumbTrail';

const meta: Meta<typeof BreadcrumbTrail> = {
    title: 'UI/BreadcrumbTrail',
    component: BreadcrumbTrail,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BreadcrumbTrail>;

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

// Story: Single item (just root)
export const SingleItem: Story = {
    args: {
        path: [home],
        onNavigate: (item) => console.log('Navigate to:', item.name),
    },
};

// Story: Single item with home icon
export const SingleItemWithHomeIcon: Story = {
    args: {
        path: [home],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
    },
};

// Story: Two levels (Home > Garage)
export const TwoLevels: Story = {
    args: {
        path: [home, garage],
        onNavigate: (item) => console.log('Navigate to:', item.name),
    },
};

// Story: Two levels with home icon
export const TwoLevelsWithHomeIcon: Story = {
    args: {
        path: [home, garage],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
    },
};

// Story: Three levels (Home > Garage > Storage)
export const ThreeLevels: Story = {
    args: {
        path: [home, garage, storage],
        onNavigate: (item) => console.log('Navigate to:', item.name),
    },
};

// Story: Four levels (deep hierarchy)
export const FourLevelsDeep: Story = {
    args: {
        path: [home, garage, storage, box],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
    },
};

// Story: Many levels (very deep hierarchy)
export const ManyLevels: Story = {
    args: {
        path: [
            home,
            garage,
            storage,
            box,
            {
                _id: 'subfolder1',
                name: 'Subfolder 1',
                description: '',
                isContainer: true,
                containerId: 'box',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
            {
                _id: 'subfolder2',
                name: 'Subfolder 2',
                description: '',
                isContainer: true,
                containerId: 'subfolder1',
                tagIds: [],
                createdAt: new Date('2024-01-01'),
                modifiedAt: new Date('2024-01-01'),
            },
        ],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
    },
};

// Story: Long container names
export const LongContainerNames: Story = {
    args: {
        path: [
            {
                ...home,
                name: 'Home - Main Residence',
            },
            {
                ...garage,
                name: 'Garage - Two Car Storage Area',
            },
            {
                ...storage,
                name: 'Heavy Duty Metal Storage Shelving Unit',
            },
            {
                ...box,
                name: 'Large Plastic Storage Container for Camping Equipment',
            },
        ],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
    },
};

// Story: Without navigation callback (read-only)
export const WithoutNavigation: Story = {
    args: {
        path: [home, garage, storage],
        showHomeIcon: true,
    },
};

// Story: Empty path (should render nothing)
export const EmptyPath: Story = {
    args: {
        path: [],
        onNavigate: (item) => console.log('Navigate to:', item.name),
    },
};

// Story: Navigation disabled (no callback, just display)
export const DisplayOnly: Story = {
    args: {
        path: [home, garage, storage, box],
        showHomeIcon: true,
    },
};

// Story: With custom className
export const WithCustomClass: Story = {
    args: {
        path: [home, garage, storage],
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: true,
        className: 'custom-breadcrumb',
    },
};

// Story: Special characters in names
export const SpecialCharactersInNames: Story = {
    args: {
        path: [
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
        onNavigate: (item) => console.log('Navigate to:', item.name),
    },
};

// Story: Unicode and emoji in names
export const UnicodeInNames: Story = {
    args: {
        path: [
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
        onNavigate: (item) => console.log('Navigate to:', item.name),
        showHomeIcon: false,
    },
};
