import { Box, CheckBox, Form, FormField, Text, TextArea, TextInput } from 'grommet';
import type { FormExtendedEvent } from 'grommet';
import React, { useState, useRef, type ReactElement } from 'react';

import { MAX_ITEM_NAME_LENGTH, MAX_ITEM_DESCRIPTION_LENGTH } from '/imports/api/items';
import type { InventoryItem } from '/imports/model/InventoryItem';
import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { TouchButton } from '/imports/ui/TouchButton';
import type RecordInput from '/imports/utility/RecordInput';

/**
 * UI constants for touch-friendly interface
 */
const SCROLL_THRESHOLD_RATIO = 0.9; // When scrolled 90% down, consider near bottom
const SCROLL_PADDING_PX = 50; // Pixels to scroll past element for visibility

// Warning threshold as percentage of max length
const WARNING_THRESHOLD_PERCENT = 0.9;
const MAX_LENGTH_BUFFER = 50;

/**
 * Form for creating or editing inventory items.
 *
 * @remarks
 * Provides fields for:
 * - Name (required, max 500 chars)
 * - Description (optional, max 5000 chars)
 * - Is Container checkbox
 * - Container ID (optional, for placing inside a container)
 * - Tags (array of tag IDs)
 *
 * Built with Grommet for touch-optimized inputs with iOS-style design.
 * All interactive elements meet 44x44px minimum touch target requirements.
 * Includes validation and user-friendly error messages.
 */

export interface ItemFormProps {
    /** Initial values for editing an existing item */
    initialValues?: Partial<RecordInput<InventoryItem>>;

    /** Callback when form is submitted with valid data */
    onSubmit: (values: RecordInput<InventoryItem>) => void | Promise<void>;

    /** Callback when form is cancelled */
    onCancel?: () => void;

    /** Whether the form is currently submitting */
    isSubmitting?: boolean;

    /** External error message to display */
    error?: string;
}

