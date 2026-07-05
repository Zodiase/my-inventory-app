/**
 * Builds visual-diff metadata and PR comment Markdown from CI screenshots.
 * Kept separate from the workflow so image comparison, composite generation,
 * and comment layout stay testable outside GitHub Actions.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DEFAULT_PIXEL_DELTA_THRESHOLD = 16;
const DEFAULT_CHANGED_PERCENT_THRESHOLD = 0.1;
const DEFAULT_COMPOSITE_WIDTH = 1440;
const DIFF_RED = [225, 29, 72, 255];
const WHITE = [255, 255, 255, 255];

let sharpInstance;

export function loadSharp() {
    if (sharpInstance !== undefined) return sharpInstance;

    const requireFromMeteorApp = createRequire(new URL('../meteor-app/package.json', import.meta.url));
    const requireFromRoot = createRequire(import.meta.url);

    try {
        sharpInstance = requireFromMeteorApp('sharp');
    } catch (meteorError) {
        try {
            sharpInstance = requireFromRoot('sharp');
        } catch (rootError) {
            throw new Error(
                `Unable to load sharp from meteor-app or the repository root. Run meteor npm ci in meteor-app before building visual diff reports. (${meteorError.message}; ${rootError.message})`
            );
        }
    }

    return sharpInstance;
}

function readOption(args, name) {
    const index = args.indexOf(name);
    if (index === -1) return undefined;

    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for ${name}`);
    }

    return value;
}

function readNumberOption(args, name, fallback) {
    const value = readOption(args, name);
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${name} must be a finite number.`);
    }
    return parsed;
}

function readSelection(args) {
    const selectionJson = readOption(args, '--selection-json') ?? process.env.VISUAL_SELECTION_JSON;
    const selectionJsonPath = readOption(args, '--selection-json-file');

    if (selectionJson !== undefined && selectionJson.trim() !== '') {
        return JSON.parse(selectionJson);
    }
    if (selectionJsonPath !== undefined) {
        return JSON.parse(readFileSync(selectionJsonPath, 'utf8'));
    }

    throw new Error('Set VISUAL_SELECTION_JSON or pass --selection-json-file.');
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function escapeSvg(value) {
    return escapeHtml(value).replaceAll("'", '&apos;');
}

function fillPixel(buffer, index, color) {
    buffer[index] = color[0];
    buffer[index + 1] = color[1];
    buffer[index + 2] = color[2];
    buffer[index + 3] = color[3];
}

function imagePixelIndex(image, x, y) {
    if (x >= image.width || y >= image.height) return undefined;
    return (y * image.width + x) * image.channels;
}

function channelAt(image, x, y, channel) {
    const index = imagePixelIndex(image, x, y);
    if (index === undefined) return undefined;
    return image.data[index + channel];
}

function pixelChanged(before, after, x, y, pixelDeltaThreshold) {
    const beforeIndex = imagePixelIndex(before, x, y);
    const afterIndex = imagePixelIndex(after, x, y);

    if (beforeIndex === undefined || afterIndex === undefined) {
        return beforeIndex !== afterIndex;
    }

    for (let channel = 0; channel < 4; channel += 1) {
        if (Math.abs(channelAt(before, x, y, channel) - channelAt(after, x, y, channel)) > pixelDeltaThreshold) {
            return true;
        }
    }
    return false;
}

function markDiffPixel(buffer, width, height, x, y) {
    for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
            const px = x + dx;
            const py = y + dy;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            fillPixel(buffer, (py * width + px) * 4, DIFF_RED);
        }
    }
}

async function readRgbaImage(path) {
    const sharp = loadSharp();
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    return {
        data,
        width: info.width,
        height: info.height,
        channels: info.channels,
    };
}

async function writeDiffImage({ before, after, outputPath, pixelDeltaThreshold }) {
    const sharp = loadSharp();
    const width = Math.max(before.width, after.width);
    const height = Math.max(before.height, after.height);
    const diff = Buffer.alloc(width * height * 4);
    let changedPixels = 0;

    for (let index = 0; index < diff.length; index += 4) {
        fillPixel(diff, index, WHITE);
    }

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (!pixelChanged(before, after, x, y, pixelDeltaThreshold)) continue;
            changedPixels += 1;
            markDiffPixel(diff, width, height, x, y);
        }
    }

    await sharp(diff, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(outputPath);

    return {
        changedPixels,
        totalPixels: width * height,
        width,
        height,
    };
}

function labelSvg(width, text, options = {}) {
    const background = options.background ?? '#f6f8fa';
    const foreground = options.foreground ?? '#24292f';

    return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" viewBox="0 0 ${width} 34">
  <rect width="${width}" height="34" rx="6" fill="${background}"/>
  <text x="14" y="22" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="15" font-weight="600" fill="${foreground}">${escapeSvg(text)}</text>
</svg>`);
}

async function resizedPng(path, width) {
    const sharp = loadSharp();
    return sharp(path).resize({ width }).png().toBuffer();
}

async function imageMetadata(path) {
    return loadSharp()(path).metadata();
}

export function formatPercent(value) {
    if (value === 0) return '0%';
    if (value < 0.01) return '<0.01%';
    if (value < 1) return `${value.toFixed(2)}%`;
    return `${value.toFixed(1)}%`;
}

async function writeCompositeImage({
    beforePath,
    afterPath,
    diffPath,
    outputPath,
    label,
    changedPercent,
    changedPixels,
    baseShort,
    headShort,
    maxWidth = DEFAULT_COMPOSITE_WIDTH,
}) {
    const sharp = loadSharp();
    const [beforeMeta, afterMeta, diffMeta] = await Promise.all([
        imageMetadata(beforePath),
        imageMetadata(afterPath),
        imageMetadata(diffPath),
    ]);
    const padding = 24;
    const gap = 16;
    const sectionGap = 24;
    const labelHeight = 34;
    const contentWidth = Math.min(Math.max(diffMeta.width ?? 0, 900), maxWidth);
    const diffHeight = Math.round(((diffMeta.height ?? 1) / (diffMeta.width ?? 1)) * contentWidth);
    const pairWidth = Math.floor((contentWidth - gap) / 2);
    const beforeHeight = Math.round(((beforeMeta.height ?? 1) / (beforeMeta.width ?? 1)) * pairWidth);
    const afterHeight = Math.round(((afterMeta.height ?? 1) / (afterMeta.width ?? 1)) * pairWidth);
    const pairHeight = Math.max(beforeHeight, afterHeight);
    const width = contentWidth + padding * 2;
    const height = padding + labelHeight + diffHeight + sectionGap + labelHeight + pairHeight + padding;
    const diffTop = padding + labelHeight;
    const pairLabelTop = diffTop + diffHeight + sectionGap;
    const pairImageTop = pairLabelTop + labelHeight;

    const [diffImage, beforeImage, afterImage] = await Promise.all([
        resizedPng(diffPath, contentWidth),
        resizedPng(beforePath, pairWidth),
        resizedPng(afterPath, pairWidth),
    ]);

    await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: '#ffffff',
        },
    })
        .composite([
            {
                input: labelSvg(
                    contentWidth,
                    `${label} diff mask - ${formatPercent(changedPercent)} changed (${changedPixels} px)`
                ),
                left: padding,
                top: padding,
            },
            { input: diffImage, left: padding, top: diffTop },
            { input: labelSvg(pairWidth, `Before base ${baseShort}`), left: padding, top: pairLabelTop },
            {
                input: labelSvg(pairWidth, `After PR ${headShort}`),
                left: padding + pairWidth + gap,
                top: pairLabelTop,
            },
            { input: beforeImage, left: padding, top: pairImageTop },
            { input: afterImage, left: padding + pairWidth + gap, top: pairImageTop },
        ])
        .png()
        .toFile(outputPath);
}

function scenarioImageNames(scenario, baseShort, headShort) {
    return {
        before: `before-${scenario.slug}-${baseShort}.png`,
        after: `after-${scenario.slug}-${headShort}.png`,
        diff: `diff-${scenario.slug}-${baseShort}-${headShort}.png`,
        composite: `composite-${scenario.slug}-${baseShort}-${headShort}.png`,
    };
}

async function analyzeScenario({
    scenario,
    screenshotDir,
    baseShort,
    headShort,
    pixelDeltaThreshold,
    changedPercentThreshold,
}) {
    const files = scenarioImageNames(scenario, baseShort, headShort);
    const beforePath = join(screenshotDir, files.before);
    const afterPath = join(screenshotDir, files.after);
    const diffPath = join(screenshotDir, files.diff);
    const compositePath = join(screenshotDir, files.composite);

    if (!existsSync(beforePath) || !existsSync(afterPath)) {
        return {
            ...scenario,
            status: 'missing',
            changedPixels: 0,
            totalPixels: 0,
            changedPercent: 0,
            files: {
                before: existsSync(beforePath) ? files.before : undefined,
                after: existsSync(afterPath) ? files.after : undefined,
            },
        };
    }

    const [before, after] = await Promise.all([readRgbaImage(beforePath), readRgbaImage(afterPath)]);
    const diff = await writeDiffImage({
        before,
        after,
        outputPath: diffPath,
        pixelDeltaThreshold,
    });
    const changedPercent = diff.totalPixels === 0 ? 0 : (diff.changedPixels / diff.totalPixels) * 100;
    const status = changedPercent >= changedPercentThreshold ? 'changed' : 'unchanged';
    const result = {
        ...scenario,
        status,
        changedPixels: diff.changedPixels,
        totalPixels: diff.totalPixels,
        changedPercent,
        width: diff.width,
        height: diff.height,
        files: {
            before: files.before,
            after: files.after,
            diff: files.diff,
        },
    };

    if (status === 'changed') {
        await writeCompositeImage({
            beforePath,
            afterPath,
            diffPath,
            outputPath: compositePath,
            label: scenario.label,
            changedPercent,
            changedPixels: diff.changedPixels,
            baseShort,
            headShort,
        });
        result.files.composite = files.composite;
    }

    return result;
}

function summarizeResults(results) {
    return {
        total: results.length,
        changed: results.filter(({ status }) => status === 'changed').length,
        unchanged: results.filter(({ status }) => status === 'unchanged').length,
        missing: results.filter(({ status }) => status === 'missing').length,
    };
}

function summarizeGroups(groups, results) {
    return groups.map((group) => {
        const groupResults = results.filter((result) => result.groupId === group.id);
        return {
            ...group,
            summary: summarizeResults(groupResults),
        };
    });
}

export async function buildVisualDiffReport({
    selection,
    screenshotDir,
    baseShort,
    headShort,
    pixelDeltaThreshold = DEFAULT_PIXEL_DELTA_THRESHOLD,
    changedPercentThreshold = DEFAULT_CHANGED_PERCENT_THRESHOLD,
}) {
    mkdirSync(screenshotDir, { recursive: true });

    const scenarios = [];
    for (const scenario of selection.scenarios ?? []) {
        scenarios.push(
            await analyzeScenario({
                scenario,
                screenshotDir,
                baseShort,
                headShort,
                pixelDeltaThreshold,
                changedPercentThreshold,
            })
        );
    }

    return {
        version: 1,
        threshold: {
            pixelDeltaThreshold,
            changedPercentThreshold,
        },
        changedFiles: selection.changedFiles ?? [],
        reasons: selection.reasons ?? [],
        groups: summarizeGroups(selection.groups ?? [], scenarios),
        scenarios,
        summary: summarizeResults(scenarios),
    };
}

function summarizeFiles(files = []) {
    if (files.length === 0) return '';
    const shown = files
        .slice(0, 5)
        .map((file) => `\`${file}\``)
        .join(', ');
    return files.length > 5 ? `${shown}, +${files.length - 5} more` : shown;
}

function imageUrl(publishedRoot, file) {
    return `${publishedRoot}/${file}?raw=1`;
}

function statusText(status) {
    if (status === 'changed') return 'Changed';
    if (status === 'unchanged') return 'Unchanged';
    return 'Missing';
}

function scenarioRows(group, scenarios, publishedRoot, artifactUrl) {
    return scenarios
        .filter((scenario) => scenario.groupId === group.id)
        .map((scenario) => {
            const evidence =
                scenario.status === 'changed' && scenario.files.composite !== undefined
                    ? `<a href="${imageUrl(publishedRoot, scenario.files.composite)}">Composite</a> · <a href="${imageUrl(publishedRoot, scenario.files.diff)}">Diff</a>`
                    : artifactUrl === undefined
                      ? '-'
                      : `<a href="${artifactUrl}">Artifact</a>`;

            return [
                '<tr>',
                `<td><strong>${escapeHtml(scenario.label)}</strong><br><code>${escapeHtml(scenario.slug)}</code></td>`,
                `<td>${statusText(scenario.status)}</td>`,
                `<td><code>${formatPercent(scenario.changedPercent)}</code><br>${scenario.changedPixels} px</td>`,
                `<td>${evidence}</td>`,
                '</tr>',
            ].join('\n');
        })
        .join('\n');
}

function groupSections(report, publishedRoot, artifactUrl) {
    return report.groups
        .map((group) =>
            [
                '<details open>',
                `<summary><strong>${escapeHtml(group.label)}</strong> - ${group.summary.changed} changed, ${group.summary.unchanged} unchanged, ${group.summary.missing} missing</summary>`,
                '',
                '<table>',
                '<thead>',
                '<tr>',
                '<th>Scenario</th>',
                '<th>Status</th>',
                '<th>Delta</th>',
                '<th>Evidence</th>',
                '</tr>',
                '</thead>',
                '<tbody>',
                scenarioRows(group, report.scenarios, publishedRoot, artifactUrl),
                '</tbody>',
                '</table>',
                '</details>',
            ].join('\n')
        )
        .join('\n\n');
}

function selectionSummary(report) {
    return report.groups
        .map((group) => {
            const files = summarizeFiles(group.matchedFiles);
            return `- **${group.label}**: ${group.reason}${files === '' ? '' : ` (${files})`}`;
        })
        .join('\n');
}

function changedEvidenceGallery(report, publishedRoot) {
    const changed = report.scenarios.filter(
        (scenario) => scenario.status === 'changed' && scenario.files.composite !== undefined
    );
    if (changed.length === 0) return '_No visual changes exceeded the configured threshold._';

    return changed
        .map((scenario) =>
            [
                '<details open>',
                `<summary><strong>${escapeHtml(scenario.label)}</strong> - ${formatPercent(scenario.changedPercent)} changed</summary>`,
                '',
                `<a href="${imageUrl(publishedRoot, scenario.files.composite)}"><img src="${imageUrl(publishedRoot, scenario.files.composite)}" alt="Composite visual diff for ${escapeHtml(scenario.label)}" width="900"></a>`,
                '</details>',
            ].join('\n')
        )
        .join('\n\n');
}

export function buildCommentBody({ report, artifactUrl, publishedRoot }) {
    const summary = report.summary;
    const threshold = report.threshold;

    const lines = [
        '<!-- pr-visual-evidence -->',
        '## Visual evidence',
        '',
        `Captured ${summary.total} selected scenario${summary.total === 1 ? '' : 's'} from the PR diff.`,
        '',
        `Result: **${summary.changed} changed**, **${summary.unchanged} unchanged**, **${summary.missing} missing**.`,
        `Threshold: ${formatPercent(threshold.changedPercentThreshold)} of pixels changed after per-channel delta > ${threshold.pixelDeltaThreshold}.`,
        '',
        selectionSummary(report),
        '',
        groupSections(report, publishedRoot, artifactUrl),
        '',
        '### Changed visual evidence',
        '',
        changedEvidenceGallery(report, publishedRoot),
    ];

    if (artifactUrl !== undefined) {
        lines.push('', `[Download full screenshot artifact](${artifactUrl})`);
    }

    return lines.join('\n');
}

function writeGitHubOutputs(path, outputs) {
    appendFileSync(path, [...Object.entries(outputs).map(([key, value]) => `${key}=${value}`), ''].join('\n'));
}

async function runBuild(args) {
    const selection = readSelection(args);
    const screenshotDir = readOption(args, '--screenshot-dir') ?? process.env.VISUAL_OUTPUT_DIR;
    const baseShort = readOption(args, '--base-short') ?? process.env.BASE_SHORT;
    const headShort = readOption(args, '--head-short') ?? process.env.HEAD_SHORT;
    const reportJsonPath = readOption(args, '--report-json');
    const githubOutputPath = readOption(args, '--github-output');
    const pixelDeltaThreshold = readNumberOption(args, '--pixel-delta-threshold', DEFAULT_PIXEL_DELTA_THRESHOLD);
    const changedPercentThreshold = readNumberOption(
        args,
        '--changed-percent-threshold',
        DEFAULT_CHANGED_PERCENT_THRESHOLD
    );

    if (screenshotDir === undefined) throw new Error('Set VISUAL_OUTPUT_DIR or pass --screenshot-dir.');
    if (baseShort === undefined) throw new Error('Set BASE_SHORT or pass --base-short.');
    if (headShort === undefined) throw new Error('Set HEAD_SHORT or pass --head-short.');
    if (reportJsonPath === undefined) throw new Error('Pass --report-json.');

    const report = await buildVisualDiffReport({
        selection,
        screenshotDir,
        baseShort,
        headShort,
        pixelDeltaThreshold,
        changedPercentThreshold,
    });

    writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    if (githubOutputPath !== undefined) {
        writeGitHubOutputs(githubOutputPath, {
            'report-json': reportJsonPath,
            'changed-count': report.summary.changed,
            'unchanged-count': report.summary.unchanged,
            'missing-count': report.summary.missing,
        });
    }

    console.log(JSON.stringify(report, null, 2));
}

async function runComment(args) {
    const reportJsonPath = readOption(args, '--report-json');
    const commentBodyPath = readOption(args, '--comment-body');
    const githubOutputPath = readOption(args, '--github-output');
    const artifactUrl = readOption(args, '--artifact-url') ?? process.env.ARTIFACT_URL;
    const publishedRoot = readOption(args, '--published-root') ?? process.env.PUBLISHED_ROOT;

    if (reportJsonPath === undefined) throw new Error('Pass --report-json.');
    if (commentBodyPath === undefined) throw new Error('Pass --comment-body.');
    if (publishedRoot === undefined) throw new Error('Set PUBLISHED_ROOT or pass --published-root.');

    const report = JSON.parse(readFileSync(reportJsonPath, 'utf8'));
    const body = buildCommentBody({ report, artifactUrl, publishedRoot });

    writeFileSync(commentBodyPath, `${body}\n`);
    if (githubOutputPath !== undefined) {
        writeGitHubOutputs(githubOutputPath, {
            'comment-body': commentBodyPath,
            'comment-file': basename(commentBodyPath),
        });
    }
    console.log(body);
}

async function runCli() {
    const [command, ...args] = process.argv.slice(2);

    if (command === 'build') {
        await runBuild(args);
        return;
    }
    if (command === 'comment') {
        await runComment(args);
        return;
    }

    throw new Error(
        'Usage: node scripts/visual-diff-report.mjs <build|comment> --report-json <path> [--screenshot-dir <path>]'
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await runCli();
}
