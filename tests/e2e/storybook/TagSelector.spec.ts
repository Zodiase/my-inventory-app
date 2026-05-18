import { expect, test } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

test.describe('TagSelector Component (Storybook)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoStory(page, 'ui-tagselector', 'test-interactions');
    });

    test('should toggle tag selection and update summary', async ({ page }) => {
        await expect(page.getByText('1 of 3 tags selected')).toBeVisible();

        await page.getByTestId('tag-touch-target-tag2').click();

        await expect(page.getByText('2 of 3 tags selected')).toBeVisible();
        await expect(page.getByTestId('last-toggle')).toHaveText('tag2:true');

        await page.getByTestId('tag-touch-target-tag1').click();

        await expect(page.getByText('1 of 3 tags selected')).toBeVisible();
        await expect(page.getByTestId('last-toggle')).toHaveText('tag1:false');
    });

    test('should invoke create tag callback', async ({ page }) => {
        await page.getByRole('button', { name: 'New Tag' }).click();

        await expect(page.getByTestId('create-count')).toHaveText('1');
    });

    test('should keep tag rows touch-friendly', async ({ page }) => {
        const box = await page.getByTestId('tag-touch-target-tag3').boundingBox();

        if (box === null) throw new Error('Tag touch target is not visible');
        expect(box.height).toBeGreaterThanOrEqual(44);
    });
});