export const ItemForm = ({
    initialValues = {},
    onSubmit,
    onCancel,
    isSubmitting = false,
    error,
}: ItemFormProps): ReactElement => {
    const [name, setName] = useState(initialValues.name ?? '');
    const [description, setDescription] = useState(initialValues.description ?? '');
    const [isContainer, setIsContainer] = useState(initialValues.isContainer ?? false);
    const [validationError, setValidationError] = useState<string>('');
    const [internalSubmitting, setInternalSubmitting] = useState(false);

    /**
     * Double-submission prevention using synchronous ref check.
     *
     * @remarks
     * Uses useRef instead of useState because:
     * - Ref updates are synchronous (can check immediately)
     * - State updates are async (batched by React)
     *
     * This prevents rapid clicks during async operations (database saves, network requests).
     * The ref is set to true when submission starts, checked synchronously on each click,
     * and reset to false when submission completes.
     *
     * Works in conjunction with button disability (internalSubmitting state) for full protection.
     */
    const isSubmittingRef = useRef(false);

    // For UI state (loading spinner, button disabled)
    const isActuallySubmitting = isSubmitting || internalSubmitting;

    const nameLength = name.length;
    const descriptionLength = description.length;

    const handleSubmit = async (event: FormExtendedEvent): Promise<void> => {
        // Prevent double-submission using synchronous ref check FIRST (before preventDefault)
        // This catches rapid clicks that happen while async onSubmit is in progress
        if (isSubmittingRef.current || isSubmitting) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        isSubmittingRef.current = true;
        setValidationError('');
        setInternalSubmitting(true);

        // Validate name
        if (name.trim() === '') {
            setValidationError('Item name is required.');
            setInternalSubmitting(false);
            isSubmittingRef.current = false;
            return;
        }

        if (name.length > MAX_ITEM_NAME_LENGTH) {
            setValidationError(`Item name must be ${MAX_ITEM_NAME_LENGTH} characters or less.`);
            setInternalSubmitting(false);
            isSubmittingRef.current = false;
            return;
        }

        // Validate description if provided
        if (description.length > MAX_ITEM_DESCRIPTION_LENGTH) {
            setValidationError(`Item description must be ${MAX_ITEM_DESCRIPTION_LENGTH} characters or less.`);
            setInternalSubmitting(false);
            isSubmittingRef.current = false;
            return;
        }

        // Build the item data
        const itemData: RecordInput<InventoryItem> = {
            name: name.trim(),
            isContainer,
            tagIds: initialValues.tagIds ?? [],
        };

        // Add optional fields
        if (description.trim() !== '') {
            itemData.description = description.trim();
        }

        if (typeof initialValues.containerId !== 'undefined') {
            itemData.containerId = initialValues.containerId;
        }

        if (typeof initialValues.properties !== 'undefined') {
            itemData.properties = initialValues.properties;
        }

        try {
            await onSubmit(itemData);
        } catch (err) {
            // Error will be shown via the error prop
            console.error('Form submission error:', err);
        } finally {
            setInternalSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const hasValidationError = validationError !== '' && validationError !== null && validationError !== undefined;
    const hasError = error !== '' && error !== null && error !== undefined;
    const displayError = hasValidationError ? validationError : hasError ? error : '';

    return (
        <Form
            onSubmit={(event) => {
                void handleSubmit(event);
            }}
            validate="blur"
        >
            <Box gap="medium" pad="medium" width="large">
                {/* Show loading spinner overlay during submission */}
                {isActuallySubmitting && (
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
                        }}
                    >
                        <LoadingSpinner size="medium" />
                    </Box>
                )}

                {displayError !== undefined && displayError !== '' && (
                    <Box
                        background="status-error"
                        pad="small"
                        round="small"
                        border={{ color: 'status-error', size: 'small' }}
                    >
                        <Text color="white" size="small">
                            {displayError}
                        </Text>
                    </Box>
                )}

                <FormField
                    name="name"
                    label="Name"
                    required
                    help={
                        <Text
                            size="small"
                            color={
                                nameLength > MAX_ITEM_NAME_LENGTH
                                    ? 'status-error'
                                    : nameLength > MAX_ITEM_NAME_LENGTH * SCROLL_THRESHOLD_RATIO
                                    ? 'status-warning'
                                    : 'dark-6'
                            }
                        >
                            {nameLength} / {MAX_ITEM_NAME_LENGTH} characters
                        </Text>
                    }
                >
                    <TextInput
                        name="name"
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value);
                        }}
                        placeholder="Enter item name"
                        disabled={isActuallySubmitting}
                        autoFocus
                        maxLength={MAX_ITEM_NAME_LENGTH + SCROLL_PADDING_PX}
                    />
                </FormField>

                <FormField
                    name="description"
                    label="Description"
                    help={
                        <Text
                            size="small"
                            color={
                                descriptionLength > MAX_ITEM_DESCRIPTION_LENGTH
                                    ? 'status-error'
                                    : descriptionLength > MAX_ITEM_DESCRIPTION_LENGTH * WARNING_THRESHOLD_PERCENT
                                    ? 'status-warning'
                                    : 'dark-6'
                            }
                        >
                            {descriptionLength} / {MAX_ITEM_DESCRIPTION_LENGTH} characters
                        </Text>
                    }
                >
                    <TextArea
                        name="description"
                        value={description}
                        onChange={(event) => {
                            setDescription(event.target.value);
                        }}
                        placeholder="Enter optional description"
                        disabled={isActuallySubmitting}
                        resize="vertical"
                        rows={5}
                        maxLength={5050}
                    />
                </FormField>

                <Box pad={{ vertical: 'small' }}>
                    <CheckBox
                        name="isContainer"
                        label="This item is a container (can hold other items)"
                        checked={isContainer}
                        onChange={(event) => {
                            setIsContainer(event.target.checked);
                        }}
                        disabled={isActuallySubmitting}
                    />
                </Box>

                <Box direction="row" gap="medium" justify="end">
                    {onCancel !== undefined && (
                        <TouchButton
                            type="button"
                            onClick={onCancel}
                            disabled={isActuallySubmitting}
                            variant="secondary"
                        >
                            Cancel
                        </TouchButton>
                    )}
                    <TouchButton type="submit" variant="primary" disabled={isActuallySubmitting || name.trim() === ''}>
                        {isActuallySubmitting
                            ? 'Saving...'
                            : initialValues.name !== undefined
                            ? 'Save Changes'
                            : 'Create Item'}
                    </TouchButton>
                </Box>
            </Box>
        </Form>
    );
};

export default ItemForm;
