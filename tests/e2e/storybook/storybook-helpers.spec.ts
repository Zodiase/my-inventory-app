import { test, expect } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

/**
 * Test to verify that gotoStory helper correctly validates story existence.
 *
 * Uses a dedicated test story (Testing/StorybookTest) that should not be deleted.
 * See: meteor-app/imports/ui/StorybookTest.stories.tsx
 */

test.describe('gotoStory Helper Validation', () => {
    test('should successfully load a valid story', async ({ page }) => {
        // This should work - the story exists
        await gotoStory(page, 'testing-storybooktest', 'default');

        // Verify we can interact with the loaded component
        const testComponent = page.locator('[data-testid="storybook-test-component"]');
        await expect(testComponent).toBeVisible();
    });

    test('should throw error for non-existent story', async ({ page }) => {
        // This should throw an error - the story doesn't exist
        await expect(async () => {
            await gotoStory(page, 'ui-itemform', 'nonexistent');
        }).rejects.toThrow(/Story not found or failed to load/);
    });

    test('should throw error for non-existent component', async ({ page }) => {
        // This should throw an error - the component doesn't exist
        await expect(async () => {
            await gotoStory(page, 'ui-fakecomponent', 'default');
        }).rejects.toThrow(/Story not found or failed to load/);
    });
});
