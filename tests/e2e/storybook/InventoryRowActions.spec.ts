import { expect, test } from '@playwright/test';

for (const story of ['ordinary', 'hoisted', 'physical', 'search', 'tag-results']) {
    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 768, height: 1024 },
        { width: 390, height: 844 },
    ]) {
        test(`${story} real composition at ${viewport.width}px`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await page.goto(`/?path=/story/integration-inventoryrowactions--${story}&panel=false`);
            const frame = page.frameLocator('#storybook-preview-iframe');
            const triggers = frame.getByRole('button', { name: /^Actions for / });
            await expect(triggers.first()).toBeVisible();
            for (const trigger of await triggers.all()) {
                const bounds = await trigger.boundingBox();
                expect(bounds?.width).toBe(44);
                expect(bounds?.height).toBe(44);
                expect(await trigger.evaluate((node) => node.closest('a') === null)).toBe(true);
            }
            const trigger = triggers.first();
            const name = await trigger.getAttribute('aria-label');
            await trigger.click();
            const menu = frame.getByRole('dialog', { name: name ?? '' });
            await expect(menu.getByRole('button', { name: 'View Details' })).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(menu).not.toBeVisible();
            await expect(trigger).toBeFocused();
            if (story === 'physical' && viewport.width === 390) {
                const label = frame.getByText('Top left storage bin with a long name', { exact: true }).first();
                expect((await label.boundingBox())?.width).toBeGreaterThan(50);
            }
            await page.screenshot({ path: test.info().outputPath(`${story}-${viewport.width}.png`) });
        });
    }
}
