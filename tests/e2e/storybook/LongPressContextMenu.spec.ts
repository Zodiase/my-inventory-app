import { expect, test, type Locator, type Page } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

const longPress = async (page: Page, target: Locator): Promise<void> => {
    const box = await target.boundingBox();
    if (box === null) throw new Error('Long-press target is not visible');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();
};

test.describe('LongPressContextMenu Component (Storybook)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoStory(page, 'ui-longpresscontextmenu', 'test-interactions');
    });

    test('should show menu on long press', async ({ page }) => {
        await longPress(page, page.getByTestId('long-press-target'));

        await expect(page.getByTestId('context-menu')).toBeVisible();
        await expect(page.getByTestId('open-count')).toHaveText('1');
    });

    test('should hide menu on outside click', async ({ page }) => {
        await longPress(page, page.getByTestId('long-press-target'));
        await expect(page.getByTestId('context-menu')).toBeVisible();

        await page.mouse.click(10, 10);

        await expect(page.getByTestId('context-menu')).toBeHidden();
        await expect(page.getByTestId('close-count')).toHaveText('1');
    });

    test('should execute menu action on selection', async ({ page }) => {
        await longPress(page, page.getByTestId('long-press-target'));

        await page.getByRole('button', { name: 'Archive' }).click();

        await expect(page.getByTestId('last-action')).toHaveText('Archive');
        await expect(page.getByTestId('context-menu')).toBeHidden();
    });
});
