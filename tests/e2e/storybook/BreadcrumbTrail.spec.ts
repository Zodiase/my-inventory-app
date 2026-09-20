import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('BreadcrumbTrail Component (Storybook)', () => {
    test('keeps the root and nearest location visible while clipping deep ancestors', async ({ page }) => {
        await page.setViewportSize({ width: 700, height: 300 });
        await gotoStory(page, 'ui-breadcrumbtrail', 'many-levels');

        const trail = page.getByRole('navigation');
        const root = trail.getByRole('button', { name: 'Navigate to all items' });
        const nearestLocation = trail.getByText('Subfolder 2');

        await expect(root).toBeVisible();
        await expect(nearestLocation).toBeVisible();

        const metrics = await trail.evaluate((element) => {
            const rootElement = element.querySelector('.breadcrumb-root');
            const viewport = element.querySelector('.breadcrumb-path-viewport');
            const lastGroup = element.querySelector('.breadcrumb-group:last-child');

            if (!(rootElement instanceof HTMLElement)) throw new Error('breadcrumb root not found');
            if (!(viewport instanceof HTMLElement)) throw new Error('breadcrumb viewport not found');
            if (!(lastGroup instanceof HTMLElement)) throw new Error('last breadcrumb group not found');

            const trailRect = element.getBoundingClientRect();
            const rootRect = rootElement.getBoundingClientRect();
            const viewportRect = viewport.getBoundingClientRect();
            const lastRect = lastGroup.getBoundingClientRect();

            return {
                documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                trailRight: trailRect.right,
                rootLeft: rootRect.left,
                viewportLeft: viewportRect.left,
                viewportRight: viewportRect.right,
                lastLeft: lastRect.left,
                lastRight: lastRect.right,
                pathOverflows: viewport.scrollWidth > viewport.clientWidth,
            };
        });

        expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
        expect(metrics.rootLeft).toBeGreaterThanOrEqual(0);
        expect(metrics.pathOverflows).toBe(true);
        expect(metrics.lastLeft).toBeGreaterThanOrEqual(metrics.viewportLeft - 1);
        expect(metrics.lastRight).toBeLessThanOrEqual(metrics.viewportRight + 1);
        expect(metrics.viewportRight).toBeLessThanOrEqual(metrics.trailRight + 1);
    });
});
