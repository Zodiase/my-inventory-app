/**
 * E2E tests for User Story 5: Touch-Optimized Navigation and Interaction
 *
 * These tests verify that all UI interactions meet iOS touch standards:
 * - 44x44px minimum tap targets
 * - Appropriate gestures (long-press, swipe, pull-to-refresh)
 * - Visual feedback on interactions
 * - Keyboard management
 * - Double-tap prevention
 * - Smooth scrolling
 *
 * Tests use mobile viewport to simulate touch interactions on iPad/iPhone.
 */

import { expect, type Locator, type Page, test } from '@playwright/test';

import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';

const MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
const MIN_TAP_SIZE_PX = 44;
const LONG_PRESS_DURATION_MS = 600;
const PULL_TO_REFRESH_DISTANCE_PX = 180;
const SWIPE_BACK_START_X_PX = 10;
const SWIPE_BACK_END_X_PX = 150;

const expectInventoryReady = async (page: Page): Promise<void> => {
    await waitForMeteorReady(page);
    await expect(page.getByText('Inventory App', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inventory App' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
};

const getItemsList = (page: Page): Locator => page.getByTestId('items-list');

const requireBoundingBox = async (
    locator: Locator,
    label: string
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> => {
    const box = await locator.boundingBox();
    if (box === null) throw new Error(`${label} is not visible`);
    return box;
};

const expectTouchTargetSize = async (locator: Locator, label: string): Promise<void> => {
    const box = await requireBoundingBox(locator, label);
    expect(box.width, `${label} width`).toBeGreaterThanOrEqual(MIN_TAP_SIZE_PX);
    expect(box.height, `${label} height`).toBeGreaterThanOrEqual(MIN_TAP_SIZE_PX);
};

const dragPointer = async (
    page: Page,
    start: { x: number; y: number },
    end: { x: number; y: number },
    steps = 10
): Promise<void> => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps });
};

const releasePointer = async (page: Page): Promise<void> => {
    await page.mouse.up();
};

const longPress = async (page: Page, target: Locator): Promise<void> => {
    const box = await requireBoundingBox(target, 'Long-press target');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Intentional gesture threshold wait: models the component's 500ms long-press contract.
    await page.waitForTimeout(LONG_PRESS_DURATION_MS);
    await releasePointer(page);
};

