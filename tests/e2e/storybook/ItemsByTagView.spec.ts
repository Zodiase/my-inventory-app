import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('ItemsByTagView', () => {
    test('exposes semantic routes for every result and clearing selection', async ({ page }) => {
        await gotoStory(page, 'ui-itemsbytagview', 'few-items');

        await expect(page.getByRole('link', { name: 'Clear Selection' })).toHaveAttribute('href', '/tags');
        await expect(page.getByRole('link', { name: 'View item Camping Tent' })).toHaveAttribute(
            'href',
            '/items/item1'
        );
        await expect(page.getByRole('link', { name: 'View item Sleeping Bag' })).toHaveAttribute(
            'href',
            '/items/item2'
        );
        await expect(page.getByRole('link', { name: 'View item Camp Stove' })).toHaveAttribute('href', '/items/item3');
    });

    test('presents current empty, one-result, and multi-result information', async ({ page }) => {
        await gotoStory(page, 'ui-itemsbytagview', 'tag-with-no-items');
        await expect(page.getByText('0 items')).toBeVisible();
        await expect(page.getByText(/No items found with tag/i)).toBeVisible();

        await gotoStory(page, 'ui-itemsbytagview', 'one-item');
        await expect(page.getByText('1 item', { exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /^View item / })).toHaveCount(1);

        await gotoStory(page, 'ui-itemsbytagview', 'few-items');
        await expect(page.getByText('3 items', { exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /^View item / })).toHaveCount(3);
    });
});
