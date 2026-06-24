import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 390, height: 844 },
];

const ROUTES = ['/', '/items', '/items/:id', '/tags', '/tags/:id', '/search', '/settings/data', '/does-not-exist'];

type Viewport = (typeof VIEWPORTS)[number];

type DiagnosticsSnapshot = {
    errors: unknown[];
    warnings: unknown[];
    exceptions: unknown[];
    rejections: unknown[];
    route: string;
    counts: {
        items: number;
        containers: number;
        tags: number;
    };
    timestamp: number;
};

type AuditResult = {
    viewport: Viewport;
    route: string;
    finalUrl: string;
    title: string;
    diag: DiagnosticsSnapshot | null;
    bodyTextSample: string;
    headings: string[];
    screenshot: string;
    a11ySnapshot: string;
};

let targetItemId = 'dummy-item';
let targetTagId = 'dummy-tag';

const report: { generatedAt: string; meteorBaseUrl: string; results: AuditResult[] } = {
    generatedAt: new Date().toISOString(),
    meteorBaseUrl: 'http://localhost:3000',
    results: [],
};

function expectCleanDiagnostics(diag: DiagnosticsSnapshot | null): void {
    expect(diag, 'diagnostics should be installed on audited routes').not.toBeNull();
    expect(diag?.errors, 'console.error entries').toEqual([]);
    expect(diag?.warnings, 'console.warn entries').toEqual([]);
    expect(diag?.exceptions, 'window error events').toEqual([]);
    expect(diag?.rejections, 'unhandled promise rejections').toEqual([]);
}

test.describe('Audit Sweep', () => {
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await page.goto('http://localhost:3000/');

        await page
            .waitForFunction(
                () => {
                    const diag = (window as any).__diagnostics?.get();
                    return diag && diag.counts && diag.counts.items > 0;
                },
                undefined,
                { timeout: 15000 }
            )
            .catch(() => {});

        targetItemId =
            (await page.evaluate(() => {
                const meteor = (window as any).Meteor;
                if (meteor && meteor.connection && meteor.connection._stores && meteor.connection._stores['items']) {
                    const item = meteor.connection._stores['items']._getCollection().findOne();
                    if (item) return item._id;
                }
                return 'fallback-item-id';
            })) || 'fallback-item-id';

        await page.goto('http://localhost:3000/tags');
        await page
            .waitForFunction(
                () => {
                    const diag = (window as any).__diagnostics?.get();
                    return diag && diag.counts && diag.counts.tags > 0;
                },
                undefined,
                { timeout: 15000 }
            )
            .catch(() => {});

        targetTagId =
            (await page.evaluate(() => {
                const meteor = (window as any).Meteor;
                if (meteor && meteor.connection && meteor.connection._stores && meteor.connection._stores['tags']) {
                    const tag = meteor.connection._stores['tags']._getCollection().findOne();
                    if (tag) return tag._id;
                }
                return 'fallback-tag-id';
            })) || 'fallback-tag-id';

        await page.close();
    });

    for (const viewport of VIEWPORTS) {
        test.describe(`Viewport: ${viewport.label}`, () => {
            test.use({ viewport: { width: viewport.width, height: viewport.height } });

            for (const route of ROUTES) {
                test(`Route: ${route}`, async ({ page }) => {
                    test.setTimeout(60_000);
                    let actualRoute = route;
                    if (route === '/items/:id') actualRoute = `/items/${targetItemId}`;
                    if (route === '/tags/:id') actualRoute = `/tags/${targetTagId}`;

                    await page.goto(actualRoute, { waitUntil: 'domcontentloaded' });

                    // Wait for diagnostics count or timeout
                    await page
                        .waitForFunction(
                            () => {
                                const diag = (window as any).__diagnostics?.get();
                                return diag && diag.counts && diag.counts.items > 0;
                            },
                            undefined,
                            { timeout: 2000 }
                        )
                        .catch(() => {});

                    const routeSlug = route.replace(/\//g, '-').replace(/^-|-$/g, '') || 'root';
                    const artifactDir = path.resolve(__dirname, 'artifacts', viewport.label);
                    fs.mkdirSync(artifactDir, { recursive: true });

                    const screenshotPathRel = `${viewport.label}/${routeSlug}.png`;
                    const a11ySnapshotPathRel = `${viewport.label}/${routeSlug}.a11y.json`;

                    const screenshotPath = path.resolve(artifactDir, `${routeSlug}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });

                    const a11ySnapshot = await page.accessibility.snapshot();
                    fs.writeFileSync(
                        path.resolve(artifactDir, `${routeSlug}.a11y.json`),
                        JSON.stringify(a11ySnapshot, null, 2)
                    );

                    const diag = await page.evaluate((): DiagnosticsSnapshot | null => {
                        return (window as any).__diagnostics?.get() || null;
                    });

                    expectCleanDiagnostics(diag);

                    const title = await page.title();
                    const bodyTextSample = await page.evaluate(() => {
                        return document.body.innerText.substring(0, 800);
                    });

                    const headings = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(
                            (h) => `${h.tagName.toLowerCase()}:${h.textContent?.trim()}`
                        );
                    });

                    report.results.push({
                        viewport: viewport,
                        route: route,
                        finalUrl: page.url(),
                        title,
                        diag,
                        bodyTextSample,
                        headings,
                        screenshot: screenshotPathRel,
                        a11ySnapshot: a11ySnapshotPathRel,
                    });
                });
            }
        });
    }

    test.afterAll(async () => {
        report.generatedAt = new Date().toISOString();
        const artifactsDir = path.resolve(__dirname, 'artifacts');
        fs.mkdirSync(artifactsDir, { recursive: true });
        fs.writeFileSync(path.resolve(artifactsDir, 'audit-report.json'), JSON.stringify(report, null, 2));
    });
});
