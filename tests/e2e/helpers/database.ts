/**
 * Database helper utilities for E2E tests.
 * Provides methods to reset and seed the test database.
 */

import type { Page } from '@playwright/test';

export interface AttachmentStorageStats {
    metadataCount: number;
    fileCount: number;
}

/**
 * Reset the entire database (remove all items, tags, and attachments).
 * This ensures each test starts with a clean slate.
 *
 * Uses a REST endpoint instead of Meteor.call() for reliability.
 *
 * @param page - Playwright page object
 */
export async function resetDatabase(page: Page): Promise<void> {
    // Use page.request to make HTTP call to reset endpoint
    const response = await page.request.post('/api/test/reset-database');

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Failed to reset database: ${response.status()} ${body}`);
    }
}

/** Read attachment metadata and GridFS file counts from the guarded E2E endpoint. */
export async function getAttachmentStorageStats(page: Page): Promise<AttachmentStorageStats> {
    const response = await page.request.get('/api/test/attachment-storage');

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Failed to read attachment storage: ${response.status()} ${body}`);
    }

    return (await response.json()) as AttachmentStorageStats;
}

/**
 * Wait for Meteor to be ready before running tests.
 * Ensures the Meteor client is connected to the server.
 *
 * @param page - Playwright page object
 * @param timeoutMs - Maximum time to wait (default: 30 seconds)
 */
export async function waitForMeteorReady(page: Page, timeoutMs = 30000): Promise<void> {
    await page.waitForFunction(
        () => {
            // @ts-expect-error - Meteor is available in browser context
            return typeof Meteor !== 'undefined' && Meteor.status().connected;
        },
        { timeout: timeoutMs }
    );
}

/**
 * Execute a Meteor method call from the browser context.
 * Useful for seeding test data or triggering server-side operations.
 *
 * @param page - Playwright page object
 * @param methodName - Name of the Meteor method to call
 * @param args - Arguments to pass to the method
 * @returns Promise resolving to the method result
 */
export async function callMeteorMethod<T>(page: Page, methodName: string, ...args: unknown[]): Promise<T> {
    return await page.evaluate(
        ({ method, methodArgs }) => {
            return new Promise<T>((resolve, reject) => {
                // @ts-expect-error - Meteor is available in browser context
                Meteor.call(method, ...methodArgs, (error: Error | null, result: T) => {
                    if (error) {
                        // Serialize error properly for Playwright
                        reject(new Error(error.message || String(error)));
                    } else {
                        resolve(result);
                    }
                });
            });
        },
        { method: methodName, methodArgs: args }
    );
}

/**
 * Subscribe to a Meteor publication and wait for it to be ready.
 * Ensures data is available before the test proceeds.
 *
 * @param page - Playwright page object
 * @param publicationName - Name of the Meteor publication
 * @param args - Arguments to pass to the subscription
 */
export async function subscribeAndWait(page: Page, publicationName: string, ...args: unknown[]): Promise<void> {
    await page.evaluate(
        ({ pubName, pubArgs }) => {
            return new Promise<void>((resolve) => {
                // @ts-expect-error - Meteor is available in browser context
                const handle = Meteor.subscribe(pubName, ...pubArgs, {
                    onReady: () => {
                        handle.stop();
                        resolve();
                    },
                });
            });
        },
        { pubName: publicationName, pubArgs: args }
    );
}
