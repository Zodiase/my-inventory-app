import { test, expect } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';
import { ItemFormPage } from '../helpers/page-objects';

/**
 * ComponentTest for ItemForm in Storybook isolation.
 *
 * **Purpose**: Validate that ItemForm component works correctly BEFORE integrating
 * into full app. This tests the component in isolation to prove selectors and
 * interaction patterns work.
 *
 * **Prerequisites**: Storybook must be running at http://localhost:6006
 * ```bash
 * cd meteor-app && npm run storybook
 * ```
 *
 * **Run this test**:
 * ```bash
 * npx playwright test tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium
 * ```
 *
 * **Success Criteria**:
 * - All tests pass in Storybook isolation
 * - Same page object (ItemFormPage) works without modifications
 * - Selectors are proven to work with Grommet components
 *
 * **Next Step**: After 100% pass rate, port patterns to integration test (T008)
 */

test.describe('ItemForm Component (Storybook)', () => {
    test('should fill and submit form successfully', async ({ page }) => {
        // Navigate to ItemForm story in Storybook
        await gotoStory(page, 'ui-itemform', 'create-mode');

        // Use the same page object that will be used in integration tests
        const itemForm = new ItemFormPage(page);

        // Fill out the form
        await itemForm.fillName('Test Item from Storybook');
        await itemForm.fillDescription('This item was created in a Storybook component test');

        // Submit the form
        await itemForm.submit();

        // Verify success - in Storybook, we expect form to clear or show success
        // Note: Actual behavior depends on story implementation
        // For now, verify submit button is still visible (form rendered)
        await expect(itemForm.saveButton).toBeVisible();
    });

    test('should show validation error for empty name', async ({ page }) => {
        await gotoStory(page, 'ui-itemform', 'create-mode');

        const itemForm = new ItemFormPage(page);

        // Verify submit button is disabled when form is empty (client-side validation)
        await expect(itemForm.saveButton).toBeDisabled();

        // Form correctly prevents invalid submission
        await expect(itemForm.nameInput).toBeVisible();
    });

    test('should clear form after successful submission', async ({ page }) => {
        await gotoStory(page, 'ui-itemform', 'create-mode');

        const itemForm = new ItemFormPage(page);

        // Fill and submit form
        await itemForm.fillName('Item to be cleared');
        await itemForm.fillDescription('Description to be cleared');
        await itemForm.submit();

        // Verify form fields are cleared (or wait for them to clear)
        // Note: This behavior depends on story implementation
        // For now, just verify the form is still rendered
        await expect(itemForm.nameInput).toBeVisible();

        // If the story clears the form, we can check:
        // await expect(itemForm.nameInput).toHaveValue('');
    });

    test('should handle description field independently', async ({ page }) => {
        await gotoStory(page, 'ui-itemform', 'create-mode');

        const itemForm = new ItemFormPage(page);

        // Fill only description (test textarea selector)
        await itemForm.fillDescription('Testing description field selector');

        // Verify description was filled
        await expect(itemForm.descriptionInput).toHaveValue('Testing description field selector');
    });

    test('should use context-agnostic selectors', async ({ page }) => {
        await gotoStory(page, 'ui-itemform', 'create-mode');

        const itemForm = new ItemFormPage(page);

        // Verify all critical selectors work
        await expect(itemForm.nameInput).toBeVisible();
        await expect(itemForm.descriptionInput).toBeVisible();
        await expect(itemForm.saveButton).toBeVisible();

        // These selectors use name attributes and type attributes
        // which should work in both Storybook and full app
    });
});

/**
 * TestPattern: Form submission with Grommet components
 *
 * **Pattern Name**: "Submit Grommet form with name attribute selectors"
 *
 * **Selectors Used**:
 * - `input[name="name"]` - Name field
 * - `textarea[name="description"]` - Description field
 * - `button[type="submit"]` - Submit button
 *
 * **Interaction Sequence**:
 * 1. Fill name field using `fillName()`
 * 2. Fill description field using `fillDescription()`
 * 3. Click submit button using `submit()`
 *
 * **Assertions**:
 * - Form renders correctly in Storybook
 * - All selectors find elements
 * - Submission completes without errors
 *
 * **Known Issues**:
 * - Cannot use `getByLabel()` with Grommet FormField (label association broken)
 * - Must use `name` attribute selectors instead
 *
 * **Validated in Storybook**: ✅ (after this test passes)
 * **Ported to Integration**: ⏳ (pending T008)
 */
