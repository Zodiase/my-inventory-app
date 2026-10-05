import { expect, test } from '@playwright/test';

const viewports = [
    { width: 390, height: 844 },
    { width: 820, height: 900 },
    { width: 1280, height: 720 },
    { width: 1600, height: 1000 },
    { width: 640, height: 720 },
    { width: 641, height: 720 },
    { width: 390, height: 240 },
];

for (const viewport of viewports) {
    test(`navigation is visibly anchored and usable at ${viewport.width}x${viewport.height}`, async ({
        page,
    }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize(viewport);
        await page.goto('/iframe.html?id=ui-appshell--navigation&viewMode=story');
        const trigger = page.getByRole('button', { name: 'Open navigation menu' });
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const menu = page.getByRole('navigation', { name: 'Primary navigation' });
        const header = await page.locator('.app-shell-header').boundingBox();
        const box = await menu.boundingBox();
        expect(header).not.toBeNull();
        expect(box).not.toBeNull();
        expect(Math.abs(box!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
        await expect(menu.getByRole('link', { name: 'Items', exact: true })).toHaveAttribute('aria-current', 'page');
        for (const [name, href] of [
            ['Items', '/items'],
            ['Tags', '/tags'],
            ['Search', '/search'],
            ['Data', '/settings/data'],
        ]) {
            await expect(menu.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
        }
        await page.screenshot({ path: testInfo.outputPath('menu-open.png'), fullPage: true });
        await page.keyboard.press('Tab'); // search affordance precedes navigation in DOM
        await expect(page.getByRole('link', { name: 'Search inventory' })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(menu.getByRole('link', { name: 'Items', exact: true })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(menu.getByRole('link', { name: 'Tags', exact: true })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(menu).toHaveCount(0);
        await expect(page.getByText('Current route: /tags', { exact: true })).toBeVisible();
        await trigger.click();
        const data = page
            .getByRole('navigation', { name: 'Primary navigation' })
            .getByRole('link', { name: 'Data', exact: true });
        await data.focus();
        await expect(data).toBeInViewport();
        await page.keyboard.press('Enter');
        await expect(page.getByText('Current route: /settings/data', { exact: true })).toBeVisible();
        await trigger.click();
        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await page.getByRole('link', { name: 'Search inventory' }).click();
        await expect(trigger).toHaveCount(0);
        expect(
            await page.evaluate(() => ({
                x: document.documentElement.scrollWidth > innerWidth,
                y: (document.scrollingElement?.scrollTop ?? 0) > 0,
            }))
        ).toEqual({ x: false, y: false });
        expect(errors).toEqual([]);
    });
}

test('full Storybook manager supports open, native link selection and close recovery', async ({ page }, testInfo) => {
    await page.goto('/?path=/story/ui-appshell--navigation');
    const story = page.frameLocator('#storybook-preview-iframe');
    const trigger = story.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    await expect(story.getByRole('navigation', { name: 'Primary navigation' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('manager-menu-open.png') });
    await story.getByRole('link', { name: 'Tags', exact: true }).click();
    await expect(story.getByText('Current route: /tags', { exact: true })).toBeVisible();
    await trigger.click();
    await trigger.click();
    await expect(story.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
    await expect(page.getByText(/Unable to render|Storybook error/u)).toHaveCount(0);
});
