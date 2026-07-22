import type { Page } from '@playwright/test';

/**
 * Base URL for Storybook server (expected to be running manually).
 * Before running Storybook tests, start Storybook in a separate terminal:
 * ```bash
 * cd meteor-app && npm run storybook
 * ```
 */
export const STORYBOOK_BASE_URL = process.env.PLAYWRIGHT_STORYBOOK_BASE_URL ?? 'http://localhost:6006';

/**
 * Builds a Storybook story URL for isolated component testing.
 *
 * The URL uses Storybook's iframe.html pattern to render ONLY the component
 * without Storybook's UI chrome, providing a clean testing environment.
 *
 * @param componentName - Component name in kebab-case (e.g., "item-form")
 * @param storyName - Story name in kebab-case (e.g., "default", "with-validation")
 * @returns Full URL to isolated story iframe
 *
 * @example
 * ```typescript
 * const url = getStoryUrl('item-form', 'default');
 * // Returns: 'http://localhost:6006/iframe.html?id=item-form--default&viewMode=story'
 * ```
 *
 * @remarks
 * Story IDs follow Storybook's convention: `{component-name}--{story-name}` (all lowercase, kebab-case).
 * You can find the exact story ID by viewing the story in Storybook and checking the URL.
 */
export function getStoryUrl(componentName: string, storyName: string): string {
    const storyId = `${componentName.toLowerCase()}--${storyName.toLowerCase()}`;
    return `${STORYBOOK_BASE_URL}/iframe.html?id=${storyId}&viewMode=story`;
}

/**
 * Navigates to a Storybook story for isolated component testing.
 *
 * This is a convenience wrapper around `page.goto()` that uses the correct
 * Storybook iframe URL pattern. It waits for the page to load completely
 * before returning.
 *
 * @param page - Playwright Page instance
 * @param componentName - Component name in kebab-case (e.g., "item-form")
 * @param storyName - Story name in kebab-case (e.g., "default")
 *
 * @example
 * ```typescript
 * test('should fill item form', async ({ page }) => {
 *   await gotoStory(page, 'item-form', 'default');
 *
 *   // Component is now loaded and ready for testing
 *   await page.fill('input[name="name"]', 'Test Item');
 * });
 * ```
 *
 * @throws Error if the story doesn't exist or fails to load
 *
 * @remarks
 * - Storybook must be running at http://localhost:6006 before calling this function
 * - Uses Playwright's default navigation timeout (30s)
 * - Waits for 'load' event (full page load including assets)
 * - Validates that the story actually rendered (not an error page)
 */
export async function gotoStory(page: Page, componentName: string, storyName: string): Promise<void> {
    const url = getStoryUrl(componentName, storyName);
    await page.goto(url, { waitUntil: 'load' });

    // Wait for Storybook to finish rendering and add status classes to body
    // Storybook adds either 'sb-show-main' (success) or 'sb-show-errordisplay' (error)
    // Use Promise.race to wait for whichever state appears first
    await Promise.race([
        page.locator('body.sb-show-main').waitFor({ state: 'attached', timeout: 5000 }),
        page.locator('body.sb-show-errordisplay').waitFor({ state: 'attached', timeout: 5000 }),
    ]);

    // Verify the story actually loaded successfully
    // Storybook adds 'sb-show-main' class to body when story renders
    // If story doesn't exist, it shows error with 'sb-show-errordisplay' class
    const bodyClass = await page.locator('body').getAttribute('class');
    const hasError = bodyClass?.includes('sb-show-errordisplay') ?? false;

    if (hasError) {
        throw new Error(
            `Story not found or failed to load: ${componentName}--${storyName}\n` +
                `URL: ${url}\n` +
                `Check that the story exists in Storybook and the ID is correct.`
        );
    }
}
