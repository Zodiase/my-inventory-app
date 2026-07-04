import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { resetDatabase, waitForMeteorReady } from '../../helpers/database';
import { createItem, createTag } from '../../helpers/factories';

const visualOutputDir = process.env.VISUAL_OUTPUT_DIR;
const snapshotName = process.env.VISUAL_SNAPSHOT_NAME ?? 'items-add-filter';

test.skip(visualOutputDir === undefined, 'Set VISUAL_OUTPUT_DIR to capture visual PR evidence.');

test('captures the expanded Items Add Filter panel', async ({ page }) => {
    if (visualOutputDir === undefined) {
        throw new Error('VISUAL_OUTPUT_DIR must be set for visual evidence capture');
    }

    await page.setViewportSize({ width: 2048, height: 768 });

    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);

    await createTag(page, { name: 'Tools' });
    await createItem(page, {
        name: 'Garage',
        isContainer: true,
    });

    await page.goto('/items');
    await waitForMeteorReady(page);

    await page.getByRole('button', { name: 'Add Filters' }).click();

    await expect(page.getByText('Add Filter', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open container Garage' })).toBeVisible();

    mkdirSync(visualOutputDir, { recursive: true });
    await page.screenshot({
        path: join(visualOutputDir, `${snapshotName}.png`),
        fullPage: true,
    });
});
