import { expect, test } from '@playwright/test';

import { resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem } from '../helpers/factories';

const MODEL_ID = 'stack-tower-2col-5tier-v1';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test('renders placement metadata and preserves invalid records in the running app', async ({ page }) => {
    const stackId = await createItem(page, {
        name: 'Test bedside stack',
        isContainer: true,
        properties: {
            storageLayout: { modelId: MODEL_ID, tierCount: 5, positions: ['left', 'right'] },
        },
    });
    const topLeftId = await createItem(page, {
        name: 'Top left bin',
        isContainer: true,
        containerId: stackId,
        properties: {
            storagePlacement: { modelId: MODEL_ID, tier: 1, position: 'left' },
        },
    });
    await createItem(page, {
        name: 'Invalid placement bin',
        isContainer: true,
        containerId: stackId,
        properties: {
            storagePlacement: { modelId: MODEL_ID, tier: 9, position: 'right' },
        },
    });

    await page.goto(`/container/${stackId}`);
    await waitForMeteorReady(page);

    const layout = page.getByRole('region', { name: 'Test bedside stack physical layout' });
    await expect(layout).toBeVisible();
    await expect(layout.getByRole('row')).toHaveCount(5);
    await expect(layout.getByRole('row', { name: 'Tier 5' })).toContainText('Empty left slot');
    await expect(layout.getByRole('row', { name: 'Tier 5' })).toContainText('Empty right slot');
    await expect(page.getByRole('region', { name: 'Placement issues' })).toContainText('Invalid placement bin');

    const topLeftLink = layout.getByRole('link', { name: /Open container Top left bin, tier 1 left/ });
    await expect(topLeftLink).toHaveAttribute('href', `/container/${topLeftId}`);
    await topLeftLink.click();
    await expect(page).toHaveURL(new RegExp(`/container/${topLeftId}$`));
});
