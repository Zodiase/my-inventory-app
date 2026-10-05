/**
 * Interaction harness for the shared inventory item dialog frame.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Grommet, Heading, Text } from 'grommet';
import React, { useState } from 'react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { AppShell } from '/imports/ui/AppShell';
import { ItemDialog } from '/imports/ui/ItemDialog';
import { ItemForm } from '/imports/ui/ItemForm';
import { DesignSystemGlobalStyle, theme } from '/imports/ui/theme';

const meta: Meta<typeof ItemDialog> = {
    title: 'UI/ItemDialog',
    component: ItemDialog,
    parameters: {
        layout: 'fullscreen',
    },
    tags: [],
};

export default meta;
type Story = StoryObj<typeof ItemDialog>;

export const Interactive: Story = {
    render: function InteractiveItemDialogStory() {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Box align="center" gap="medium" pad="large">
                <Button
                    primary
                    label="Open Item Dialog"
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
                <Text data-testid="dialog-status">{isOpen ? 'Open' : 'Closed'}</Text>
                {isOpen && (
                    <ItemDialog
                        title="Edit Item"
                        onClose={() => {
                            setIsOpen(false);
                        }}
                    >
                        <Text>Unsaved changes remain untouched when this dialog is dismissed.</Text>
                    </ItemDialog>
                )}
            </Box>
        );
    },
};

/** Exercises the production modal, form, theme and header together without Meteor. */
export const InAppShell: Story = {
    parameters: {
        docs: {
            description: {
                story: `Purpose: create-item modal over the real app header.
Expected composition: title and close control are readable and unobstructed; modal/backdrop cover all app chrome. The form fits the available viewport with internal vertical scrolling where needed, without horizontal overflow.
Required viewports:1280x800 desktop,820x900 tablet,390x844 phone,1600x1000 wide,640x720 and641x720 breakpoint,390x240 short phone.
Responsive changes: desktop centered dialog; narrow view follows production Layer responsive behavior. Short screens scroll dialog content to reach fields and actions; background document remains still.
Interactions: open, focus name, type without saving, scroll to Cancel, close, Escape, backdrop dismissal and reopen. Focus returns to the opening button; background is not interactive while modal is open.
Exclusions: persistence/Meteor, live household data, nested dialogs, physical touch/screen-reader certification and broad modal redesign.`,
            },
        },
    },
    render: function AppShellDialogStory() {
        const [open, setOpen] = useState(false);
        const { hook } = React.useMemo(() => memoryLocation({ path: '/items' }), []);
        return (
            <Grommet theme={theme}>
                <DesignSystemGlobalStyle />
                <Router hook={hook}>
                    <Box height="100vh">
                        <AppShell location="/items">
                            <Heading level={2}>All Items</Heading>
                            <Button
                                label="Create Item"
                                onClick={() => {
                                    setOpen(true);
                                }}
                            />
                            <Text>Workshop inventory</Text>
                            {open && (
                                <ItemDialog
                                    title="Create New Item"
                                    onClose={() => {
                                        setOpen(false);
                                    }}
                                >
                                    <ItemForm
                                        onSubmit={() => undefined}
                                        onCancel={() => {
                                            setOpen(false);
                                        }}
                                        availableTags={[
                                            {
                                                _id: 'camping',
                                                createdAt: new Date('2026-01-01'),
                                                modifiedAt: new Date('2026-01-01'),
                                                name: 'Camping',
                                                parentTagId: '',
                                                path: [{ _id: 'camping', name: 'Camping' }],
                                            },
                                            {
                                                _id: 'tools',
                                                createdAt: new Date('2026-01-01'),
                                                modifiedAt: new Date('2026-01-01'),
                                                name: 'Tools',
                                                parentTagId: '',
                                                path: [{ _id: 'tools', name: 'Tools' }],
                                            },
                                        ]}
                                    />
                                </ItemDialog>
                            )}
                        </AppShell>
                    </Box>
                </Router>
            </Grommet>
        );
    },
};
