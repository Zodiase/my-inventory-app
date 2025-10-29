import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text as GrommetText } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';

import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';

const meta: Meta<typeof AllItemsViewPresentation> = {
    title: 'UI/AllItemsView',
    component: AllItemsViewPresentation,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box fill pad="medium" background="background-back">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AllItemsViewPresentation>;

// Sample data hierarchy
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
    description: 'Two-car garage with storage',
    isContainer: true,
    containerId: 'home',
    tagIds: [],
    createdAt: new Date('2024-01-02'),
    modifiedAt: new Date('2024-01-02'),
};

const kitchen: InventoryItem = {
    _id: 'kitchen',
    name: 'Kitchen',
    description: '',
    isContainer: true,
    containerId: 'home',
    tagIds: [],
    createdAt: new Date('2024-01-03'),
    modifiedAt: new Date('2024-01-03'),
};

const toolBox: InventoryItem = {
    _id: 'toolbox',
    name: 'Tool Box',
    description: 'Red metal tool box',
    isContainer: true,
    containerId: 'garage',
    tagIds: [],
    createdAt: new Date('2024-01-04'),
    modifiedAt: new Date('2024-01-04'),
};

const hammer: InventoryItem = {
    _id: 'hammer',
    name: 'Hammer',
    description: 'Claw hammer, 16oz',
    isContainer: false,
    containerId: 'toolbox',
    tagIds: [],
    createdAt: new Date('2024-01-05'),
    modifiedAt: new Date('2024-01-05'),
};

const screwdriver: InventoryItem = {
    _id: 'screwdriver',
    name: 'Screwdriver Set',
    description: 'Phillips and flathead, 6 pieces',
    isContainer: false,
    containerId: 'toolbox',
    tagIds: [],
    createdAt: new Date('2024-01-06'),
    modifiedAt: new Date('2024-01-06'),
};

const bike: InventoryItem = {
    _id: 'bike',
    name: 'Mountain Bike',
    description: '21-speed mountain bike, blue',
    isContainer: false,
    containerId: 'garage',
    tagIds: [],
    createdAt: new Date('2024-01-07'),
    modifiedAt: new Date('2024-01-07'),
};

/**
 * Empty root level - no items at all
 */
export const EmptyRoot: Story = {
    args: {
        items: [],
        containerPath: [],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Root level with only items (no containers)
 */
export const RootWithOnlyItems: Story = {
    args: {
        items: [
            { ...hammer, containerId: undefined },
            { ...bike, containerId: undefined },
        ],
        containerPath: [],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Root level with only containers
 */
export const RootWithOnlyContainers: Story = {
    args: {
        items: [home, garage, kitchen],
        containerPath: [],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Root level with mixed containers and items
 */
export const RootWithMixedItems: Story = {
    args: {
        items: [home, garage, { ...hammer, containerId: undefined }, { ...bike, containerId: undefined }],
        containerPath: [],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * One level deep - showing items inside a container
 */
export const OneLevelDeep: Story = {
    args: {
        items: [toolBox, bike],
        containerPath: [garage],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Two levels deep - showing items in a nested container
 */
export const TwoLevelsDeep: Story = {
    args: {
        items: [hammer, screwdriver],
        containerPath: [garage, toolBox],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Container with many items
 */
export const ContainerWithManyItems: Story = {
    args: {
        items: [
            { ...toolBox, containerId: 'garage' },
            { ...hammer, _id: 'item1', name: 'Hammer', containerId: 'garage' },
            { ...screwdriver, _id: 'item2', name: 'Screwdriver Set', containerId: 'garage' },
            { ...bike, _id: 'item3', name: 'Mountain Bike', containerId: 'garage' },
            {
                ...hammer,
                _id: 'item5',
                name: 'Wrench Set',
                description: 'Metric and SAE wrenches',
                containerId: 'garage',
            },
            {
                ...bike,
                _id: 'item6',
                name: 'Lawn Mower',
                description: 'Electric lawn mower',
                containerId: 'garage',
            },
            {
                ...hammer,
                _id: 'item7',
                name: 'Extension Cord',
                description: '50ft heavy duty',
                containerId: 'garage',
            },
            {
                ...bike,
                _id: 'item8',
                name: 'Ladder',
                description: '6ft aluminum step ladder',
                containerId: 'garage',
            },
        ],
        containerPath: [garage],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Long item names that might wrap or truncate
 */
export const LongItemNames: Story = {
    args: {
        items: [
            {
                ...garage,
                name: 'Garage Storage Area with Extra Long Name That Should Handle Wrapping',
                description:
                    'This is a very long description that should also wrap or truncate appropriately in the list view',
            },
            {
                ...kitchen,
                name: 'Kitchen Cabinet Organization System with Multiple Shelves and Drawers',
            },
        ],
        containerPath: [],
        showHomeIcon: true,
        onNavigateToContainer: () => {
            console.log('Navigate to container');
        },
        onBreadcrumbNavigate: () => {
            console.log('Breadcrumb navigate');
        },
    },
};

/**
 * Interactive navigation example with state management
 */
export const InteractiveNavigation: Story = {
    render: () => {
        // All items in our mock database
        const allItems: InventoryItem[] = [home, garage, kitchen, toolBox, bike, hammer, screwdriver];

        const [currentContainerId, setCurrentContainerId] = useState<string | undefined>(undefined);
        const [navigationLog, setNavigationLog] = useState<string[]>([]);

        // Filter items at current level
        const items = allItems.filter((item) => item.containerId === currentContainerId);

        // Build breadcrumb path
        const buildPath = (containerId: string | undefined): InventoryItem[] => {
            if (containerId === undefined) return [];
            const container = allItems.find((item) => item._id === containerId);
            if (container === undefined) return [];

            const path: InventoryItem[] = [container];
            let current = container;
            while (current.containerId !== undefined) {
                const parent = allItems.find((item) => item._id === current.containerId);
                if (parent === undefined) break;
                path.unshift(parent);
                current = parent;
            }
            return path;
        };

        const containerPath = buildPath(currentContainerId);

        const handleNavigate = (containerId: string | undefined): void => {
            setCurrentContainerId(containerId);
            const label = containerId === undefined ? 'Root' : `Container: ${containerId}`;
            setNavigationLog((prev) => [...prev, label]);
        };

        return (
            <Box fill gap="medium">
                <AllItemsViewPresentation
                    items={items}
                    containerPath={containerPath}
                    showHomeIcon
                    onNavigateToContainer={(containerId) => {
                        handleNavigate(containerId);
                    }}
                    onBreadcrumbNavigate={(containerId) => {
                        handleNavigate(containerId);
                    }}
                />
                <Box
                    pad="medium"
                    background="background-contrast"
                    round="small"
                    style={{ maxHeight: '200px', overflow: 'auto' }}
                >
                    <GrommetText weight="bold">Navigation Log:</GrommetText>
                    {navigationLog.length === 0 ? (
                        <GrommetText>No navigation yet. Click a container to navigate.</GrommetText>
                    ) : (
                        <Box as="ul" pad={{ left: 'medium' }} gap="xsmall">
                            {navigationLog.map((log, index) => (
                                <GrommetText as="li" key={index}>
                                    {log}
                                </GrommetText>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    },
};
