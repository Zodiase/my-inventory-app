import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { resetDatabase, waitForMeteorReady } from '../../helpers/database';
import { createItem, createTag } from '../../helpers/factories';

interface VisualScenario {
    slug: string;
    label: string;
    viewport: 'desktop' | 'mobile' | 'wide';
}

interface VisualSelection {
    scenarios?: VisualScenario[];
}

interface VisualData {
    lampId: string;
    toolsTagId: string;
}

const visualOutputDir = process.env.VISUAL_OUTPUT_DIR;
const visualRefKind = process.env.VISUAL_REF_KIND ?? 'snapshot';
const visualRefShort = process.env.VISUAL_REF_SHORT ?? 'local';

const viewportSizes = {
    desktop: { width: 1280, height: 800 },
    mobile: { width: 390, height: 844 },
    wide: { width: 2048, height: 768 },
} as const;

function parseSelection(): VisualSelection {
    if (process.env.VISUAL_SELECTION_JSON === undefined || process.env.VISUAL_SELECTION_JSON.trim() === '') {
        return {};
    }

    return JSON.parse(process.env.VISUAL_SELECTION_JSON) as VisualSelection;
}

const selectedScenarios = (parseSelection().scenarios ?? []).map((scenario) => {
    if (scenario.slug === undefined || scenario.slug.trim() === '') {
        throw new Error('Every visual scenario needs a slug.');
    }
    if (scenario.label === undefined || scenario.label.trim() === '') {
        throw new Error(`Visual scenario "${scenario.slug}" needs a label.`);
    }
    if (!Object.hasOwn(viewportSizes, scenario.viewport)) {
        throw new Error(`Visual scenario "${scenario.slug}" has an unsupported viewport: ${scenario.viewport}`);
    }
    return scenario;
});

async function seedVisualData(page: Page): Promise<VisualData> {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);

    const toolsTagId = await createTag(page, { name: 'Tools' });
    const campingTagId = await createTag(page, { name: 'Camping' });
    const garageId = await createItem(page, {
        name: 'Garage',
        description: 'Workshop and storage area',
        isContainer: true,
    });
    const lampId = await createItem(page, {
        name: 'Workbench Lamp',
        description: 'Adjustable task light for the garage bench',
        containerId: garageId,
        tagIds: [toolsTagId],
        properties: {
            manufacturer: 'Anglepoise',
            model: 'Task 90',
        },
    });

    await createItem(page, {
        name: 'Trail Mug',
        description: 'Insulated mug for camping kits',
        tagIds: [campingTagId],
    });
    await createItem(page, {
        name: 'Storage Tote',
        description: 'Clear tote with snap lid',
        containerId: garageId,
        tagIds: [toolsTagId, campingTagId],
    });

    return { lampId, toolsTagId };
}

async function openRoute(page: Page, route: string): Promise<void> {
    await page.goto(route);
    await waitForMeteorReady(page);
}

async function renderCoreItems(page: Page): Promise<void> {
    await openRoute(page, '/items');
    await expect(page.getByRole('heading', { name: 'All Items', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open container Garage' })).toBeVisible();
}

async function renderCoreTags(page: Page): Promise<void> {
    await openRoute(page, '/tags');
    await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible();
    await expect(page.getByText('Tools', { exact: true })).toBeVisible();
}

async function renderCoreSearch(page: Page): Promise<void> {
    await openRoute(page, '/search');
    await expect(page.getByRole('heading', { name: 'Search', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search query' })).toBeVisible();
}

async function renderCoreData(page: Page, scenario: VisualScenario): Promise<void> {
    await openRoute(page, '/settings/data');

    if (scenario.viewport === 'mobile') {
        await expect(page.getByRole('heading', { name: 'Please use a computer', exact: true })).toBeVisible();
    } else {
        await expect(page.getByRole('heading', { name: 'Data Management', exact: true })).toBeVisible();
    }
}

async function renderItemsAddFilter(page: Page): Promise<void> {
    await openRoute(page, '/items');
    await page.getByRole('button', { name: 'Add Filters' }).click();

    await expect(page.getByText('Add Filter', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Has Tag' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open container Garage' })).toBeVisible();
}

async function renderItemDetail(page: Page, data: VisualData): Promise<void> {
    await openRoute(page, `/items/${data.lampId}`);

    await expect(page.getByRole('heading', { name: 'Workbench Lamp', exact: true })).toBeVisible();
    await expect(page.getByText('Adjustable task light for the garage bench')).toBeVisible();
    await expect(page.getByText('Tools', { exact: true })).toBeVisible();
}

async function renderCreateModal(page: Page): Promise<void> {
    await openRoute(page, '/items');
    await page.getByRole('button', { name: 'Create Item' }).click();

    await expect(page.getByRole('heading', { name: 'Create New Item', exact: true })).toBeVisible();
}

async function renderTagsDetail(page: Page, data: VisualData): Promise<void> {
    await openRoute(page, `/tags/${data.toolsTagId}`);

    await expect(page.getByRole('heading', { name: 'Items tagged with: Tools', exact: true })).toBeVisible();
    await expect(page.getByText('Workbench Lamp', { exact: true })).toBeVisible();
}

async function renderScenario(page: Page, scenario: VisualScenario, data: VisualData): Promise<void> {
    switch (scenario.slug) {
        case 'core-items-desktop':
        case 'core-items-mobile':
            await renderCoreItems(page);
            break;
        case 'core-tags-desktop':
        case 'core-tags-mobile':
        case 'tags-list':
            await renderCoreTags(page);
            break;
        case 'core-search-desktop':
        case 'core-search-mobile':
            await renderCoreSearch(page);
            break;
        case 'core-data-desktop':
        case 'core-data-mobile':
            await renderCoreData(page, scenario);
            break;
        case 'items-add-filter':
            await renderItemsAddFilter(page);
            break;
        case 'items-detail':
            await renderItemDetail(page, data);
            break;
        case 'items-create-modal':
            await renderCreateModal(page);
            break;
        case 'tags-detail':
            await renderTagsDetail(page, data);
            break;
        default:
            throw new Error(`No renderer registered for visual scenario: ${scenario.slug}`);
    }
}

const skipReason =
    visualOutputDir === undefined
        ? 'Set VISUAL_OUTPUT_DIR to capture visual PR evidence.'
        : selectedScenarios.length === 0
          ? 'Set VISUAL_SELECTION_JSON with at least one selected scenario.'
          : undefined;

if (skipReason !== undefined) {
    test('visual evidence scenarios are selected', () => {
        test.skip(true, skipReason);
    });
} else {
    const outputDir = visualOutputDir;
    if (outputDir === undefined) {
        throw new Error('VISUAL_OUTPUT_DIR must be set for visual evidence capture');
    }

    for (const scenario of selectedScenarios) {
        test(`captures ${scenario.label}`, async ({ page }) => {
            await page.setViewportSize(viewportSizes[scenario.viewport]);
            const data = await seedVisualData(page);

            await renderScenario(page, scenario, data);

            mkdirSync(outputDir, { recursive: true });
            await page.screenshot({
                path: join(outputDir, `${visualRefKind}-${scenario.slug}-${visualRefShort}.png`),
                fullPage: true,
            });
        });
    }
}
