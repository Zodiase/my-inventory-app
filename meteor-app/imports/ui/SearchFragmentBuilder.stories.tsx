import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import type { SearchFragment } from '/imports/model/SearchFragment';

import SearchFragmentBuilder from './SearchFragmentBuilder';

/**
 * SearchFragmentBuilder allows users to create complex search queries
 * by adding multiple search criteria (filters).
 *
 * ## Features
 * - Add name search filters (partial, case-insensitive)
 * - Add tag inclusion filters (must have these tags)
 * - Add tag exclusion filters (must NOT have these tags)
 * - Add container type filters (containers only, items only, or all)
 * - Visual display of active filters
 * - Easy removal of filters
 * - Touch-friendly with 44x44px minimum tap targets
 */
const meta = {
    title: 'UI/SearchFragmentBuilder',
    component: SearchFragmentBuilder,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        fragments: {
            description: 'Current array of search fragments',
        },
        onChange: {
            description: 'Callback when fragments change',
            action: 'changed',
        },
        availableTags: {
            description: 'Available tags for selection',
        },
    },
} satisfies Meta<typeof SearchFragmentBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTags = [
    { _id: 'tag1', name: 'Electronics' },
    { _id: 'tag2', name: 'Tools' },
    { _id: 'tag3', name: 'Camping' },
    { _id: 'tag4', name: 'Kitchen' },
    { _id: 'tag5', name: 'Sports' },
];

/**
 * Empty state with no fragments
 */
export const Empty: Story = {
    args: {
        fragments: [],
        availableTags: mockTags,
    },
};

/**
 * With a single name filter
 */
export const WithNameFilter: Story = {
    args: {
        fragments: [{ type: 'name', value: 'laptop' }],
        availableTags: mockTags,
    },
};

/**
 * With multiple filters of different types
 */
export const MultipleFilters: Story = {
    args: {
        fragments: [
            { type: 'name', value: 'laptop' },
            { type: 'tagInclude', tagIds: ['tag1'] },
            { type: 'tagExclude', tagIds: ['tag3'] },
            { type: 'containerType', value: 'items' },
        ],
        availableTags: mockTags,
    },
};

/**
 * With tag filters only
 */
export const TagFiltersOnly: Story = {
    args: {
        fragments: [
            { type: 'tagInclude', tagIds: ['tag1'] },
            { type: 'tagInclude', tagIds: ['tag2'] },
            { type: 'tagExclude', tagIds: ['tag4'] },
        ],
        availableTags: mockTags,
    },
};

/**
 * Complex search with many filters
 */
export const ComplexSearch: Story = {
    args: {
        fragments: [
            { type: 'name', value: 'camping' },
            { type: 'tagInclude', tagIds: ['tag3'] },
            { type: 'tagInclude', tagIds: ['tag5'] },
            { type: 'tagExclude', tagIds: ['tag1'] },
            { type: 'containerType', value: 'items' },
        ],
        availableTags: mockTags,
    },
};

/**
 * Without available tags (tags features hidden)
 */
export const NoTags: Story = {
    args: {
        fragments: [{ type: 'name', value: 'search term' }],
        availableTags: [],
    },
};

/**
 * Interactive example with state management
 */
export const Interactive: Story = {
    render: () => {
        const [fragments, setFragments] = useState<SearchFragment[]>([]);

        return (
            <div style={{ maxWidth: '800px' }}>
                <SearchFragmentBuilder fragments={fragments} onChange={setFragments} availableTags={mockTags} />
                <div
                    style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: '#f5f5f5',
                        borderRadius: '8px',
                    }}
                >
                    <h4 style={{ margin: '0 0 12px 0' }}>Current Fragments:</h4>
                    <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                        {JSON.stringify(fragments, null, 2)}
                    </pre>
                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                        <strong>Count:</strong> {fragments.length} filter{fragments.length !== 1 ? 's' : ''}
                    </p>
                    {fragments.length > 0 && (
                        <button
                            onClick={() => {
                                setFragments([]);
                            }}
                            style={{
                                marginTop: '12px',
                                padding: '8px 16px',
                                background: '#ff3b30',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            </div>
        );
    },
};

/**
 * Mobile viewport example
 */
export const Mobile: Story = {
    args: {
        fragments: [
            { type: 'name', value: 'laptop' },
            { type: 'tagInclude', tagIds: ['tag1'] },
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
 * Demonstration of all filter types
 */
export const AllFilterTypes: Story = {
    render: () => {
        const [fragments, setFragments] = useState<SearchFragment[]>([
            { type: 'name', value: 'laptop' },
            { type: 'tagInclude', tagIds: ['tag1', 'tag2'] },
            { type: 'tagExclude', tagIds: ['tag3'] },
            { type: 'containerType', value: 'items' },
            { type: 'containerScope', containerRootId: 'container-123' },
            { type: 'property', field: 'make', value: 'Apple' },
        ]);

        return (
            <div style={{ maxWidth: '800px' }}>
                <h3 style={{ marginTop: 0 }}>All Supported Filter Types</h3>
                <SearchFragmentBuilder fragments={fragments} onChange={setFragments} availableTags={mockTags} />
                <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                    <p>This example shows all possible fragment types:</p>
                    <ul>
                        <li>
                            <strong>Name:</strong> Partial text search
                        </li>
                        <li>
                            <strong>Has Tag:</strong> Items must have specified tags
                        </li>
                        <li>
                            <strong>Not Tag:</strong> Items must NOT have specified tags
                        </li>
                        <li>
                            <strong>Type:</strong> Filter by container vs item
                        </li>
                        <li>
                            <strong>Scope:</strong> Search within specific container
                        </li>
                        <li>
                            <strong>Property:</strong> Search by custom properties
                        </li>
                    </ul>
                </div>
            </div>
        );
    },
};
