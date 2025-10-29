import type { Meta, StoryObj } from '@storybook/react';
import { ItemForm } from '/imports/ui/ItemForm';

/**
 * ItemForm is a touch-optimized form for creating and editing inventory items.
 *
 * Built with Grommet components, it provides:
 * - Name field (required, max 500 characters)
 * - Description field (optional, max 5000 characters)
 * - Is Container checkbox
 * - Character counters with color-coded warnings
 * - Touch-optimized inputs (44x44px minimum)
 * - Client-side validation
 * - Loading states during submission
 */
const meta: Meta<typeof ItemForm> = {
    title: 'UI/ItemForm',
    component: ItemForm,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    // Default args for all stories
    args: {
        onSubmit: () => {
            console.log('Form submitted');
        },
        onCancel: () => {
            console.log('Form cancelled');
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state for creating a new item.
 * All fields are empty and the form is ready for input.
 */
export const CreateMode: Story = {
    args: {
        initialValues: {},
        isSubmitting: false,
    },
};

/**
 * Edit mode with an existing item's data pre-filled.
 * Shows how the form looks when editing an existing inventory item.
 */
export const EditMode: Story = {
    args: {
        initialValues: {
            name: 'Camping Tent',
            description: 'A 4-person camping tent with waterproof coating. Includes stakes and carry bag.',
            isContainer: false,
        },
        isSubmitting: false,
    },
};

/**
 * Edit mode for a container item.
 * Container items can hold other items (e.g., "Kitchen Cabinet", "Storage Box").
 */
export const EditContainer: Story = {
    args: {
        initialValues: {
            name: 'Garage Storage Shelf',
            description: 'Metal shelving unit with 5 tiers. Located in garage against north wall.',
            isContainer: true,
        },
        isSubmitting: false,
    },
};

/**
 * Form while submission is in progress.
 * Submit button is disabled and shows loading state.
 */
export const Submitting: Story = {
    args: {
        initialValues: {
            name: 'Power Drill',
            description: '18V cordless drill with battery and charger.',
            isContainer: false,
        },
        isSubmitting: true,
    },
};

/**
 * Form with validation error from server.
 * Shows external error message (e.g., duplicate name, network error).
 */
export const WithError: Story = {
    args: {
        initialValues: {
            name: 'Hammer',
        },
        isSubmitting: false,
        error: 'An item with this name already exists. Please use a different name.',
    },
};

/**
 * Name field approaching character limit (450/500).
 * Character counter turns orange as warning.
 */
export const NameNearLimit: Story = {
    args: {
        initialValues: {
            name: 'A'.repeat(450), // 450 characters
            description: 'This item has a very long name approaching the 500 character limit.',
            isContainer: false,
        },
        isSubmitting: false,
    },
};

/**
 * Name field at character limit (500/500).
 * Character counter turns red and further input is prevented.
 */
export const NameAtLimit: Story = {
    args: {
        initialValues: {
            name: 'A'.repeat(500), // 500 characters - exactly at limit
            description: 'This item name is at the maximum 500 character limit.',
            isContainer: false,
        },
        isSubmitting: false,
    },
};

/**
 * Description field approaching character limit (4500/5000).
 * Character counter turns orange as warning.
 */
export const DescriptionNearLimit: Story = {
    args: {
        initialValues: {
            name: 'Detailed Item',
            description: 'B'.repeat(4500), // 4500 characters
            isContainer: false,
        },
        isSubmitting: false,
    },
};

/**
 * Description field at character limit (5000/5000).
 * Character counter turns red and further input is prevented.
 */
export const DescriptionAtLimit: Story = {
    args: {
        initialValues: {
            name: 'Maximum Description',
            description: 'C'.repeat(5000), // 5000 characters - exactly at limit
            isContainer: false,
        },
        isSubmitting: false,
    },
};

/**
 * Form with no cancel handler.
 * Cancel button is hidden when onCancel is not provided.
 */
export const NoCancelButton: Story = {
    args: {
        initialValues: {
            name: 'Required Item',
        },
        isSubmitting: false,
        onCancel: undefined,
    },
};

/**
 * Empty form requiring validation.
 * Submit button is disabled until required fields are filled.
 */
export const EmptyInvalid: Story = {
    args: {
        initialValues: {},
        isSubmitting: false,
    },
};

/**
 * Form with very long realistic description.
 * Demonstrates proper text wrapping and scrolling behavior.
 */
export const LongDescription: Story = {
    args: {
        initialValues: {
            name: 'Professional Camera Kit',
            description: `Complete professional photography setup including:

Camera Body:
- Canon EOS R5 mirrorless full-frame camera
- 45MP sensor with 8K video capability
- Dual card slots (CFexpress + SD)
- Weather-sealed magnesium alloy body

Lenses:
- RF 24-70mm f/2.8L IS USM (general purpose)
- RF 70-200mm f/2.8L IS USM (telephoto)
- RF 16mm f/2.8 STM (ultra-wide angle)
- EF 100mm f/2.8L Macro IS USM (with adapter)

Accessories:
- 3x LP-E6NH batteries with charger
- Battery grip
- Camera bag (Peak Design Everyday Backpack 30L)
- Lens cleaning kit
- Multiple lens caps and filters
- Remote shutter release
- Tripod mount plate

Storage:
- 4x 128GB CFexpress cards
- 2x 256GB SD cards
- Pelican 1510 hard case for travel

Purchased: March 2023
Warranty: Extended 3-year coverage
Condition: Excellent, minimal wear
Location: Office closet, top shelf`,
            isContainer: false,
        },
        isSubmitting: false,
    },
};
