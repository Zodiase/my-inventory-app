import { Box, Button, Form, FormField, Heading, Layer, Text, TextInput } from 'grommet';
import { Close } from 'grommet-icons';
import React, { useState, useRef } from 'react';

import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { TouchButton } from '/imports/ui/TouchButton';

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

/** Props for the tag creation form (without Layer wrapper) */
export interface CreateTagFormProps {
    /** Callback when user submits the form */
    onSubmit: (tagName: string) => void | Promise<void>;

    /** Callback when user clicks cancel/close */
    onClose: () => void;

    /** Whether form is currently submitting */
    isLoading?: boolean;

    /** Error message to display */
    errorMessage?: string;

    /** Success message to display */
    successMessage?: string;
}

/**
 * CreateTagForm - Tag creation form component (like ItemForm).
 * Pure form content without modal/Layer wrapper for flexible composition.
 * Test this component directly instead of the dialog wrapper.
 */
export const CreateTagForm: React.FC<CreateTagFormProps> = ({
    onSubmit,
    onClose,
    isLoading = false,
    errorMessage,
    successMessage,
}) => {
    const [tagName, setTagName] = useState('');
    const [localError, setLocalError] = useState('');
    const [internalLoading, setInternalLoading] = useState(false);
    const isSubmittingRef = useRef(false); // FR-070: Double-submit prevention

    // Double-submission prevention: use internal state OR external state
    const isActuallyLoading = isLoading || internalLoading;

    // Use external error OR local error
    const displayError = errorMessage ?? localError;

    const handleClose = (): void => {
        if (!isActuallyLoading) {
            setTagName('');
            setLocalError('');
            onClose();
        }
    };

    const handleSubmit = async (): Promise<void> => {
        // FR-070: Prevent double-submission using ref (synchronous guard)
        if (isSubmittingRef.current || isActuallyLoading) {
            return;
        }

        // Validate input
        const trimmedName = tagName.trim();
        if (trimmedName.length === 0) {
            setLocalError('Tag name cannot be empty');
            return;
        }

        const MAX_TAG_NAME_LENGTH = 100;
        if (trimmedName.length > MAX_TAG_NAME_LENGTH) {
            setLocalError('Tag name cannot exceed 100 characters');
            return;
        }

        try {
            isSubmittingRef.current = true; // Set BEFORE async operation
            setInternalLoading(true);
            setLocalError('');

            await onSubmit(trimmedName);

            // Success - clear form
            setTagName('');
        } catch (error: unknown) {
            console.error('Failed to create tag:', error);
            if (error instanceof Error) {
                setLocalError(error.message);
            } else {
                setLocalError('Failed to create tag. Please try again.');
            }
        } finally {
            setInternalLoading(false);
            isSubmittingRef.current = false; // Reset in finally
        }
    };

    return (
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
                <FormField name="name" label="Tag Name">
                    <TextInput
                        name="name"
                        placeholder="Enter tag name"
                        value={tagName}
                        onChange={(event) => {
                            setTagName(event.target.value);
                        }}
                        disabled={isActuallyLoading}
                        autoFocus
                    />
                </FormField>

                {/* Error Message */}
                {displayError !== '' && (
                    <Box background="status-error" pad="small" round="xsmall" margin={{ bottom: 'small' }}>
                        <Text color="white" size="small">
                            {displayError}
                        </Text>
                    </Box>
                )}

                {/* Success Message */}
                {successMessage !== '' && successMessage !== undefined && (
                    <Box background="status-ok" pad="small" round="xsmall" margin={{ bottom: 'small' }}>
                        <Text color="white" size="small">
                            {successMessage}
                        </Text>
                    </Box>
                )}

                {/* Action Buttons */}
                <Box direction="row" gap="small" justify="end" margin={{ top: 'medium' }}>
                    <TouchButton onClick={handleClose} disabled={isActuallyLoading} variant="secondary">
                        Cancel
                    </TouchButton>
                    <TouchButton
                        type="submit"
                        variant="primary"
                        disabled={isActuallyLoading || tagName.trim().length === 0}
                    >
                        {isActuallyLoading ? 'Creating...' : 'Create Tag'}
                    </TouchButton>
                </Box>
            </Form>
        </Box>
    );
};

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
    if (!isOpen) {
        return null;
    }

    return (
        <Layer position="center" onClickOutside={onClose} onEsc={onClose}>
            <CreateTagForm
                onSubmit={onSubmit}
                onClose={onClose}
                isLoading={isLoading}
                errorMessage={errorMessage}
                successMessage={successMessage}
            />
        </Layer>
    );
};
