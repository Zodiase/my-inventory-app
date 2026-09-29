/** Capture whole-story and repeated-row geometry for tri-state design review. */
import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const story = '/iframe.html?id=prototypes-tri-state-indicator-lane--off&viewMode=story';
const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'ipad', width: 820, height: 900 },
];

for (const viewport of viewports) {
    test(`${viewport.name} records full-story and repeated-row proportions`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(story);
        const rows = page.getByLabel('Compact tag rows');
        await expect(rows.locator('.tri-lane-compact-row')).toHaveCount(6);

        const metrics = await page.evaluate(() => {
            const rectangle = (element: Element): DOMRect => element.getBoundingClientRect();
            const compact = document.querySelector('.tri-lane-compact-row');
            const rail = compact?.querySelector('.tri-state-rail');
            const label = rail?.querySelector('.tri-state-position > span');
            const handle = rail?.querySelector('.tri-state-handle');
            const large = document.querySelector('.tri-lane-stage .tri-state-rail');
            if (!compact || !rail || !label || !handle || !large) throw new Error('Story geometry is incomplete');
            const rowBox = rectangle(compact);
            const railBox = rectangle(rail);
            const labelBox = rectangle(label);
            const handleBox = rectangle(handle);
            const largeBox = rectangle(large);
            const visiblePill = getComputedStyle(rail, '::before');
            return {
                viewport: { width: innerWidth, height: innerHeight },
                row: { width: rowBox.width, height: rowBox.height },
                compactRail: { width: railBox.width, height: railBox.height },
                visiblePill: { width: visiblePill.width, height: visiblePill.height },
                enlargedRail: { width: largeBox.width, height: largeBox.height },
                railToRowWidth: railBox.width / rowBox.width,
                railToRowHeight: railBox.height / rowBox.height,
                labelCenterY: labelBox.y + labelBox.height / 2,
                railCenterY: railBox.y + railBox.height / 2,
                handleOverlapsLabel: handleBox.top < labelBox.bottom && handleBox.bottom > labelBox.top,
                horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            };
        });
        const geometryPath = testInfo.outputPath(`geometry-before-${viewport.name}.json`);
        await writeFile(geometryPath, `${JSON.stringify(metrics, null, 2)}\n`);
        await testInfo.attach('geometry', { path: geometryPath, contentType: 'application/json' });
        await page.screenshot({ path: testInfo.outputPath(`density-before-${viewport.name}.png`), fullPage: true });
        await rows.screenshot({ path: testInfo.outputPath(`rows-before-${viewport.name}.png`) });

        await rows.getByRole('radio', { name: 'No filter for Needs sorting' }).focus();
        await page.screenshot({ path: testInfo.outputPath(`focus-before-${viewport.name}.png`), fullPage: true });
    });
}
