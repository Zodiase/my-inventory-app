import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Box, Button, Text } from 'grommet';

import { CreateTagDialog } from '/imports/ui/CreateTagDialog';

const meta: Meta<typeof CreateTagDialog> = {
    title: 'UI/CreateTagDialog',
    component: CreateTagDialog,
    parameters: {
        layout: 'fullscreen',
        docs: {
            story: {
                inline: false,
                iframeHeight: 500,
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CreateTagDialog>;

// Story: Dialog closed
export const Closed: Story = {
    args: {
        isOpen: false,
        onClose: () => console.log('Close clicked'),
        onSubmit: (name) => console.log('Submit:', name),
    },
};

// Story: Dialog open with empty form
export const Open: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                />
            </Box>
        );
    },
};

// Story: With validation error (empty name)
export const WithLocalValidationError: Story = {
    render: () => {
        const [error, setError] = useState('');

        return (
            <CreateTagDialog
                isOpen
                onClose={() => console.log('Close clicked')}
                onSubmit={(name) => {
                    if (name.trim().length === 0) {
                        setError('Tag name is required');
                    } else {
                        console.log('Submit:', name);
                    }
                }}
                errorMessage={error}
            />
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Try submitting with an empty name to see validation error.',
            },
        },
    },
};

// Story: With server error (duplicate name)
export const WithDuplicateNameError: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog (with error)" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                    errorMessage="A tag with this name already exists"
                />
            </Box>
        );
    },
};

// Story: With network error
export const WithNetworkError: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog (network error)" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                    errorMessage="Network error: Unable to connect to server"
                />
            </Box>
        );
    },
};

// Story: Loading state
export const Loading: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog (loading)" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                    isLoading={true}
                />
            </Box>
        );
    },
};

// Story: Success message
export const WithSuccessMessage: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog (success)" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                    successMessage="Tag created successfully!"
                />
            </Box>
        );
    },
};

// Story: Long tag name
export const WithLongTagName: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Button label="Open Dialog (validation error)" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                    errorMessage="Tag name must be 50 characters or less"
                />
            </Box>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows validation error for tag names exceeding 50 characters.',
            },
        },
    },
};

// Story: Fully Interactive
export const FullyInteractive: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState('');
        const [success, setSuccess] = useState('');
        const [createdTags, setCreatedTags] = useState<string[]>([]);

        const handleSubmit = async (name: string): Promise<void> => {
            setIsLoading(true);
            setError('');
            setSuccess('');

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Check for duplicate (case-insensitive)
            if (createdTags.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
                setError('A tag with this name already exists');
                setIsLoading(false);
                return;
            }

            // Success
            setCreatedTags([...createdTags, name]);
            setSuccess('Tag created successfully!');
            setIsLoading(false);

            // Close dialog after short delay
            setTimeout(() => {
                setIsOpen(false);
                setSuccess('');
            }, 1500);
        };

        return (
            <Box gap="medium" align="center" pad="large">
                <Button
                    label="Create New Tag"
                    onClick={() => setIsOpen(true)}
                    primary
                />

                {createdTags.length > 0 && (
                    <Box gap="small">
                        <Text weight="bold">Created Tags:</Text>
                        {createdTags.map((tag, index) => (
                            <Box
                                key={index}
                                background="light-2"
                                pad="small"
                                round="small"
                            >
                                <Text>{tag}</Text>
                            </Box>
                        ))}
                    </Box>
                )}

                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => {
                        setIsOpen(false);
                        setError('');
                        setSuccess('');
                    }}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    errorMessage={error}
                    successMessage={success}
                />
            </Box>
        );
    },
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: `**Fully Interactive Demo**

Click "Create New Tag" to open the dialog. Try:
- Creating a tag with a valid name (success)
- Creating a duplicate tag (error)
- Submitting with empty name (validation error)
- Canceling the dialog

Created tags are shown below the button. The dialog simulates a 1-second API call and includes case-insensitive duplicate checking.`,
            },
        },
    },
};

// Story: With keyboard navigation
export const KeyboardNavigation: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box gap="medium" align="center" pad="large">
                <Text>Press Escape to close, or Tab to navigate between fields</Text>
                <Button label="Open Dialog" onClick={() => setIsOpen(true)} primary />
                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(name) => console.log('Submit:', name)}
                />
            </Box>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates keyboard navigation. Press Escape to close, Tab to navigate, Enter to submit.',
            },
        },
    },
};

// Story: Multiple states sequence
export const StateSequence: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

        const handleSubmit = async (name: string): Promise<void> => {
            console.log('Submitting:', name);
            setState('loading');
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Simulate random success/error
            if (Math.random() > 0.5) {
                setState('success');
                setTimeout(() => {
                    setIsOpen(false);
                    setState('idle');
                }, 1500);
            } else {
                setState('error');
                setTimeout(() => setState('idle'), 3000);
            }
        };

        return (
            <Box gap="medium" align="center" pad="large">
                <Button
                    label="Open Dialog (Random Success/Error)"
                    onClick={() => setIsOpen(true)}
                    primary
                />

                <CreateTagDialog
                    isOpen={isOpen}
                    onClose={() => {
                        setIsOpen(false);
                        setState('idle');
                    }}
                    onSubmit={handleSubmit}
                    isLoading={state === 'loading'}
                    errorMessage={state === 'error' ? 'Random error occurred. Try again!' : undefined}
                    successMessage={state === 'success' ? 'Tag created successfully!' : undefined}
                />
            </Box>
        );
    },
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: 'Shows the full state sequence: idle → loading → success/error. Each submission has a 50% chance of success or error.',
            },
        },
    },
};
