import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { DeleteContainerDialog } from '/imports/ui/DeleteContainerDialog';
import type { DeletionStrategy } from '/imports/ui/DeleteContainerDialog';

const meta: Meta<typeof DeleteContainerDialog> = {
    title: 'UI/DeleteContainerDialog',
    component: DeleteContainerDialog,
    parameters: {
        layout: 'fullscreen',
        docs: {
            story: {
                inline: false,
                iframeHeight: 600,
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DeleteContainerDialog>;

// Sample container
const sampleContainer: InventoryItem = {
    _id: 'garage-storage',
    name: 'Garage Storage',
    description: '',
    isContainer: true,
    containerId: 'garage',
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const rootContainer: InventoryItem = {
    _id: 'home',
    name: 'Home',
    description: '',
    isContainer: true,
    containerId: undefined,
    tagIds: [],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

// Story: Few children (5 items)
export const FewChildren: Story = {
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 5,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Single child
export const SingleChild: Story = {
    args: {
        container: sampleContainer,
        childCount: 1,
        totalDescendants: 1,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Many children (50 items)
export const ManyChildren: Story = {
    args: {
        container: sampleContainer,
        childCount: 50,
        totalDescendants: 50,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Nested descendants (12 direct, 45 total)
export const NestedDescendants: Story = {
    args: {
        container: sampleContainer,
        childCount: 12,
        totalDescendants: 45,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Root level container (no parent)
export const RootLevelContainer: Story = {
    args: {
        container: rootContainer,
        childCount: 8,
        totalDescendants: 8,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Option B with container selected
export const WithContainerSelected: Story = {
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 5,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
        onSelectContainer: () => {
            console.log('Select container');
        },
        selectedTargetContainerId: 'bedroom-closet',
        selectedTargetContainerName: 'Bedroom Closet',
    },
};

// Story: Option B without container selected
export const WithoutContainerSelected: Story = {
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 5,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
        onSelectContainer: () => {
            console.log('Select container');
        },
    },
};

// Story: Deletion in progress
export const DeletionInProgress: Story = {
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 5,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
        isDeleting: true,
    },
};

// Story: With error message
export const WithError: Story = {
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 5,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
        error: 'Failed to delete container. Please try again.',
    },
};

// Story: Long container name
export const LongContainerName: Story = {
    args: {
        container: {
            ...sampleContainer,
            name: 'Large Plastic Storage Container for Camping and Outdoor Equipment in the Garage',
        },
        childCount: 15,
        totalDescendants: 15,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Interactive - can change strategies
export const Interactive: Story = {
    render: (args) => {
        const [targetId, setTargetId] = useState<string | undefined>();

        return (
            <DeleteContainerDialog
                {...args}
                onConfirm={(newStrategy, newTargetId) => {
                    setTargetId(newTargetId);
                    console.log('Confirm:', newStrategy, newTargetId);
                }}
                selectedTargetContainerId={targetId}
            />
        );
    },
    args: {
        container: sampleContainer,
        childCount: 5,
        totalDescendants: 12,
        onCancel: () => {
            console.log('Cancel');
        },
        onSelectContainer: () => {
            console.log('Select container - simulating selection...');
        },
    },
};

// Story: Empty container (edge case)
export const EmptyContainer: Story = {
    args: {
        container: sampleContainer,
        childCount: 0,
        totalDescendants: 0,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Large number of descendants
export const LargeDescendantCount: Story = {
    args: {
        container: sampleContainer,
        childCount: 25,
        totalDescendants: 250,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Special characters in container name
export const SpecialCharactersInName: Story = {
    args: {
        container: {
            ...sampleContainer,
            name: 'Storage & Organization (Box #42)',
        },
        childCount: 7,
        totalDescendants: 7,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};

// Story: Unicode and emoji in container name
export const UnicodeInName: Story = {
    args: {
        container: {
            ...sampleContainer,
            name: '📦 Storage Container 🏠',
        },
        childCount: 10,
        totalDescendants: 10,
        onConfirm: (strategy: DeletionStrategy, targetId?: string) => {
            console.log('Confirm:', strategy, targetId);
        },
        onCancel: () => {
            console.log('Cancel');
        },
    },
};
