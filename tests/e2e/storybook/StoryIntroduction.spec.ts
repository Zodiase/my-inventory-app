import { expect, test } from '@playwright/test';

test('shows story expectations in a manager-only Introduction panel', async ({ page }) => {
    await page.goto('/?path=/story/ui-hoistedcontainergroup--border-label');

    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.getByRole('group', { name: 'Third floor contents' })).toBeVisible();
    await expect(preview.getByText('What to expect')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Introduction' }).click();
    await expect(page.getByRole('heading', { name: 'What to expect' })).toBeVisible();
    await expect(
        page.getByText('A logical container is reduced to a lightweight border label', { exact: false })
    ).toBeVisible();
});

test('generates an introduction when a story has no explicit copy', async ({ page }) => {
    await page.goto('/?path=/story/ui-itemdialog--interactive');
    await page.getByRole('tab', { name: 'Introduction' }).click();

    await expect(page.getByText('ItemDialog rendered in its “Interactive” scenario', { exact: false })).toBeVisible();
});
