/**
 * Page Object Model helpers for common UI interactions.
 * Provides reusable methods for interacting with the inventory app UI.
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the main inventory view.
 */
export class InventoryPage {
    constructor(public readonly page: Page) {}

    /**
     * Navigate to the home page.
     */
    async goto(): Promise<void> {
        await this.page.goto('/');
    }

    /**
     * Get the "Add Item" button locator.
     */
    get addItemButton(): Locator {
        return this.page.getByRole('button', { name: /add item/i });
    }

    /**
     * Click the "Add Item" button to open the item creation form.
     */
    async clickAddItem(): Promise<void> {
        await this.addItemButton.click();
    }

    /**
     * Find an item in the list by name.
     */
    itemByName(name: string): Locator {
        return this.page.getByRole('listitem').filter({ hasText: name });
    }

    /**
     * Click on an item to view its details.
     */
    async openItem(name: string): Promise<void> {
        await this.itemByName(name).click();
    }

    /**
     * Check if an item exists in the current view.
     */
    async hasItem(name: string): Promise<boolean> {
        return await this.itemByName(name).isVisible();
    }
}

/**
 * Page Object for the item form (create/edit).
 */
export class ItemFormPage {
    constructor(public readonly page: Page) {}

    /**
     * Get the name input field.
     */
    get nameInput(): Locator {
        return this.page.getByLabel(/name/i);
    }

    /**
     * Get the description textarea.
     */
    get descriptionInput(): Locator {
        return this.page.getByLabel(/description/i);
    }

    /**
     * Get the "Is Container" checkbox.
     */
    get isContainerCheckbox(): Locator {
        return this.page.getByLabel(/container|location/i);
    }

    /**
     * Get the Save/Submit button.
     */
    get saveButton(): Locator {
        return this.page.getByRole('button', { name: /save|create/i });
    }

    /**
     * Get the Cancel button.
     */
    get cancelButton(): Locator {
        return this.page.getByRole('button', { name: /cancel/i });
    }

    /**
     * Fill out the item form with the provided data.
     */
    async fillForm(data: {
        name: string;
        description?: string;
        isContainer?: boolean;
    }): Promise<void> {
        await this.nameInput.fill(data.name);

        if (data.description) {
            await this.descriptionInput.fill(data.description);
        }

        if (data.isContainer) {
            await this.isContainerCheckbox.check();
        }
    }

    /**
     * Submit the form to create/update an item.
     */
    async submit(): Promise<void> {
        await this.saveButton.click();
    }

    /**
     * Create an item with the provided data.
     */
    async createItem(data: {
        name: string;
        description?: string;
        isContainer?: boolean;
    }): Promise<void> {
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
     * Get the "Add Tag" button.
     */
    get addTagButton(): Locator {
        return this.page.getByRole('button', { name: /add tag/i });
    }

    /**
     * Find a tag in the list by name.
     */
    tagByName(name: string): Locator {
        return this.page.getByRole('listitem').filter({ hasText: name });
    }

    /**
     * Click on a tag to view items with that tag.
     */
    async openTag(name: string): Promise<void> {
        await this.tagByName(name).click();
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
