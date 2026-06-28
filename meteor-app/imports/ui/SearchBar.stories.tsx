import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import SearchBar from './SearchBar';

/**
 * SearchBar provides a compact command surface for search queries.
 *
 * ## Features
 * - Touch-friendly design with 44x44px minimum tap targets
 * - Clear/reset functionality
 * - Submit button for touch users
 * - Enter key to execute search
 * - Visual feedback for focus state
 */
const meta = {
    title: 'UI/SearchBar',
    component: SearchBar,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        searchMode: {
            control: 'radio',
            options: ['global', 'scoped'],
            description: 'Search mode: global searches all items, scoped searches current container',
        },
        value: {
            control: 'text',
            description: 'Current search query text',
        },
        placeholder: {
            control: 'text',
            description: 'Placeholder text for the input',
        },
        scopeLabel: {
            control: 'text',
            description: 'Label for scoped search (e.g., "In: Kitchen")',
        },
        onSearch: {
            description: 'Callback when search is executed (Enter key or search button)',
            action: 'search',
        },
        onChange: {
            description: 'Callback when search query text changes',
            action: 'change',
        },
        onClear: {
            description: 'Callback when clear button is clicked',
            action: 'clear',
        },
    },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default global search mode with no query
 */
export const GlobalEmpty: Story = {
    args: {
        searchMode: 'global',
        value: '',
        placeholder: 'Search items...',
    },
};

/**
 * Global search with query text
 */
export const GlobalWithQuery: Story = {
    args: {
        searchMode: 'global',
        value: 'laptop',
        placeholder: 'Search items...',
    },
};

/**
 * Scoped search in current container
 */
export const ScopedEmpty: Story = {
    args: {
        searchMode: 'scoped',
        value: '',
        placeholder: 'Search in container...',
        scopeLabel: 'In: Kitchen',
    },
};

/**
 * Search with query
 */
export const ScopedWithQuery: Story = {
    args: {
        searchMode: 'scoped',
        value: 'spoon',
        placeholder: 'Search in container...',
        scopeLabel: 'In: Kitchen',
    },
};

/**
 * Custom placeholder text
 */
export const CustomPlaceholder: Story = {
    args: {
        searchMode: 'global',
        value: '',
        placeholder: 'Find your items...',
    },
};

/**
 * Interactive example with state management
 */
export const Interactive: Story = {
    render: () => {
        const [query, setQuery] = useState('');
        const [mode, setMode] = useState<'global' | 'scoped'>('global');
        const [lastSearch, setLastSearch] = useState('');

        return (
            <div style={{ maxWidth: '600px' }}>
                <SearchBar
                    value={query}
                    searchMode={mode}
                    scopeLabel="In: Garage"
                    onChange={setQuery}
                    onSearch={(q) => {
                        setLastSearch(q);
                    }}
                    onClear={() => {
                        setQuery('');
                        setLastSearch('');
                    }}
                />
                <div style={{ marginTop: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p>
                        <strong>Current query:</strong> {query || '(empty)'}
                    </p>
                    <p>
                        <strong>Last search:</strong> {lastSearch || '(none)'}
                    </p>
                    <p>
                        <strong>Mode:</strong> {mode}
                    </p>
                    <button
                        onClick={() => {
                            setMode(mode === 'global' ? 'scoped' : 'global');
                        }}
                        style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            background: '#007aff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                        }}
                    >
                        Toggle Mode
                    </button>
                </div>
            </div>
        );
    },
};

/**
 * Deterministic test harness for Playwright component tests.
 */
export const TestInteractions: Story = {
    render: () => {
        const [query, setQuery] = useState('');
        const [lastSearch, setLastSearch] = useState('');
        const [searchCount, setSearchCount] = useState(0);
        const [clearCount, setClearCount] = useState(0);

        return (
            <div style={{ maxWidth: '600px' }}>
                <SearchBar
                    value={query}
                    onChange={setQuery}
                    onSearch={(nextQuery) => {
                        setLastSearch(nextQuery);
                        setSearchCount((count) => count + 1);
                    }}
                    onClear={() => {
                        setQuery('');
                        setClearCount((count) => count + 1);
                    }}
                />
                <div style={{ marginTop: '16px' }}>
                    <div data-testid="current-query">{query || '(empty)'}</div>
                    <div data-testid="last-search">{lastSearch || '(none)'}</div>
                    <div data-testid="search-count">{searchCount}</div>
                    <div data-testid="clear-count">{clearCount}</div>
                </div>
            </div>
        );
    },
};

/**
 * Long scope label to test text wrapping
 */
export const LongScopeLabel: Story = {
    args: {
        searchMode: 'scoped',
        value: '',
        scopeLabel: 'In: Kitchen > Cabinet > Top Shelf > Left Side',
    },
};

/**
 * Mobile viewport example
 */
export const Mobile: Story = {
    args: {
        searchMode: 'global',
        value: 'search query',
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
};
