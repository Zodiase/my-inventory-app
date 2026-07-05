import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildCommentBody, buildVisualDiffReport, formatPercent, loadSharp } from './visual-diff-report.mjs';

async function writePng(path, { width, height, color, changedPixel }) {
    const sharp = loadSharp();
    const channels = 4;
    const data = Buffer.alloc(width * height * channels);

    for (let index = 0; index < data.length; index += channels) {
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = color.alpha ?? 255;
    }

    if (changedPixel !== undefined) {
        const index = (changedPixel.y * width + changedPixel.x) * channels;
        data[index] = changedPixel.color.r;
        data[index + 1] = changedPixel.color.g;
        data[index + 2] = changedPixel.color.b;
        data[index + 3] = changedPixel.color.alpha ?? 255;
    }

    await sharp(data, { raw: { width, height, channels } }).png().toFile(path);
}

function selectionFor(slug = 'items-add-filter') {
    return {
        groups: [
            {
                id: 'items',
                label: 'Items workflows',
                reason: 'Items view changed',
                matchedFiles: ['meteor-app/imports/ui/AllItemsView/AllItemsViewPresentation.tsx'],
            },
        ],
        scenarios: [
            {
                slug,
                label: 'Items Add Filters panel',
                groupId: 'items',
                groupLabel: 'Items workflows',
                viewport: 'wide',
            },
        ],
    };
}

test('formats visual delta percentages for PR comments', () => {
    assert.equal(formatPercent(0), '0%');
    assert.equal(formatPercent(0.004), '<0.01%');
    assert.equal(formatPercent(0.125), '0.13%');
    assert.equal(formatPercent(2.45), '2.5%');
});

test('builds changed visual report with diff and composite files', async () => {
    const screenshotDir = mkdtempSync(join(tmpdir(), 'visual-diff-report-'));
    const beforePath = join(screenshotDir, 'before-items-add-filter-base123.png');
    const afterPath = join(screenshotDir, 'after-items-add-filter-head456.png');

    await writePng(beforePath, { width: 4, height: 4, color: { r: 255, g: 255, b: 255 } });
    await writePng(afterPath, {
        width: 4,
        height: 4,
        color: { r: 255, g: 255, b: 255 },
        changedPixel: { x: 1, y: 1, color: { r: 0, g: 0, b: 0 } },
    });

    const report = await buildVisualDiffReport({
        selection: selectionFor(),
        screenshotDir,
        baseShort: 'base123',
        headShort: 'head456',
        changedPercentThreshold: 0.1,
    });

    assert.equal(report.summary.changed, 1);
    assert.equal(report.summary.unchanged, 0);
    assert.equal(report.scenarios[0].changedPixels, 1);
    assert.equal(report.scenarios[0].changedPercent, 6.25);
    assert.equal(report.scenarios[0].files.diff, 'diff-items-add-filter-base123-head456.png');
    assert.equal(report.scenarios[0].files.composite, 'composite-items-add-filter-base123-head456.png');
    assert(existsSync(join(screenshotDir, report.scenarios[0].files.diff)));
    assert(existsSync(join(screenshotDir, report.scenarios[0].files.composite)));
});

test('builds unchanged visual report without composite file', async () => {
    const screenshotDir = mkdtempSync(join(tmpdir(), 'visual-diff-report-'));

    await writePng(join(screenshotDir, 'before-items-add-filter-base123.png'), {
        width: 4,
        height: 4,
        color: { r: 255, g: 255, b: 255 },
    });
    await writePng(join(screenshotDir, 'after-items-add-filter-head456.png'), {
        width: 4,
        height: 4,
        color: { r: 255, g: 255, b: 255 },
    });

    const report = await buildVisualDiffReport({
        selection: selectionFor(),
        screenshotDir,
        baseShort: 'base123',
        headShort: 'head456',
    });

    assert.equal(report.summary.changed, 0);
    assert.equal(report.summary.unchanged, 1);
    assert.equal(report.scenarios[0].files.composite, undefined);
    assert(existsSync(join(screenshotDir, report.scenarios[0].files.diff)));
});

test('builds scan-first PR comment with changed evidence gallery', () => {
    const report = {
        threshold: {
            pixelDeltaThreshold: 16,
            changedPercentThreshold: 0.1,
        },
        summary: {
            total: 1,
            changed: 1,
            unchanged: 0,
            missing: 0,
        },
        groups: [
            {
                id: 'items',
                label: 'Items workflows',
                reason: 'Items view changed',
                matchedFiles: ['meteor-app/imports/ui/AllItemsView/AllItemsViewPresentation.tsx'],
                summary: {
                    changed: 1,
                    unchanged: 0,
                    missing: 0,
                },
            },
        ],
        scenarios: [
            {
                slug: 'items-add-filter',
                label: 'Items Add Filters panel',
                groupId: 'items',
                status: 'changed',
                changedPixels: 12,
                changedPercent: 1.5,
                files: {
                    diff: 'diff-items-add-filter-base123-head456.png',
                    composite: 'composite-items-add-filter-base123-head456.png',
                },
            },
        ],
    };

    const body = buildCommentBody({
        report,
        artifactUrl: 'https://github.com/example/actions/artifacts/1',
        publishedRoot: 'https://github.com/example/repo/blob/visual-artifacts/pr-1/visual-evidence/run-1',
    });

    assert(body.includes('|') === false);
    assert(body.includes('<th>Status</th>'));
    assert(body.includes('<th>Evidence</th>'));
    assert(body.includes('Result: **1 changed**, **0 unchanged**, **0 missing**.'));
    assert(body.includes('composite-items-add-filter-base123-head456.png?raw=1'));
    assert(body.includes('### Changed visual evidence'));
    assert(!body.includes('<th>Before'));
    assert(!body.includes('<th>After'));
});
