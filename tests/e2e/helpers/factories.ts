/**
 * Mock data factories for E2E tests.
 * Provides functions to create realistic test data with deterministic IDs.
 */

import type { Page } from '@playwright/test';
import { callMeteorMethod } from './database';

/**
 * Factory for creating test items with consistent data.
 */
export interface CreateItemOptions {
    name: string;
    description?: string;
    containerId?: string;
    isContainer?: boolean;
    tagIds?: string[];
    properties?: {
        serialNumber?: string;
        purchaseDate?: string;
        purchasePrice?: number;
        warrantyExpiration?: string;
        model?: string;
        manufacturer?: string;
        notes?: string;
    };
}

/**
 * Create a test item via Meteor method.
 *
 * @param page - Playwright page object
 * @param options - Item creation options
 * @returns Promise resolving to the created item ID
 */
export async function createItem(page: Page, options: CreateItemOptions): Promise<string> {
    const itemId = await callMeteorMethod<string>(page, 'createItem', options);

    // Properties are included in the main options, no separate call needed
    return itemId;
}

/**
 * Factory for creating test tags.
 */
export interface CreateTagOptions {
    name: string;
    parentId?: string;
}

/**
 * Create a test tag via Meteor method.
 *
 * @param page - Playwright page object
 * @param options - Tag creation options
 * @returns Promise resolving to the created tag ID
 */
export async function createTag(page: Page, options: CreateTagOptions): Promise<string> {
    return await callMeteorMethod<string>(page, 'createTag', options);
}

/**
 * Common test data scenarios for reuse across tests.
 */
export const testData = {
    /**
     * Create a simple location hierarchy:
     * - Kitchen (container)
     *   - Cabinet (container)
     *     - Shelf (container)
     */
    async createLocationHierarchy(page: Page): Promise<{
        kitchenId: string;
        cabinetId: string;
        shelfId: string;
    }> {
        const kitchenId = await createItem(page, {
            name: 'Kitchen',
            description: 'Main kitchen area',
            isContainer: true,
        });

        const cabinetId = await createItem(page, {
            name: 'Kitchen Cabinet',
            description: 'Upper cabinet',
            containerId: kitchenId,
            isContainer: true,
        });

        const shelfId = await createItem(page, {
            name: 'Top Shelf',
            description: 'Highest shelf',
            containerId: cabinetId,
            isContainer: true,
        });

        return { kitchenId, cabinetId, shelfId };
    },

    /**
     * Create common tags for testing:
     * - Camping Gear
     * - Winter Sports
     * - Electronics
     */
    async createCommonTags(page: Page): Promise<{
        campingId: string;
        winterId: string;
        electronicsId: string;
    }> {
        const campingId = await createTag(page, { name: 'Camping Gear' });
        const winterId = await createTag(page, { name: 'Winter Sports' });
        const electronicsId = await createTag(page, { name: 'Electronics' });

        return { campingId, winterId, electronicsId };
    },

    /**
     * Create a fully populated item with properties and tags.
     */
    async createFullItem(page: Page, containerId?: string): Promise<{ itemId: string; tagId: string }> {
        const tagId = await createTag(page, { name: 'Test Equipment' });

        const itemId = await createItem(page, {
            name: 'Camping Stove',
            description: 'Portable gas camping stove',
            containerId,
            tagIds: [tagId],
            properties: {
                manufacturer: 'Coleman',
                model: 'Classic',
                serialNumber: 'CS-2024-1234',
                purchaseDate: '2024-01-15',
                purchasePrice: 49.99,
                warrantyExpiration: '2026-01-15',
                notes: 'Works great for outdoor cooking',
            },
        });

        return { itemId, tagId };
    },
};
