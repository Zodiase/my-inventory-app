import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test('keeps group height stable before and after hovering its border label in WebKit', async ({ page }) => {
    await gotoStory(page, 'ui-hoistedcontainergroup', 'border-label');

    const group = page.getByRole('group', { name: 'Third floor contents' });
    const borderLabel = group.getByTestId('hoisted-container-heading');
    const measure = async (): Promise<{ height: number; bottomInset: number }> =>
        group.evaluate((element) => {
            const groupRect = element.getBoundingClientRect();
            const listRect = element.querySelector('[role="list"]')?.getBoundingClientRect();
            if (listRect === undefined) throw new Error('Hoisted child list was not rendered');

            return {
                height: groupRect.height,
                bottomInset: groupRect.bottom - listRect.bottom,
            };
        });

    const beforeHover = await measure();
    await borderLabel.hover();
    const afterHover = await measure();

    expect(beforeHover).toEqual(afterHover);
    expect(beforeHover.height).toBeLessThanOrEqual(100);
    expect(beforeHover.bottomInset).toBeLessThanOrEqual(12);
});
