import { expect, test } from '@playwright/test';

import { gotoStory } from '../helpers/storybook-helpers';

test.describe('HoistedContainerGroup (Storybook)', () => {
    test('renders inside the full Storybook manager without a React error overlay', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await page.goto('/?path=/story/ui-hoistedcontainergroup--border-label');

        const preview = page.frameLocator('#storybook-preview-iframe');
        await expect(preview.getByRole('group', { name: 'Third floor contents' })).toBeVisible();
        await expect(preview.getByText('Objects are not valid as a React child', { exact: false })).toHaveCount(0);
        expect(pageErrors).toEqual([]);
    });

    test('keeps the logical container compact while exposing its children', async ({ page }) => {
        await gotoStory(page, 'ui-hoistedcontainergroup', 'border-label');

        const group = page.getByRole('group', { name: 'Third floor contents' });
        await expect(group.getByRole('link', { name: 'Open container Third floor' })).toHaveAttribute(
            'href',
            '/container/third-floor'
        );
        await expect(group.getByRole('link', { name: 'Open container Laundry room' })).toHaveAttribute(
            'href',
            '/container/laundry-room'
        );
        await expect(group.getByRole('link', { name: 'Open container Main bedroom' })).toBeVisible();
        await expect(group.getByRole('link', { name: 'Open container Secondary bedroom' })).toBeVisible();
        await expect(group).toContainText('3 locations');

        const heading = page.getByRole('heading', { name: 'Headen Way home' });
        const spacing = await group.evaluate(
            (element, headingElement) => {
                const groupRect = element.getBoundingClientRect();
                const headingRect = headingElement.getBoundingClientRect();
                const childRects = [...element.querySelectorAll('[role="listitem"]')].map((child) =>
                    child.getBoundingClientRect()
                );

                return {
                    headingGap: groupRect.top - headingRect.bottom,
                    groupHeight: groupRect.height,
                    bottomInset: groupRect.bottom - Math.max(...childRects.map((rect) => rect.bottom)),
                };
            },
            await heading.elementHandle()
        );

        expect(spacing.headingGap).toBeLessThanOrEqual(24);
        expect(spacing.groupHeight).toBeLessThanOrEqual(100);
        expect(spacing.bottomInset).toBeLessThanOrEqual(12);

        const childGeometry = await group.locator('[role="listitem"]').evaluateAll((children) =>
            children.map((child) => {
                const link = child.querySelector('a');
                const icon = child.querySelector('svg');
                if (link === null || icon === null) throw new Error('Child link or icon was not rendered');

                return {
                    linkHeight: link.getBoundingClientRect().height,
                    iconTop: icon.getBoundingClientRect().top,
                };
            })
        );

        expect(new Set(childGeometry.map(({ linkHeight }) => linkHeight)).size).toBe(1);
        expect(new Set(childGeometry.map(({ iconTop }) => iconTop)).size).toBe(1);
    });

    test('stacks children without horizontal overflow on a phone', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoStory(page, 'ui-hoistedcontainergroup', 'border-label');

        const group = page.getByRole('group', { name: 'Third floor contents' });
        const metrics = await group.evaluate((element) => ({
            viewportWidth: document.documentElement.clientWidth,
            documentWidth: document.documentElement.scrollWidth,
            groupWidth: element.getBoundingClientRect().width,
            childTops: [...element.querySelectorAll('[role="listitem"]')].map(
                (child) => child.getBoundingClientRect().top
            ),
        }));

        expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
        expect(metrics.groupWidth).toBeLessThanOrEqual(metrics.viewportWidth);
        expect(new Set(metrics.childTops).size).toBe(3);
    });
});
