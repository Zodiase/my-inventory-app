import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'grommet';

/**
 * A simple test component used by Playwright E2E tests to validate
 * the storybook-helpers.ts utility functions.
 *
 * This story should NOT be deleted or renamed as it's used by automated tests.
 */
const TestComponent = () => {
    return (
        <Box pad="medium" data-testid="storybook-test-component">
            <Text>Storybook Test Component</Text>
            <Text size="small">Used by E2E tests to validate helper functions</Text>
        </Box>
    );
};

const meta: Meta<typeof TestComponent> = {
    title: 'Testing/StorybookTest',
    component: TestComponent,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default story used by storybook-helpers.spec.ts to test valid story loading.
 * DO NOT DELETE - Required by automated tests.
 */
export const Default: Story = {};
