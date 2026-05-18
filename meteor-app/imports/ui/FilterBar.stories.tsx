import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import type { SearchFragment } from '/imports/model/SearchFragment';

import { FilterBar } from './FilterBar';

const meta = {
    title: 'FilterBar',
    component: FilterBar,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock tags for demonstration
const mockTags = [
    { _id: 'tag1', name: 'Electronics' },
    { _id: 'tag2', name: 'Office Supplies' },
    { _id: 'tag3', name: 'Tools' },
    { _id: 'tag4', name: 'Kitchen' },
];

/**
 * Empty state - no filters active
 */
export const Empty: Story = {
    args: {
        filters: [],
        availableTags: mockTags,
        alwaysShow: true,
    },
};

/**
 * Hidden when empty (default behavior)
 */
export const HiddenWhenEmpty: Story = {
    args: {
        filters: [],
        availableTags: mockTags,
        alwaysShow: false,
    },
};

/**
 * Single name filter
 */
export const SingleNameFilter: Story = {
    args: {
        filters: [{ type: 'name', value: 'screwdriver' }],
        availableTags: mockTags,
    },
};

/**
 * Multiple filters of different types
 */
export const MultipleFilters: Story = {
    args: {
        filters: [
            { type: 'name', value: 'laptop' },
            { type: 'tagInclude', tagIds: ['tag1', 'tag2'] },
            { type: 'containerType', value: 'items' },
        ],
        availableTags: mockTags,
    },
};

/**
 * Tag include and exclude filters
 */
export const TagFilters: Story = {
    args: {
        filters: [
            { type: 'tagInclude', tagIds: ['tag1', 'tag4'] },
            { type: 'tagExclude', tagIds: ['tag3'] },
        ],
        availableTags: mockTags,
    },
};

/**
 * Container type filters
 */
export const ContainerTypeFilters: Story = {
    args: {
        filters: [
            { type: 'containerType', value: 'containers' },
            { type: 'containerScope', containerRootId: 'container123' },
        ],
        availableTags: mockTags,
    },
};

/**
 * Property filters
 */
export const PropertyFilters: Story = {
    args: {
        filters: [
            { type: 'property', field: 'purchasePrice', value: 500 },
            { type: 'property', field: 'condition', value: 'excellent' },
        ],
        availableTags: mockTags,
    },
};

/**
 * Many filters (stress test)
 */
export const ManyFilters: Story = {
    args: {
        filters: [
            { type: 'name', value: 'test' },
            { type: 'tagInclude', tagIds: ['tag1'] },
            { type: 'tagInclude', tagIds: ['tag2'] },
            { type: 'tagExclude', tagIds: ['tag3'] },
            { type: 'containerType', value: 'items' },
            { type: 'property', field: 'purchasePrice', value: 100 },
            { type: 'property', field: 'make', value: 'Apple' },
        ],
        availableTags: mockTags,
    },
};

/**
 * Interactive example with state management
 */
export const Interactive: Story = {
    render: () => {
        const [filters, setFilters] = useState<SearchFragment[]>([
            { type: 'name', value: 'keyboard' },
            { type: 'tagInclude', tagIds: ['tag1', 'tag2'] },
            { type: 'containerType', value: 'items' },
        ]);

        return (
            <div>
                <FilterBar
                    filters={filters}
                    onChange={setFilters}
                    onClearAll={() => {
                        console.log('Clear all clicked');
                        setFilters([]);
                    }}
                    availableTags={mockTags}
                />
                <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0 }}>Current Filters:</h4>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(filters, null, 2)}</pre>
                </div>
            </div>
        );
    },
};

/**
 * Long filter values (wrapping behavior)
 */
export const LongValues: Story = {
    args: {
        filters: [
            {
                type: 'name',
                value: 'This is a very long search query that might wrap to multiple lines',
            },
            {
                type: 'tagInclude',
                tagIds: ['tag1', 'tag2', 'tag3', 'tag4'],
            },
        ],
        availableTags: mockTags,
    },
};

/**
 * Mobile viewport
 */
export const Mobile: Story = {
    args: {
        filters: [
            { type: 'name', value: 'phone' },
            { type: 'tagInclude', tagIds: ['tag1'] },
            { type: 'containerType', value: 'items' },
        ],
        availableTags: mockTags,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
};

/**
 * Missing tag names (shows IDs)
 */
export const MissingTagNames: Story = {
    args: {
        filters: [
            { type: 'tagInclude', tagIds: ['unknown-tag-1', 'unknown-tag-2'] },
            { type: 'tagExclude', tagIds: ['unknown-tag-3'] },
        ],
        availableTags: [],
    },
};

/**
 * All filter types in one display
 */
export const AllFilterTypes: Story = {
    args: {
        filters: [
            { type: 'name', value: 'widget' },
            { type: 'tagInclude', tagIds: ['tag1'] },
            { type: 'tagExclude', tagIds: ['tag3'] },
            { type: 'containerType', value: 'containers' },
            { type: 'containerScope', containerRootId: 'root-container' },
            { type: 'property', field: 'marketValue', value: 10 },
        ],
        availableTags: mockTags,
    },
};
