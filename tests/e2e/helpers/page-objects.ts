/**
 * Page Object Model helpers for common UI interactions.
 * Provides reusable methods for interacting with the inventory app UI.
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the main inventory view.
 *
 * **Context-Agnostic Design**: Works in both Storybook and full app contexts.
 *
 * **Selector Strategy**:
 * - Uses `getByRole('button')` for interactive elements (accessible)
 * - Uses `getByRole('listitem')` for list items (semantic HTML)
 * - These selectors work across contexts because they rely on HTML semantics
 */
export class InventoryPage {
    constructor(public readonly page: Page) {}

    /**
     * Navigate to the home page.
     * Only works in full app context (Storybook doesn't have routing).
     */
    async goto(): Promise<void> {
        await this.page.goto('/');
    }

    /**
     * Get the "Create Item" button locator.
     */
    get addItemButton(): Locator {
        return this.page.getByRole('button', { name: /create item/i });
    }

    /**
     * Click the "Create Item" button to open the item creation form.
     */
    async clickCreateItem(): Promise<void> {
        await this.addItemButton.click();
    }

    /**
     * Legacy alias for clickCreateItem().
     * @deprecated Use clickCreateItem() instead
     */
    async clickAddItem(): Promise<void> {
        await this.clickCreateItem();
    }

    /**
     * Find an item in the list by name.
     * Uses text content since Grommet List items don't have listitem role.
     */
    itemByName(name: string): Locator {
        // Items are rendered in a List but don't have listitem role
        // Use text content with specific structure (item name in Box)
        return this.page.locator(`text="${name}"`).first();
    }

    /**
     * Click on an item to view its details.
     */
    async openItem(name: string): Promise<void> {
        await this.itemByName(name).click();
    }

    /**
     * Verify that an item with the given name appears in the list.
     * Uses Playwright's auto-waiting assertion.
     *
     * @param itemName - Name of the item to look for
     */
    async expectItemInList(itemName: string): Promise<void> {
        const item = this.itemByName(itemName);
        await item.waitFor({ state: 'visible', timeout: 5000 });
    }

    /**
     * Check if an item exists in the current view.
     * @deprecated Use expectItemInList() for assertions
     */
    async hasItem(name: string): Promise<boolean> {
        return await this.itemByName(name).isVisible();
    }
}

/**
 * Page Object for the item form (create/edit).
 *
 * **Context-Agnostic Design**: This page object works in both:
 * - Storybook isolated component testing (`http://localhost:6006/iframe.html?id=...`)
 * - Full Meteor app integration testing (`http://localhost:3000`)
 *
 * **Grommet Known Issues**:
 * - Cannot use `getByLabel()` with Grommet FormField components (label association broken)
 * - Must use `input[name="..."]` or `textarea[name="..."]` selectors instead
 * - This is a Grommet/styled-components limitation, not a bug in our tests
 *
 * **Selector Strategy**:
 * - Use `name` attribute for form inputs (most reliable)
 * - Use `type` attribute for buttons (`button[type="submit"]`)
 * - Use `data-testid` for elements without semantic attributes
 * - Avoid `getByLabel()`, `getByRole('textbox')` with Grommet components
 *
 * ---
 *
 * ## TestPattern: Submit Grommet form with name attribute selectors
 *
 * **Pattern Name**: "Grommet Form Submission Pattern"
 *
 * **Validated In**: Storybook (T007) ✅ | Full App Integration (T008) ✅
 *
 * **Selectors Used**:
 * - `input[name="name"]` - Name field (not getByLabel)
 * - `textarea[name="description"]` - Description field (not getByLabel)
 * - `button[type="submit"]` - Submit button
 *
 * **Interaction Sequence**:
 * 1. Fill name field using `fillName(value)`
 * 2. Fill description field using `fillDescription(value)`
 * 3. Click submit button using `submit()`
 *
 * **Behavior Validation**:
 * - onSubmit callback receives correct data (verify via DOM or network)
 * - Validation errors appear in DOM when data is invalid
 * - Double-submission is prevented (FR-070) via useRef guard
 * - Form fields maintain values during interaction
 *
 * **Known Limitations**:
 * - Cannot use `getByLabel()` with Grommet FormField (label not properly associated)
 * - Must use `name` attribute selectors instead
 * - This pattern is specific to Grommet/styled-components forms
 *
 * **Usage Example**:
 * ```typescript
 * const itemForm = new ItemFormPage(page);
 * await itemForm.fillName('Test Item');
 * await itemForm.fillDescription('Test Description');
 * await itemForm.submit();
 * ```
 */
export class ItemFormPage {
    constructor(public readonly page: Page) {}

    /**
     * Get the name input field using name attribute (context-agnostic selector).
     */
    get nameInput(): Locator {
        return this.page.locator('input[name="name"]');
    }

    /**
     * Get the description textarea using name attribute (context-agnostic selector).
     */
    get descriptionInput(): Locator {
        return this.page.locator('textarea[name="description"]');
    }

