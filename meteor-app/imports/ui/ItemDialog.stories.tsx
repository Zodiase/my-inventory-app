/**
 * Interaction harness for the shared inventory item dialog frame.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Text } from 'grommet';
import React, { useState } from 'react';

import { ItemDialog } from '/imports/ui/ItemDialog';

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
