/** Isolated overflow discoverability, sibling semantics, focus, and constrained viewport regressions. */
import { expect, test } from '@playwright/test';

test('reusable control hides empty actions and respects disabled actions', async ({ page }) => {
    await page.goto('/?path=/story/ui-itemrowactions--no-actions');
    const preview = page.frameLocator('#storybook-preview-iframe');
    // Empty actions intentionally render no visible control; wait for its
    // decorator to mount rather than requiring a nonzero empty root.
    await expect(preview.locator('#storybook-root > div')).toBeAttached();
    await expect(preview.getByRole('button', { name: 'Actions for Example item' })).toHaveCount(0);
    await page.goto('/?path=/story/ui-itemrowactions--disabled-action');
    await preview.getByRole('button', { name: 'Actions for Example item' }).click();
    await expect(preview.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();
    await expect(preview.getByRole('button', { name: 'View Details', exact: true })).toBeEnabled();
});

for (const viewport of [
    { width: 1280, height: 720 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 1280, height: 480 },
]) {
    for (const story of ['full', 'available-only', 'grouped-fallback', 'constrained-height']) {
        test(`${story} row actions at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto(`/?path=/story/prototypes-item-row-actions--${story}`);
            // Keep the full manager, but reserve the preview canvas for the
            // specified viewport rather than a default 300px addon panel.
            const hidePanel = page.getByRole('button', { name: 'Hide addon panel', exact: true });
            if (await hidePanel.isVisible()) await hidePanel.click();
            const preview = page.frameLocator('#storybook-preview-iframe');
            const trigger = preview.getByRole('button', { name: 'Actions for Storage box', exact: true });
            await expect(trigger).toBeVisible();
            const geometry = await trigger.evaluate((element) => {
                const row = element.closest('[data-testid="action-row"]')!;
                const link = row.querySelector('a')!;
                const r = row.getBoundingClientRect(),
                    t = element.getBoundingClientRect(),
                    l = link.getBoundingClientRect();
                return {
                    width: t.width,
                    height: t.height,
                    center: Math.abs(t.y + t.height / 2 - r.y - r.height / 2),
                    gap: t.left - l.right,
                    nested: link.contains(element),
                };
            });
            expect(geometry).toMatchObject({ width: 44, height: 44, nested: false });
            expect(geometry.center).toBeLessThanOrEqual(1);
            expect(geometry.gap).toBeGreaterThanOrEqual(8);
            await trigger.click();
            const menu = preview.getByRole('dialog', { name: 'Actions for Storage box', exact: true });
            await expect(menu).toBeVisible();
            const bounds = await menu.boundingBox();
            expect(bounds).not.toBeNull();
            // Manager iframe offsets are included; verify against its content viewport locally.
            const contained = await menu.evaluate((element) => {
                const r = element.getBoundingClientRect();
                return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
            });
            expect(contained).toBe(true);
            await expect(menu.getByRole('button', { name: 'View Details', exact: true })).toBeVisible();
            await expect(menu.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(
                story === 'available-only' ? 0 : 1
            );
            await page.keyboard.press('Escape');
            await expect(menu).toHaveCount(0);
            await expect(trigger).toBeFocused();
            await page.keyboard.press('Enter');
            await menu.getByRole('button', { name: 'View Details', exact: true }).click();
            await expect(preview.getByRole('status')).toHaveText('Details: Storage box');
            if (story !== 'available-only') {
                await trigger.click();
                await menu.getByRole('button', { name: 'Delete', exact: true }).click();
                await expect(preview.getByRole('heading', { name: 'Delete Storage box?' })).toBeVisible();
                await expect(preview.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
                const confirmation = preview.getByRole('dialog', { name: 'Delete Storage box?', exact: true });
                await expect(confirmation).toBeVisible();
                for (const name of ['Cancel', 'Delete item']) {
                    // Layer entrance scales its contents; measure settled bounds.
                    await expect
                        .poll(
                            async () =>
                                (await confirmation.getByRole('button', { name, exact: true }).boundingBox())?.height ??
                                0
                        )
                        .toBeGreaterThanOrEqual(44);
                }
                await preview.getByRole('button', { name: 'Cancel', exact: true }).click();
                await expect(preview.getByRole('status')).toHaveText('Details: Storage box');
                await expect(trigger).toBeFocused();
            }
            await preview.getByRole('link').first().click();
            await expect(preview.getByRole('status')).toHaveText('Opened Storage box');
            await page.screenshot({ path: testInfo.outputPath(`${story}-${viewport.width}-${viewport.height}.png`) });
        });
    }
}
