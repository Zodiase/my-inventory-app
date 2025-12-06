import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import SearchScopeSelector from './SearchScopeSelector';

/**
 * SearchScopeSelector provides a segmented control for switching between
 * global and scoped search modes.
 *
 * ## Features
 * - iOS-style segmented control design
 * - Touch-friendly with 44x44px minimum tap targets
 * - Smooth transition animations
 * - Clear visual indication of active state
 * - Customizable scope label
 */
const meta = {
    title: 'UI/SearchScopeSelector',
    component: SearchScopeSelector,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        value: {
            control: 'radio',
            options: ['global', 'scoped'],
            description: 'Current search scope mode',
        },
        scopeLabel: {
            control: 'text',
            description: 'Label for the scoped search option',
        },
        disabled: {
            control: 'boolean',
            description: 'Whether the selector is disabled',
        },
        onChange: {
            description: 'Callback when scope changes',
            action: 'changed',
        },
    },
} satisfies Meta<typeof SearchScopeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with global mode selected
 */
export const GlobalSelected: Story = {
    args: {
        value: 'global',
        scopeLabel: 'Current',
    },
};

/**
 * Scoped mode selected
 */
export const ScopedSelected: Story = {
    args: {
        value: 'scoped',
        scopeLabel: 'Current',
    },
};

/**
 * Custom scope label
 */
export const CustomScopeLabel: Story = {
    args: {
        value: 'scoped',
        scopeLabel: 'Kitchen',
    },
};

/**
 * Long scope label
 */
export const LongScopeLabel: Story = {
    args: {
        value: 'scoped',
        scopeLabel: 'Top Shelf',
    },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
    args: {
        value: 'global',
        disabled: true,
    },
};

/**
 * Disabled with scoped selected
 */
export const DisabledScoped: Story = {
    args: {
        value: 'scoped',
        scopeLabel: 'Kitchen',
        disabled: true,
    },
};

/**
 * Interactive example with state management
 */
export const Interactive: Story = {
    render: () => {
        const [scope, setScope] = useState<'global' | 'scoped'>('global');
        const [scopeLabel, setScopeLabel] = useState('Kitchen');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                <SearchScopeSelector value={scope} onChange={setScope} scopeLabel={scopeLabel} />
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', minWidth: '300px' }}>
                    <p>
                        <strong>Current scope:</strong> {scope}
                    </p>
                    <p>
                        <strong>Scope label:</strong> {scopeLabel}
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                setScopeLabel('Kitchen');
                            }}
                            style={{
                                padding: '8px 12px',
                                background: scopeLabel === 'Kitchen' ? '#007aff' : 'white',
                                color: scopeLabel === 'Kitchen' ? 'white' : 'black',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Kitchen
                        </button>
                        <button
                            onClick={() => {
                                setScopeLabel('Garage');
                            }}
                            style={{
                                padding: '8px 12px',
                                background: scopeLabel === 'Garage' ? '#007aff' : 'white',
                                color: scopeLabel === 'Garage' ? 'white' : 'black',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Garage
                        </button>
                        <button
                            onClick={() => {
                                setScopeLabel('Basement');
                            }}
                            style={{
                                padding: '8px 12px',
                                background: scopeLabel === 'Basement' ? '#007aff' : 'white',
                                color: scopeLabel === 'Basement' ? 'white' : 'black',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Basement
                        </button>
                    </div>
                </div>
            </div>
        );
    },
};

/**
 * Multiple selectors demonstrating different states
 */
export const MultipleStates: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Global selected</p>
                <SearchScopeSelector value="global" scopeLabel="Current" />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Scoped selected</p>
                <SearchScopeSelector value="scoped" scopeLabel="Kitchen" />
            </div>
            <div>
                <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Disabled</p>
                <SearchScopeSelector value="global" disabled />
            </div>
        </div>
    ),
};

/**
 * Mobile viewport example
 */
export const Mobile: Story = {
    args: {
        value: 'global',
        scopeLabel: 'Current',
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
};
