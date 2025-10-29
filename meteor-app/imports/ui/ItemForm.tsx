import React, { useState, type ReactElement } from 'react';
import { Box, Button, CheckBox, Form, FormField, Text, TextArea, TextInput } from 'grommet';
import type { FormExtendedEvent } from 'grommet';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type RecordInput from '/imports/utility/RecordInput';

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

    const nameLength = name.length;
    const descriptionLength = description.length;

    const handleSubmit = async (event: FormExtendedEvent): Promise<void> => {
        event.preventDefault();
        setValidationError('');

        // Validate name
        if (name.trim() === '') {
            setValidationError('Item name is required.');
            return;
        }

        if (name.length > 500) {
            setValidationError('Item name must be 500 characters or less.');
            return;
        }

        // Validate description if provided
        if (description.length > 5000) {
            setValidationError('Item description must be 5000 characters or less.');
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
        }
    };

    const displayError = validationError || error;

    return (
        <Form onSubmit={handleSubmit}>
            <Box gap="medium" pad="medium" width="large">
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
                    label="Name"
                    required
                    help={
                        <Text
                            size="small"
                            color={nameLength > 500 ? 'status-error' : nameLength > 450 ? 'status-warning' : 'dark-6'}
                        >
                            {nameLength} / 500 characters
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
                        disabled={isSubmitting}
                        autoFocus
                        maxLength={550}
                    />
                </FormField>

                <FormField
                    label="Description"
                    help={
                        <Text
                            size="small"
                            color={
                                descriptionLength > 5000
                                    ? 'status-error'
                                    : descriptionLength > 4500
                                    ? 'status-warning'
                                    : 'dark-6'
                            }
                        >
                            {descriptionLength} / 5000 characters
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                    />
                </Box>

                <Box direction="row" gap="medium" justify="end">
                    {onCancel !== undefined && (
                        <Button type="button" label="Cancel" onClick={onCancel} disabled={isSubmitting} secondary />
                    )}
                    <Button
                        type="submit"
                        label={
                            isSubmitting
                                ? 'Saving...'
                                : initialValues.name !== undefined
                                ? 'Save Changes'
                                : 'Create Item'
                        }
                        primary
                        disabled={isSubmitting || name.trim() === ''}
                    />
                </Box>
            </Box>
        </Form>
    );
};

export default ItemForm;
