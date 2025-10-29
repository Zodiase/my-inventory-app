import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'grommet';
import React from 'react';

const meta: Meta = {
    title: 'UI/AllItemsView',
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

/**
 * AllItemsView displays inventory items in a hierarchical navigation structure.
 *
 * ## Features
 * - Shows items at the current container level
 * - BreadcrumbTrail for navigation context and moving up the hierarchy
 * - Visual distinction between containers (Folder icon) and items
 * - Touch-optimized navigation (44x44px minimum touch targets)
 * - Click containers to navigate into them
 *
 * ## Props
 * - `initialContainerId?: string` - Initial container ID to display. If undefined, shows root level items.
 * - `onNavigate?: (containerId: string | undefined) => void` - Callback when navigating to a different container
 *
 * ## Behavior
 * - Containers are sorted first, then items
 * - Items are sorted alphabetically by name
 * - Clicking a container navigates into it
 * - Breadcrumb trail allows navigation back up the hierarchy
 * - Empty state shown when no items at current level
 *
 * ## Data Requirements
 * This component uses Meteor's reactive data system (`useTracker`) to fetch items from
 * `InventoryItemsCollection`. It requires:
 * - Items with `containerId` matching the current level
 * - Full item documents with `_id`, `name`, `description`, `isContainer`, etc.
 * - Parent containers available for breadcrumb trail construction
 *
 * ## Testing Note
 * Storybook stories for this component require mocking Meteor's reactive data system.
 * The component is best tested in a live Meteor environment or with comprehensive mocks.
 * See the component file for full implementation details.
 */
export const Documentation: Story = {
    render: () => (
        <Box fill pad="large" align="center" justify="center">
            <Box width="large" pad="medium" background="background-front" round="small" gap="small">
                <Text size="large" weight="bold">
                    AllItemsView Component
                </Text>
                <Text>
                    This component provides hierarchical navigation for inventory items. It shows items at the current
                    container level with breadcrumb navigation.
                </Text>
                <Text size="small" color="text-weak">
                    Note: This component requires a Meteor backend to function. Interactive stories would require
                    mocking the Meteor reactive data system.
                </Text>
            </Box>
        </Box>
    ),
};

/**
 * Example structure for stories with mocked data (not functional in this setup):
 *
 * ## Example: Empty Root Level
 * Shows the empty state when no items exist at root level.
 *
 * ## Example: Root with Containers
 * Shows multiple top-level containers (e.g., Home, Garage, Kitchen).
 *
 * ## Example: One Level Deep
 * Shows items inside a container with breadcrumb trail showing the path.
 *
 * ## Example: Two Levels Deep
 * Shows items in a nested container (e.g., Home > Garage > Tool Box).
 *
 * ## Example: Many Items
 * Shows a container with many items to test scrolling and performance.
 *
 * ## Example: Mixed Containers and Items
 * Shows a level with both containers and regular items.
 *
 * ## Example: Long Names
 * Tests how the component handles long item names and descriptions.
 */
export const ExampleScenarios: Story = {
    render: () => (
        <Box fill pad="large" align="center" justify="center">
            <Box width="large" pad="medium" background="background-front" round="small" gap="small">
                <Text size="large" weight="bold">
                    Example Scenarios
                </Text>
                <Text>The following scenarios should be tested with live data:</Text>
                <Box as="ul" pad={{ left: 'medium' }} gap="xsmall">
                    <Text as="li">Empty root level - no items</Text>
                    <Text as="li">Root with only containers (Home, Garage, etc.)</Text>
                    <Text as="li">Root with only items (no hierarchy)</Text>
                    <Text as="li">One level deep (items in a container)</Text>
                    <Text as="li">Two levels deep (nested containers)</Text>
                    <Text as="li">Container with many items (scrolling)</Text>
                    <Text as="li">Long item names and descriptions</Text>
                    <Text as="li">Empty container (exists but has no items)</Text>
                    <Text as="li">Navigation interaction (clicking containers)</Text>
                </Box>
            </Box>
        </Box>
    ),
};
