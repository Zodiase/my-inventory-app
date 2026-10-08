import { test, expect } from '@playwright/test';
const manager = process.env.SCANNER_STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const payload = 'inventory-action:v1:show-actions';
test('Safari simulation retains exact-case rejection and opts out of browser text transformations', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${manager}/?path=/story/scanner-foundation--action-codes`);
    const f = page.frameLocator('#storybook-preview-iframe');
    await expect(f.getByRole('heading', { name: 'Scanner workspace', exact: true })).toBeVisible();
    const input = f.getByRole('textbox', { name: 'Scanner input', exact: true });
    await expect(input).toHaveAttribute('autocapitalize', 'none');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await expect(input).toHaveAttribute('spellcheck', 'false');
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await page.keyboard.type('Inventory-action:v1:show-actions');
    await page.keyboard.press('Enter');
    await expect(f.getByTestId('mode')).toHaveText('Mode: Inspect');
    await expect(f.getByTestId('dock-feedback')).toContainText('capitalization differs');
    await page.keyboard.type(payload);
    await page.keyboard.press('Enter');
    await expect(f.getByTestId('mode')).toHaveText('Mode: Show actions');
});
test('Safari simulation keeps dock visible and scroll steady while browsing codes and typing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 480 });
    await page.goto(`${manager}/?path=/story/scanner-foundation--action-codes`);
    const f = page.frameLocator('#storybook-preview-iframe');
    await expect(f.getByRole('heading', { name: 'Scanner workspace', exact: true })).toBeVisible();
    await f.getByRole('button', { name: 'Start', exact: true }).click();
    await f.locator('[data-testid="action-card"] img').last().scrollIntoViewIfNeeded();
    const imagePosition = await f.locator('[data-testid="action-card"] img').last().boundingBox();
    const input = f.getByRole('textbox', { name: 'Scanner input', exact: true });
    await expect(input).toBeFocused();
    await page.keyboard.type(payload, { delay: 5 });
    await page.keyboard.press('Enter');
    await expect(input).toBeFocused();
    expect((await f.locator('[data-testid="action-card"] img').last().boundingBox())!.y).toBeCloseTo(
        imagePosition!.y,
        0
    );
    const box = await input.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(480);
});
