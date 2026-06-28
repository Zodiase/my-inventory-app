import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';

import SearchResultsView from './SearchResultsView';

/**
 * SearchResultsView displays search results with breadcrumb context.
 *
 * ## Features
 * - Touch-friendly item cards with 44px+ height
 * - Container type badges (container vs item)
 * - Breadcrumb trails showing item location
 * - Tag chips for each item
 * - Loading state with spinner
 * - Empty state with helpful message
 * - Result count header
 */
const meta = {
    title: 'UI/SearchResultsView',
    component: SearchResultsView,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        items: {
            description: 'Array of search result items',
        },
        onItemClick: {
            description: 'Callback when an item is clicked/tapped',
            action: 'item-clicked',
        },
        loading: {
            control: 'boolean',
            description: 'Whether results are currently loading',
        },
        hasSearched: {
            control: 'boolean',
            description: 'Whether the user has executed at least one search',
        },
        getItemPath: {
            description: 'Optional function to get breadcrumb path for an item',
        },
    },
} satisfies Meta<typeof SearchResultsView>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockItems: InventoryItem[] = [
    {
        _id: 'item1',
        name: 'Gaming Laptop',
        description: 'High-performance laptop for gaming and development',
        isContainer: false,
        tagIds: ['electronics', 'portable'],
        containerId: 'desk1',
        createdAt: new Date(),
        modifiedAt: new Date(),
    },
    {
        _id: 'item2',
        name: 'Toolbox',
        description: 'Red metal toolbox with multiple compartments',
        isContainer: true,
        tagIds: ['tools', 'storage'],
        containerId: 'garage1',
        createdAt: new Date(),
        modifiedAt: new Date(),
    },
    {
        _id: 'item3',
        name: 'Camping Tent',
        description: '4-person waterproof tent',
        isContainer: false,
        tagIds: ['camping', 'outdoor'],
        createdAt: new Date(),
        modifiedAt: new Date(),
    },
];

const mockPath: Record<string, InventoryItem[]> = {
    item1: [
        {
            _id: 'room1',
            name: 'Office',
            isContainer: true,
            tagIds: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        },
        {
            _id: 'desk1',
            name: 'Desk',
            isContainer: true,
            tagIds: [],
            containerId: 'room1',
            createdAt: new Date(),
            modifiedAt: new Date(),
        },
        mockItems[0],
    ],
    item2: [
        {
            _id: 'garage1',
            name: 'Garage',
            isContainer: true,
            tagIds: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        },
        mockItems[1],
    ],
    item3: [mockItems[2]],
};

/**
 * Initial state before a search is run
 */
export const Initial: Story = {
    args: {
        items: [],
        loading: false,
        hasSearched: false,
    },
};

/**
 * Empty state with no results
 */
export const Empty: Story = {
    args: {
        items: [],
        loading: false,
    },
};

/**
 * Loading state
 */
export const Loading: Story = {
    args: {
        items: [],
        loading: true,
    },
};

/**
 * Single result
 */
export const SingleResult: Story = {
    args: {
        items: [mockItems[0]],
        loading: false,
        getItemPath: (itemId) => mockPath[itemId] ?? [],
    },
};

/**
 * Multiple results with breadcrumbs
 */
export const MultipleResults: Story = {
    args: {
        items: mockItems,
        loading: false,
        getItemPath: (itemId) => mockPath[itemId] ?? [],
    },
};

/**
 * Results without breadcrumb paths
 */
export const WithoutBreadcrumbs: Story = {
    args: {
        items: mockItems,
        loading: false,
    },
};

/**
 * Items with no tags
 */
export const NoTags: Story = {
    args: {
        items: [
            {
                ...mockItems[0],
                tagIds: [],
            },
            {
                ...mockItems[1],
                tagIds: [],
            },
        ],
        loading: false,
    },
};

/**
 * Items with no descriptions
 */
export const NoDescriptions: Story = {
    args: {
        items: [
            {
                ...mockItems[0],
                description: undefined,
            },
            {
                ...mockItems[1],
                description: undefined,
            },
        ],
        loading: false,
        getItemPath: (itemId) => mockPath[itemId] ?? [],
    },
};

/**
 * Many results (scrolling example)
 */
export const ManyResults: Story = {
    args: {
        items: Array.from({ length: 20 }, (_, i) => ({
            _id: `item${i}`,
            name: `Item ${i + 1}`,
            description: `Description for item ${i + 1}`,
            isContainer: i % 3 === 0,
            tagIds: i % 2 === 0 ? ['tag1', 'tag2'] : ['tag3'],
            createdAt: new Date(),
            modifiedAt: new Date(),
        })),
        loading: false,
    },
};

/**
 * Long item names and descriptions
 */
export const LongContent: Story = {
    args: {
        items: [
            {
                _id: 'item1',
                name: 'Very Long Item Name That Should Wrap to Multiple Lines on Small Screens',
                description:
                    'This is a very long description that contains a lot of information about the item. It should wrap nicely and remain readable even on smaller screens.',
                isContainer: false,
                tagIds: ['electronics', 'portable', 'expensive'],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
        ],
        loading: false,
        getItemPath: () => [
            {
                _id: 'path1',
                name: 'Very Long Container Name',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            {
                _id: 'path2',
                name: 'Another Long Container',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
        ],
    },
};

/**
 * Deep breadcrumb path
 */
export const DeepBreadcrumb: Story = {
    args: {
        items: [mockItems[0]],
        loading: false,
        getItemPath: () => [
            {
                _id: 'root',
                name: 'Home',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            {
                _id: 'floor1',
                name: 'Second Floor',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            {
                _id: 'room1',
                name: 'Office',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            {
                _id: 'desk1',
                name: 'Desk',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            {
                _id: 'drawer1',
                name: 'Top Drawer',
                isContainer: true,
                tagIds: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
            },
            mockItems[0],
        ],
    },
};

/**
 * Mobile viewport example
 */
export const Mobile: Story = {
    args: {
        items: mockItems,
        loading: false,
        getItemPath: (itemId) => mockPath[itemId] ?? [],
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
};