    /**
     * Get the "Is Container" checkbox.
     *
     * NOTE: This uses getByLabel which may not work with Grommet FormField.
     * If this fails, refactor to use `input[name="isContainer"]` or similar.
     */
    get isContainerCheckbox(): Locator {
        return this.page.getByLabel(/container|location/i);
    }

    /**
     * Get the Save/Submit button using type attribute (context-agnostic selector).
     */
    get saveButton(): Locator {
        return this.page.locator('button[type="submit"]');
    }

    /**
     * Get the Cancel button.
     *
     * NOTE: Uses getByRole which may need refactoring for Storybook if button
     * doesn't have explicit role. Consider using `button[data-testid="cancel"]` if needed.
     */
    get cancelButton(): Locator {
        return this.page.getByRole('button', { name: /cancel/i });
    }

    /**
     * Fill the name field with the provided value.
     *
     * @param name - Item name to enter
     */
    async fillName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    /**
     * Fill the description field with the provided value.
     *
     * @param description - Item description to enter
     */
    async fillDescription(description: string): Promise<void> {
        await this.descriptionInput.fill(description);
    }

    /**
     * Submit the form using the submit button.
     * Uses Playwright's auto-waiting to ensure button is clickable.
     */
    async submit(): Promise<void> {
        await this.saveButton.click();
    }

    /**
     * Verify form submission succeeded by checking if form cleared or success message shown.
     *
     * In Storybook: May check for Storybook action or DOM changes
     * In full app: May check for navigation or success message
     *
     * @remarks
     * Implementation may vary based on context. Override this method in test files
     * if context-specific verification needed.
     */
    async expectSuccess(): Promise<void> {
        // Default: check that name field is empty (form was cleared after submit)
        await this.page.waitForTimeout(500); // Brief wait for form to process
        const nameValue = await this.nameInput.inputValue();
        if (nameValue !== '') {
            throw new Error(`Expected form to clear after submission, but name field still contains: "${nameValue}"`);
        }
    }

    /**
     * Fill out the item form with the provided data.
     *
     * @deprecated Use fillName(), fillDescription(), and submit() separately for more control
     */
    async fillForm(data: { name: string; description?: string; isContainer?: boolean }): Promise<void> {
        await this.nameInput.fill(data.name);

        if (data.description) {
            await this.descriptionInput.fill(data.description);
        }

        if (data.isContainer) {
            await this.isContainerCheckbox.check();
        }
    }

    /**
     * Create an item with the provided data.
     *
     * @deprecated Use fillName(), fillDescription(), submit(), and expectSuccess() separately
     */
    async createItem(data: { name: string; description?: string; isContainer?: boolean }): Promise<void> {
        await this.fillForm(data);
        await this.submit();
    }
}

/**
 * Page Object for item detail view.
 */
export class ItemDetailPage {
    constructor(public readonly page: Page) {}

    /**
     * Get the item name heading.
     */
    get itemName(): Locator {
        return this.page.getByRole('heading', { level: 1 });
    }

    /**
     * Get the breadcrumb trail navigation.
     */
    get breadcrumbs(): Locator {
        return this.page.getByRole('navigation', { name: /breadcrumb/i });
    }

    /**
     * Get the edit button.
     */
    get editButton(): Locator {
        return this.page.getByRole('button', { name: /edit/i });
    }

    /**
     * Get the delete button.
     */
    get deleteButton(): Locator {
        return this.page.getByRole('button', { name: /delete/i });
    }

    /**
     * Check if breadcrumb contains a specific location.
     */
    async breadcrumbContains(locationName: string): Promise<boolean> {
        const breadcrumbText = await this.breadcrumbs.textContent();
        return breadcrumbText?.includes(locationName) ?? false;
    }
}

/**
 * Page Object for tag management.
 */
export class TagsPage {
    constructor(public readonly page: Page) {}

    /**
     * Navigate to the tags view.
     */
    async goto(): Promise<void> {
        await this.page.goto('/tags');
    }

    /**
     * Get the "Add Tag" button (+ button).
     * Uses .new-child-action class since UI shows "+" not "Add Tag" text.
     */
    get addTagButton(): Locator {
        return this.page.locator('.new-child-action').first();
    }

    /**
     * Find a tag in the list by name.
     * Uses .tag-body class since Grommet List doesn't use listitem roles.
     */
    tagByName(name: string): Locator {
        return this.page.locator('.tag-body').filter({ hasText: name });
    }

    /**
     * Click on a tag to view items with that tag.
     */
    async openTag(name: string): Promise<void> {
        await this.tagByName(name).locator('.tag-name-label').click();
    }
}

/**
 * Helper to verify touch target sizes meet iOS HIG requirements (44×44px minimum).
 */
export async function verifyTouchTargets(page: Page): Promise<void> {
    const buttons = await page.getByRole('button').all();

    for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
            if (box.width < 44 || box.height < 44) {
                throw new Error(
                    `Button "${await button.textContent()}" is too small: ${box.width}×${box.height}px (minimum 44×44px)`
                );
            }
        }
    }
}
