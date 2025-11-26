import { Box, Button, Form, FormField, Heading, Layer, Text, TextInput } from 'grommet';
import { Close } from 'grommet-icons';
import React, { useState } from 'react';

import { LoadingSpinner } from '/imports/ui/LoadingSpinner';

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
    const [internalLoading, setInternalLoading] = useState(false);

    // Double-submission prevention: use internal state OR external state
    const isActuallyLoading = isLoading || internalLoading;

    const handleClose = (): void => {
        setTagName('');
        setLocalError('');
        onClose();
    };

    const handleSubmit = async (): Promise<void> => {
        // Prevent double-submission
        if (isActuallyLoading) {
            return;
        }

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

        setInternalLoading(true);

        // Submit
        try {
            await onSubmit(trimmedName);
            // Clear form on success
            setTagName('');
        } catch (error) {
            // Error is handled via errorMessage prop
            console.error('Error creating tag:', error);
        } finally {
            setInternalLoading(false);
        }
    };

    const displayError = errorMessage ?? localError;

    if (!isOpen) {
        return null;
    }

    return (
        <Layer
            position="center"
            onClickOutside={isActuallyLoading ? undefined : handleClose}
            onEsc={isActuallyLoading ? undefined : handleClose}
        >
            <Box width="medium" pad="medium" gap="medium" style={{ position: 'relative' }}>
                {/* Show loading spinner overlay during submission */}
                {isActuallyLoading && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '4px',
                        }}
                    >
                        <LoadingSpinner size="medium" />
                    </Box>
                )}

                {/* Header */}
                <Box direction="row" justify="between" align="center">
                    <Heading level={3} margin="none">
                        Create New Tag
                    </Heading>
                    <Button
                        icon={<Close />}
                        onClick={handleClose}
                        disabled={isActuallyLoading}
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
                            disabled={isActuallyLoading}
                            autoFocus
                        />
                    </FormField>

                    {/* Error Message */}
                    {displayError && (
                        <Box background="status-error" pad="small" round="xsmall" margin={{ bottom: 'small' }}>
                            <Text color="white" size="small">
                                {displayError}
                            </Text>
                        </Box>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <Box background="status-ok" pad="small" round="xsmall" margin={{ bottom: 'small' }}>
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
                            disabled={isActuallyLoading}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        />
                        <Button
                            type="submit"
                            label={isActuallyLoading ? 'Creating...' : 'Create Tag'}
                            primary
                            disabled={isActuallyLoading || tagName.trim().length === 0}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        />
                    </Box>
                </Form>
            </Box>
        </Layer>
    );
};
