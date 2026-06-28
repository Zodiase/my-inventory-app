import { expect, test } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';

test.describe('SearchBar Component (Storybook)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoStory(page, 'ui-searchbar', 'test-interactions');
    });

    test('should update query and execute search on Enter', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Search query' });

        await input.fill('camp stove');
        await expect(page.getByTestId('current-query')).toHaveText('camp stove');

        await input.press('Enter');

        await expect(page.getByTestId('last-search')).toHaveText('camp stove');
        await expect(page.getByTestId('search-count')).toHaveText('1');
    });

    test('should clear query and invoke clear callback', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Search query' });

        await input.fill('tent stakes');
        await page.getByRole('button', { name: 'Clear search' }).click();

        await expect(input).toHaveValue('');
        await expect(page.getByTestId('current-query')).toHaveText('(empty)');
        await expect(page.getByTestId('clear-count')).toHaveText('1');
    });

    test('should expose touch-friendly clear and submit affordances', async ({ page }) => {
        const submitButton = page.getByRole('button', { name: 'Submit search' });
        const submitBox = await submitButton.boundingBox();

        if (submitBox === null) throw new Error('Submit button is not visible');
        expect(submitBox.height).toBeGreaterThanOrEqual(44);

        await page.getByRole('textbox', { name: 'Search query' }).fill('box');
        const clearButton = page.getByRole('button', { name: 'Clear search' });
        const box = await clearButton.boundingBox();

        if (box === null) throw new Error('Clear button is not visible');
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
    });
});
