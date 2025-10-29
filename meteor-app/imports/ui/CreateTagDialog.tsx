import { Box, Button, Form, FormField, Heading, Layer, Text, TextInput } from 'grommet';
import { Close } from 'grommet-icons';
import React, { useState } from 'react';

/**
 * CreateTagDialog component for creating new tags.
 *
 * @remarks
 * Pure presentation component with no Meteor dependencies.
 * Handles form validation, shows error messages, and manages loading state.
 * All touch targets are 44x44px minimum for iOS accessibility.
 */

export interface CreateTagDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;

    /** Callback when dialog should close */
    onClose: () => void;

    /** Callback when user submits the form */
    onSubmit: (tagName: string) => void | Promise<void>;

    /** Whether form is currently submitting */
    isLoading?: boolean;

    /** Error message to display (e.g., duplicate name, network error) */
    errorMessage?: string;

    /** Success message to display */
    successMessage?: string;
}

/**
 * CreateTagDialog component for creating new tags.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [isLoading, setIsLoading] = useState(false);
 * const [error, setError] = useState('');
 *
 * <CreateTagDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={async (name) => {
 *     setIsLoading(true);
 *     try {
 *       await Meteor.callAsync('tags.create', name);
 *       setIsOpen(false);
 *     } catch (err) {
 *       setError(err.message);
 *     } finally {
 *       setIsLoading(false);
 *     }
 *   }}
 *   isLoading={isLoading}
 *   errorMessage={error}
 * />
 * ```
 */
export const CreateTagDialog: React.FC<CreateTagDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    errorMessage,
    successMessage,
}) => {
    const [tagName, setTagName] = useState('');
    const [localError, setLocalError] = useState('');

    const handleClose = (): void => {
        setTagName('');
        setLocalError('');
        onClose();
    };

    const handleSubmit = async (): Promise<void> => {
        // Clear previous errors
        setLocalError('');

        // Validate input
        const trimmedName = tagName.trim();
        if (trimmedName.length === 0) {
            setLocalError('Tag name is required');
            return;
        }

        if (trimmedName.length > 50) {
            setLocalError('Tag name must be 50 characters or less');
            return;
        }

        // Submit
        try {
            await onSubmit(trimmedName);
            // Clear form on success
            setTagName('');
        } catch (error) {
            // Error is handled via errorMessage prop
            console.error('Error creating tag:', error);
        }
    };

    const displayError = errorMessage ?? localError;

    if (!isOpen) {
        return null;
    }

    return (
        <Layer position="center" onClickOutside={isLoading ? undefined : handleClose} onEsc={isLoading ? undefined : handleClose}>
            <Box width="medium" pad="medium" gap="medium">
                {/* Header */}
                <Box direction="row" justify="between" align="center">
                    <Heading level={3} margin="none">
                        Create New Tag
                    </Heading>
                    <Button
                        icon={<Close />}
                        onClick={handleClose}
                        disabled={isLoading}
                        plain
                        style={{ minWidth: '44px', minHeight: '44px' }}
                        aria-label="Close dialog"
                    />
                </Box>

                {/* Form */}
                <Form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleSubmit();
                    }}
                >
                    <FormField label="Tag Name" required>
                        <TextInput
                            placeholder="Enter tag name"
                            value={tagName}
                            onChange={(event) => setTagName(event.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </FormField>

                    {/* Error Message */}
                    {displayError && (
                        <Box
                            background="status-error"
                            pad="small"
                            round="xsmall"
                            margin={{ bottom: 'small' }}
                        >
                            <Text color="white" size="small">
                                {displayError}
                            </Text>
                        </Box>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <Box
                            background="status-ok"
                            pad="small"
                            round="xsmall"
                            margin={{ bottom: 'small' }}
                        >
                            <Text color="white" size="small">
                                {successMessage}
                            </Text>
                        </Box>
                    )}

                    {/* Action Buttons */}
                    <Box direction="row" gap="small" justify="end" margin={{ top: 'medium' }}>
                        <Button
                            label="Cancel"
                            onClick={handleClose}
                            disabled={isLoading}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        />
                        <Button
                            type="submit"
                            label={isLoading ? 'Creating...' : 'Create Tag'}
                            primary
                            disabled={isLoading || tagName.trim().length === 0}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        />
                    </Box>
                </Form>
            </Box>
        </Layer>
    );
};
