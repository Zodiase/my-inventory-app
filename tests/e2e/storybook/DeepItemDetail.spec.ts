/** Full-manager regression for the detail story's viewport frame and deep location. */
import { expect, test } from '@playwright/test';

const viewports = [
    { width: 390, height: 480 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1600, height: 1000 },
];
for (const viewport of viewports) {
    test(`deep detail manager ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto('/?path=/story/ui-itemdetailview--deep-container-path');
        const story = page.frameLocator('#storybook-preview-iframe');
        await expect(story.getByRole('heading', { name: 'Camping Tent', exact: true })).toBeVisible();
        // Storybook's optional release toast can cover the short-phone action row.
        await page
            .getByRole('button', { name: 'Dismiss notification' })
            .click({ timeout: 2000 })
            .catch(() => {});
        const nav = story.locator('nav');
        await expect(nav.getByRole('button', { name: 'Navigate to Camping Equipment Box', exact: true })).toBeVisible();
        const metrics = await nav.evaluate((node) => {
            const viewport = node.querySelector('.breadcrumb-path-viewport')!;
            const last = node.querySelector('.breadcrumb-group:last-child')!;
            return {
                document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                navRight: node.getBoundingClientRect().right,
                frameWidth: document.documentElement.clientWidth,
                lastRight: last.getBoundingClientRect().right,
                viewportRight: viewport.getBoundingClientRect().right,
            };
        });
        expect(metrics.document).toBeLessThanOrEqual(1);
        expect(metrics.navRight).toBeLessThanOrEqual(metrics.frameWidth);
        expect(metrics.lastRight).toBeLessThanOrEqual(metrics.viewportRight + 1);
        await page.screenshot({ path: testInfo.outputPath('manager.png'), fullPage: true });
        // Focus reveals a clipped early ancestor without making the document wider.
        const home = nav.getByRole('button', { name: 'Navigate to Home', exact: true });
        await home.focus();
        await expect(home).toBeFocused();
        expect(
            await home.evaluate((node) => {
                const parent = node.closest('.breadcrumb-path-viewport')!.getBoundingClientRect();
                const bounds = node.getBoundingClientRect();
                return bounds.left >= parent.left - 1 && bounds.right <= parent.right + 1;
            })
        ).toBe(true);
        await story.getByRole('button', { name: /Delete$/ }).scrollIntoViewIfNeeded();
        await expect(story.getByRole('button', { name: /Delete$/ })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('manager-scrolled.png'), fullPage: true });
        await story.getByRole('button', { name: /Delete$/ }).click();
        await expect(story.getByRole('heading', { name: 'Camping Tent', exact: true })).toBeVisible();
    });
}