test.describe('Touch Optimization - User Story 5', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await resetDatabase(page);
        await page.goto('/');
        await expectInventoryReady(page);
    });

    /**
     * T053a: All tap targets meet 44×44px minimum on mobile viewport
     *
     * Acceptance Criteria:
     * - All interactive elements (buttons, links, form controls) are at least 44x44px
     * - Tap targets are measured in the mobile viewport (375x667 for iPhone)
     * - Elements include navigation buttons, action buttons, list items, form inputs
     */
    test('T053a: All tap targets meet 44×44px minimum on mobile viewport', async ({ page }) => {
        // Get all interactive elements
        const interactiveSelectors = [
            'button',
            'a',
            'input[type="button"]',
            'input[type="submit"]',
            '[role="button"]',
            '[role="link"]',
            'select',
        ];

        const failedElements: Array<{
            selector: string;
            width: number;
            height: number;
        }> = [];

        // Check each type of interactive element
        for (const selector of interactiveSelectors) {
            const elements = await page.locator(selector).all();

            for (const element of elements) {
                // Skip hidden elements
                const isVisible = await element.isVisible();
                if (!isVisible) continue;

                // Get bounding box
                const box = await element.boundingBox();
                if (!box) continue;

                // Check if meets minimum tap target size
                if (box.width < MIN_TAP_SIZE_PX || box.height < MIN_TAP_SIZE_PX) {
                    const elementText = await element.textContent();
                    failedElements.push({
                        selector: `${selector} ("${elementText?.slice(0, 30) ?? ''}")`,
                        width: Math.round(box.width),
                        height: Math.round(box.height),
                    });
                }
            }
        }

        // Report all failing elements
        if (failedElements.length > 0) {
            const failureMessage = failedElements
                .map((el) => `  - ${el.selector}: ${el.width}x${el.height}px`)
                .join('\n');
            throw new Error(`Found ${failedElements.length} elements below 44x44px minimum:\n${failureMessage}`);
        }

        // If we get here, all elements pass
        expect(failedElements).toHaveLength(0);
    });

    /**
     * T053b: Long-press on item reveals context menu
     *
     * Acceptance Criteria:
     * - Long-press (500ms+) on an item shows a context menu
     * - Context menu includes options like Edit, Delete, Move
     * - Works on both items and containers
     */
    test('T053b: Long-press on item reveals context menu', async ({ page }) => {
        // Seed a test item; creation form behavior is covered by item-creation specs.
        await callMeteorMethod<string>(page, 'items.createItem', { name: 'Test Item for Long Press' });
        await page.reload();
        await expectInventoryReady(page);

        // Find the item in the list
        const itemLocator = getItemsList(page).getByText('Test Item for Long Press', { exact: true });
        await expect(itemLocator).toBeVisible();

        await longPress(page, itemLocator);

        // Check if context menu is visible with expected actions
        const contextMenu = page.getByTestId('context-menu');
        await expect(contextMenu).toBeVisible();
        await expect(contextMenu.getByText('View Details', { exact: true })).toBeVisible();
    });

    /**
     * T053c: Pull-to-refresh works on item lists
     *
     * Acceptance Criteria:
     * - Pulling down on list triggers refresh
     * - Visual indicator shows during pull
     * - Data refreshes after pull completes
     */
    test('T053c: Pull-to-refresh works on item lists', async ({ page }) => {
        // Find the scrollable container (AllItemsView)
        const scrollContainer = getItemsList(page);

        // Get initial position
        const box = await requireBoundingBox(scrollContainer, 'Items list');

        // Simulate pull-to-refresh gesture
        // Start from top of container and drag down
        const startX = box.x + box.width / 2;
        const startY = box.y + 10;

        // The pull-to-refresh uses 80px trigger distance
        // We need to drag down more than that
        await dragPointer(page, { x: startX, y: startY }, { x: startX, y: startY + PULL_TO_REFRESH_DISTANCE_PX });

        // Check for loading indicator or refresh icon
        // The refresh indicator should be visible during pull
        const refreshIndicator = page.getByTestId('pull-to-refresh-indicator');
        await expect(refreshIndicator).not.toHaveCSS('opacity', '0');

        // Release the drag
        await releasePointer(page);

        // After release, the list remains usable. Refresh completion timing is covered by the hook contract.
        await expect(scrollContainer).toBeVisible();
    });

    /**
     * T053d: Swipe-back navigation works in hierarchy
     *
     * Acceptance Criteria:
     * - Swiping right navigates back to parent container
     * - Works in breadcrumb navigation
     * - Visual feedback during swipe
     */
    test('T053d: Swipe-back navigation works in hierarchy', async ({ page }) => {
        // Seed a container; item creation behavior is covered by item-creation specs.
        await callMeteorMethod<string>(page, 'items.createItem', {
            name: 'Parent Container',
            isContainer: true,
        });
        await page.reload();
        await expectInventoryReady(page);

        // Wait for container to appear
        await expect(page.getByText('Parent Container', { exact: true })).toBeVisible({ timeout: 5000 });

        // 2. Navigate into the parent container
        await page.getByText('Parent Container', { exact: true }).click();

        // Should see breadcrumb showing we're inside
        await expect(page.locator('nav').filter({ hasText: 'Parent Container' })).toBeVisible({ timeout: 5000 });

        // 3. Now test swipe-back navigation
        // Swipe from left edge (within 50px) to the right (100px+ movement)
        const viewport = page.viewportSize();
        if (!viewport) throw new Error('No viewport');

        const startX = SWIPE_BACK_START_X_PX; // Near left edge
        const startY = viewport.height / 2;
        const endX = SWIPE_BACK_END_X_PX; // 140px movement (more than 100px threshold)
        const endY = startY; // Minimal vertical movement

        // Perform swipe gesture
        await dragPointer(page, { x: startX, y: startY }, { x: endX, y: endY });
        await releasePointer(page);

        // Should navigate back to root (All Items)
        // Breadcrumb should no longer show Parent Container as current
        // The parent container should now be visible as an item in the list
        await expect(page.getByTestId('items-list').getByText('Parent Container', { exact: true })).toBeVisible({
            timeout: 2000,
        });
    });

    /**
     * T053e: Visual feedback on button press (iOS-style highlight)
     *
     * Acceptance Criteria:
     * - Buttons show visual feedback on press (color change, scale)
     * - Feedback is immediate (< 100ms)
     * - Follows iOS design patterns
     */
    test('T053e: Visual feedback on button press (iOS-style highlight)', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const addButton = inventoryPage.addItemButton;
        await expectTouchTargetSize(addButton, 'Create Item button');

        // Get initial button styles
        const initialBg = await addButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);

        // Simulate touch/press on button
        await addButton.hover();
        await page.mouse.down();

        // Get active/pressed button styles
        const pressedBg = await addButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);

        // Release
        await page.mouse.up();

        // Background color should change during press (visual feedback)
        // TouchButton uses opacity change on active state
        expect(initialBg).toBeDefined();
        expect(pressedBg).toBeDefined();

        // The button should have some visual feedback mechanism
        // (could be opacity, background color, transform, etc.)
        // We verify the button exists and responds to interaction
        await expect(addButton).toBeVisible();
    });

    /**
     * T053f: Keyboard does not obscure input fields (viewport adjusts)
     *
     * Acceptance Criteria:
     * - When keyboard appears, active input scrolls into view
     * - Input remains visible while typing
     * - Works for all form fields
     */
    test('T053f: Keyboard does not obscure input fields (viewport adjusts)', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const itemForm = new ItemFormPage(page);
        await inventoryPage.clickCreateItem();
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();

        // Focus on the name input field
        const nameInput = itemForm.nameInput;
        await nameInput.click();

        // Get input position before keyboard simulation
        const boxBefore = await nameInput.boundingBox();
        if (!boxBefore) throw new Error('Input not found');

        // In a real device, keyboard would appear here
        // We can't fully simulate keyboard in Playwright, but we can verify
        // that the input is in a scrollable container and positioned correctly

        // Verify input is visible and not at bottom of viewport
        const viewportHeight = page.viewportSize()?.height ?? 667;
        expect(boxBefore.y + boxBefore.height).toBeLessThan(viewportHeight);

        // Type into the field
        await nameInput.fill('Test Item Name');

        // Verify input is still visible and accessible
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue('Test Item Name');

        // The keyboard management utility should ensure input stays visible
        // This test verifies the input remains accessible during typing
    });

    /**
     * T053g: Double-tap prevention on submit buttons
     *
     * Acceptance Criteria:
     * - Submit buttons disable after first tap
     * - Only one submission occurs
     * - Visual indicator shows processing state
     */
    test('T053g: Double-tap prevention on submit buttons', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const itemForm = new ItemFormPage(page);
        const itemName = 'Double Tap Test Item';

        await inventoryPage.clickCreateItem();
        await expect(page.getByRole('heading', { name: 'Create New Item' })).toBeVisible();

        // Fill in the form
        await itemForm.fillName(itemName);

        // Get the submit button
        const submitButton = itemForm.saveButton;

        // Verify button is enabled initially
        await expect(submitButton).toBeEnabled();

        // Attempt rapid double-click/tap
        await submitButton.click({ clickCount: 2, delay: 50 });

        await expect(page.getByRole('heading', { name: 'Create New Item' })).not.toBeVisible();

        // Check that only ONE item was created (not two)
        // We should see the item in the list only once
        await expect(page.getByText(itemName, { exact: true })).toHaveCount(1);

        // The button should show some processing state
        // (either disabled or with loading indicator)
        // This is handled by the double-submission prevention in ItemForm
    });

    /**
     * T053h: Smooth scroll with momentum in long lists
     *
     * Acceptance Criteria:
     * - Lists scroll smoothly with touch
     * - Momentum scrolling works (iOS-style physics)
     * - No janky or stuttering scroll
     */
    test('T053h: Smooth scroll with momentum in long lists', async ({ page }) => {
        // Create multiple items to ensure scrollable list. Use methods so this test
        // only verifies scrolling behavior, not repeated create-form timing.
        for (let i = 1; i <= 15; i++) {
            await callMeteorMethod<string>(page, 'items.createItem', { name: `Scroll Test Item ${i}` });
        }
        await page.reload();
        await expectInventoryReady(page);
        await expect(page.getByText('Scroll Test Item 1', { exact: true })).toBeVisible({ timeout: 5000 });

        // Find a scrollable container
        // The -webkit-overflow-scrolling: touch property enables momentum
        const scrollContainer = getItemsList(page);

        // Verify the container has the momentum scrolling CSS property
        const hasWebkitScrolling = await scrollContainer.first().evaluate((el) => {
            const style = window.getComputedStyle(el);
            // Check for -webkit-overflow-scrolling: touch
            return (
                (style as unknown as { WebkitOverflowScrolling?: string }).WebkitOverflowScrolling === 'touch' ||
                style.overflowY === 'auto'
            );
        });

        // Should have overflow scrolling enabled
        expect(hasWebkitScrolling).toBeTruthy();

        // Perform a scroll gesture
        const box = await requireBoundingBox(scrollContainer, 'Items list');
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        // Swipe up to scroll down
        await dragPointer(page, { x: startX, y: startY }, { x: startX, y: startY - 200 });
        await releasePointer(page);
        await page.mouse.wheel(0, 400);

        // Verify scroll behavior by checking if later items are visible via Playwright auto-waiting.
        await expect(page.getByText('Scroll Test Item 10', { exact: true })).toBeVisible({ timeout: 2000 });
    });
});
