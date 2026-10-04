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
            if (story === 'hoisted') {
                const header = frame.getByRole('link', { name: 'Open container Garage', exact: true });
                expect((await header.boundingBox())?.height).toBeGreaterThanOrEqual(44);
            }
            if (story === 'physical' && viewport.width === 390) {
                const label = frame.getByText('Top left storage bin with a long name', { exact: true }).first();
                expect((await label.boundingBox())?.width).toBeGreaterThan(50);
            }
            if (story === 'physical') {
                const slot = frame.getByRole('link', { name: /Open container Top left storage bin/ });
                const nextTier = frame.getByRole('row', { name: 'Tier 2', exact: true });
                const slotBounds = await slot.boundingBox();
                const nextBounds = await nextTier.boundingBox();
                expect((slotBounds?.y ?? 0) + (slotBounds?.height ?? 0)).toBeLessThanOrEqual(nextBounds?.y ?? 0);
                if (viewport.width <= 768) {
                    const actionBounds = await trigger.boundingBox();
                    expect(actionBounds?.y ?? 0).toBeGreaterThanOrEqual(
                        (slotBounds?.y ?? 0) + (slotBounds?.height ?? 0)
                    );
                }
            }
            if (story === 'search' || story === 'tag-results') {
                const links = frame.locator('a[href^="/items/"], a[href^="/container/"]');
                const boxes = await links.evaluateAll((nodes) =>
                    nodes.map((node) => {
                        const box = node.getBoundingClientRect();
                        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
                    })
                );
                expect(boxes.length).toBe(7);
                for (let index = 0; index < boxes.length; index++) {
                    for (const other of boxes.slice(index + 1)) {
                        const current = boxes[index];
                        const overlaps =
                            current.left < other.right &&
                            current.right > other.left &&
                            current.top < other.bottom &&
                            current.bottom > other.top;
                        expect(overlaps).toBe(false);
                    }
                }
            }
            await page.screenshot({ path: test.info().outputPath(`${story}-${viewport.width}.png`) });
        });
    }
}
