import { test, expect } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

/**
 * ComponentTest for CreateTagDialog in Storybook isolation.
 *
 * **Purpose**: Validate that CreateTagDialog component works correctly BEFORE integrating
 * into full app. Tests the dialog in isolation to prove behavior and interaction patterns.
 *
 * **Prerequisites**: Storybook must be running at http://localhost:6006
 * ```bash
 * cd meteor-app && npm run storybook
 * ```
 *
 * **Run this test**:
 * ```bash
 * npm run test:e2e:skip-server:headless -- tests/e2e/storybook/CreateTagDialog.spec.ts --project=storybook-chromium
 * ```
 *
 * **Success Criteria** (from specs/002-storybook-e2e-testing/tasks.md T011):
 * - All tests pass in Storybook isolation
 * - Form submission behavior validated
 * - Pattern can be ported to full app integration tests
 */

test.describe('CreateTagDialog Component (Storybook)', () => {
    test('should fill and submit tag name successfully', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'test-submit-behavior');

        // Verify initial state - no submission yet
        await expect(page.locator('[data-testid="submit-data"]')).toContainText('No submission yet');
        await expect(page.locator('[data-testid="submit-count"]')).toHaveText('0');

        // Find the name input field by placeholder (TextInput doesn't have name attribute)
        const nameInput = page.getByPlaceholder(/enter tag name/i);
        await expect(nameInput).toBeVisible();

        // Fill the tag name
        await nameInput.fill('Test Tag');

        // Verify button becomes enabled
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeEnabled();

        // Click submit
        await submitButton.click();

        // Wait for submission to complete (5s delay in story)
        await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1', { timeout: 10000 });

        // Verify the onSubmit callback was called with correct data
        const submitDataText = await page.locator('[data-testid="submit-data"]').textContent();
        expect(submitDataText).not.toContain('No submission yet');

        const submitData = JSON.parse(submitDataText ?? '{}');
        expect(submitData.name).toBe('Test Tag');
    });

    test('should disable submit button when name is empty', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'test-submit-behavior');

        const submitButton = page.locator('button[type="submit"]');

        // Submit button should be disabled initially (empty name)
        await expect(submitButton).toBeDisabled();

        // Fill name
        const nameInput = page.getByPlaceholder(/enter tag name/i);
        await nameInput.fill('a');

        // Button should now be enabled
        await expect(submitButton).toBeEnabled();

        // Clear name
        await nameInput.clear();

        // Button should be disabled again
        await expect(submitButton).toBeDisabled();

        // Verify onSubmit was NOT called
        const submitCount = await page.locator('[data-testid="submit-count"]').textContent();
        expect(submitCount).toBe('0');
    });

    test('should prevent double-submission', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'test-submit-behavior');

        const nameInput = page.getByPlaceholder(/enter tag name/i);
        const submitButton = page.locator('button[type="submit"]');

        // Fill tag name
        await nameInput.fill('Test Double Submit');

        // Verify submit button is enabled
        await expect(submitButton).toBeEnabled();

        // Rapidly click submit button multiple times using force (bypasses actionability checks)
        await submitButton.click({ force: true });
        await submitButton.click({ force: true });
        await submitButton.click({ force: true });

        // Wait for submission to complete (5 second delay in story)
        await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1', { timeout: 10000 });

        // Verify onSubmit was called exactly once (not 3 times) - double-submit prevented!
        const submitCount = await page.locator('[data-testid="submit-count"]').textContent();
        expect(submitCount).toBe('1');
    });

    test('should show error message', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'with-duplicate-name-error');

        // Click button to open dialog
        await page.getByRole('button', { name: /open dialog/i }).click();

        // Error message should be visible
        await expect(page.getByText(/tag with this name already exists/i)).toBeVisible();
    });

    test('should show loading state', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'loading');

        // Click button to open dialog
        await page.getByRole('button', { name: /open dialog/i }).click();

        // Submit button should be disabled during loading
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeDisabled();
    });

    test('should close dialog on cancel', async ({ page }) => {
        await gotoStory(page, 'ui-createtagdialog', 'open');

        // Click button to open dialog
        await page.getByRole('button', { name: /open dialog/i }).click();

        // Dialog should be visible
        await expect(page.getByRole('heading', { name: /create.*tag/i })).toBeVisible();

        // Click cancel button
        await page.getByRole('button', { name: /cancel/i }).click();

        // Dialog should close
        await expect(page.getByRole('heading', { name: /create.*tag/i })).not.toBeVisible();
    });
});

/**
 * TestPattern: Form submission with Grommet Layer dialog
 *
 * **Pattern Name**: "Grommet Dialog Form Submission Pattern"
 *
 * **Validated In**: Storybook (T011) ✅
 *
 * **Selectors Used**:
 * - `input[name="name"]` - Tag name field
 * - `button[type="submit"]` - Submit button
 * - `getByRole('button', { name: /cancel/i })` - Cancel button
 * - `getByRole('heading', { name: /create.*tag/i })` - Dialog header
 *
 * **Interaction Sequence**:
 * 1. Dialog opens (either auto-open in test story or via button click)
 * 2. Fill name field using `input[name="name"]`
 * 3. Click submit button
 * 4. Verify behavior via DOM test output
 *
 * **Behavior Validation**:
 * - onSubmit callback receives correct data
 * - Empty name disables submit button
 * - Double-submission prevented via useRef guard
 * - Error messages display correctly
 * - Loading state disables interaction
 * - Cancel closes dialog
 *
 * **Similarities to ItemFormPage**:
 * - Same `name` attribute selector pattern
 * - Same `button[type="submit"]` selector
 * - Same double-submit prevention testing approach
 * - Same test story pattern (expose state in DOM)
 *
 * **Differences from ItemFormPage**:
 * - Dialog opens/closes (Layer component)
 * - Single field instead of multiple
 * - Different heading pattern for dialog vs form
 */
