import { expect, test } from '@playwright/test';

import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('loads and navigates hoisted children through real Meteor publications', async ({ page }) => {
    const homeId = await createItem(page, { name: 'Headen Way home', isContainer: true });
    const thirdFloorId = await createItem(page, {
        name: 'Third floor',
        isContainer: true,
        containerId: homeId,
        properties: { childrenPresentation: 'hoist-in-parent' },
    });
    const laundryId = await createItem(page, {
        name: 'Laundry room',
        isContainer: true,
        containerId: thirdFloorId,
    });
    await createItem(page, { name: 'Main bedroom', isContainer: true, containerId: thirdFloorId });
    await createItem(page, { name: 'Floor plan notes', containerId: thirdFloorId });

    await page.goto(`/container/${homeId}`);
    await waitForMeteorReady(page);

    const group = page.getByRole('group', { name: 'Third floor contents' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('link', { name: 'Open container Laundry room' })).toBeVisible();
    await expect(group.getByRole('link', { name: 'Open container Main bedroom' })).toBeVisible();
    await expect(group.getByRole('link', { name: 'View item Floor plan notes' })).toBeVisible();

    await group.getByRole('link', { name: 'Open container Laundry room' }).click();
    await expect(page).toHaveURL(new RegExp(`/container/${laundryId}$`));

    await page.goBack();
    await expect(group).toBeVisible();
    await group.getByRole('link', { name: 'Open container Third floor' }).click();
    await expect(page).toHaveURL(new RegExp(`/container/${thirdFloorId}$`));
});
