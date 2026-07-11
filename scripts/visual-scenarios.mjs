/**
 * Defines PR visual evidence scenarios and maps changed files to the smallest useful scenario set.
 * The workflow uses this manifest so screenshot coverage is path-aware without hiding broad UI regressions.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SCENARIO_GROUPS = [
    {
        id: 'core-smoke',
        label: 'Core route smoke',
        description: 'Desktop and mobile screenshots for the primary app routes.',
    },
    {
        id: 'items',
        label: 'Items workflows',
        description: 'Focused Items view states, including filters, detail, and creation.',
    },
    {
        id: 'tags',
        label: 'Tags workflows',
        description: 'Focused Tags list and tag detail states.',
    },
];

export const SCENARIOS = [
    {
        slug: 'core-items-desktop',
        label: 'Items route - desktop',
        groupId: 'core-smoke',
        viewport: 'desktop',
    },
    {
        slug: 'core-items-mobile',
        label: 'Items route - mobile',
        groupId: 'core-smoke',
        viewport: 'mobile',
    },
    {
        slug: 'core-tags-desktop',
        label: 'Tags route - desktop',
        groupId: 'core-smoke',
        viewport: 'desktop',
    },
    {
        slug: 'core-tags-mobile',
        label: 'Tags route - mobile',
        groupId: 'core-smoke',
        viewport: 'mobile',
    },
    {
        slug: 'core-search-desktop',
        label: 'Search route - desktop',
        groupId: 'core-smoke',
        viewport: 'desktop',
    },
    {
        slug: 'core-search-mobile',
        label: 'Search route - mobile',
        groupId: 'core-smoke',
        viewport: 'mobile',
    },
    {
        slug: 'core-data-desktop',
        label: 'Data route - desktop',
        groupId: 'core-smoke',
        viewport: 'desktop',
    },
    {
        slug: 'core-data-mobile',
        label: 'Data route - mobile',
        groupId: 'core-smoke',
        viewport: 'mobile',
    },
    {
        slug: 'items-add-filter',
        label: 'Items Add Filters panel',
        groupId: 'items',
        viewport: 'wide',
    },
    {
        slug: 'items-detail',
        label: 'Item detail',
        groupId: 'items',
        viewport: 'desktop',
    },
    {
        slug: 'items-create-modal',
        label: 'Create item modal',
        groupId: 'items',
        viewport: 'desktop',
    },
    {
        slug: 'tags-list',
        label: 'Tags list',
        groupId: 'tags',
        viewport: 'desktop',
    },
    {
        slug: 'tags-detail',
        label: 'Tag detail',
        groupId: 'tags',
        viewport: 'desktop',
    },
];

const GROUP_IDS = SCENARIO_GROUPS.map(({ id }) => id);
const GROUPS_BY_ID = new Map(SCENARIO_GROUPS.map((group) => [group.id, group]));

const exact = (value) => ({ type: 'exact', value });
const prefix = (value) => ({ type: 'prefix', value });

const GLOBAL_RULES = [
    {
        description: 'visual evidence infrastructure changed',
        groupIds: GROUP_IDS,
        matchers: [
            exact('.github/workflows/pr-visual-evidence.yml'),
            exact('scripts/visual-diff-report.mjs'),
            exact('scripts/visual-diff-report.test.mjs'),
            exact('scripts/visual-scenarios.mjs'),
            exact('scripts/visual-scenarios.test.mjs'),
            prefix('tests/e2e/app/visual-artifacts/'),
            prefix('tests/e2e/helpers/'),
            exact('playwright.config.js'),
        ],
    },
    {
        description: 'dependency or package configuration changed',
        groupIds: GROUP_IDS,
        matchers: [
            exact('package.json'),
            exact('package-lock.json'),
            exact('meteor-app/package.json'),
            exact('meteor-app/package-lock.json'),
        ],
    },
    {
        description: 'shared shell, theme, client entrypoint, or utility changed',
        groupIds: GROUP_IDS,
        matchers: [
            prefix('meteor-app/client/'),
            exact('meteor-app/imports/ui/App.tsx'),
            exact('meteor-app/imports/ui/AppShell.tsx'),
            exact('meteor-app/imports/ui/DesktopOnly.tsx'),
            exact('meteor-app/imports/ui/StyledButton.tsx'),
            exact('meteor-app/imports/ui/TouchButton.tsx'),
            exact('meteor-app/imports/ui/theme.ts'),
            prefix('meteor-app/imports/ui/common/'),
            prefix('meteor-app/imports/utility/'),
        ],
    },
    {
        description: 'shared model or import/export data surface changed',
        groupIds: GROUP_IDS,
        matchers: [prefix('meteor-app/imports/model/'), prefix('meteor-app/imports/api/importExport/')],
    },
];

const GROUP_RULES = [
    {
        description: 'UI, API, or model code changed',
        groupIds: ['core-smoke'],
        matchers: [
            prefix('meteor-app/imports/ui/'),
            prefix('meteor-app/imports/api/'),
            prefix('meteor-app/imports/model/'),
        ],
    },
    {
        description: 'Items view, filters, item form, or item API changed',
        groupIds: ['items'],
        matchers: [
            prefix('meteor-app/imports/ui/AllItemsView/'),
            exact('meteor-app/imports/ui/AllItemsView.stories.tsx'),
            exact('meteor-app/imports/ui/ContainerSelector.tsx'),
            exact('meteor-app/imports/ui/ContainerSelector.stories.tsx'),
            exact('meteor-app/imports/ui/FilterBar.tsx'),
            exact('meteor-app/imports/ui/FilterBar.stories.tsx'),
            exact('meteor-app/imports/ui/ItemDetailView.tsx'),
            exact('meteor-app/imports/ui/ItemDetailView.stories.tsx'),
            exact('meteor-app/imports/ui/ItemDetailViewPresentation.tsx'),
            exact('meteor-app/imports/ui/ItemForm.tsx'),
            exact('meteor-app/imports/ui/ItemForm.stories.tsx'),
            exact('meteor-app/imports/ui/SearchFragmentBuilder.tsx'),
            exact('meteor-app/imports/ui/SearchFragmentBuilder.stories.tsx'),
            exact('meteor-app/imports/ui/TagSelector.tsx'),
            exact('meteor-app/imports/ui/TagSelector.stories.tsx'),
            exact('meteor-app/imports/api/items.ts'),
            exact('tests/e2e/app/item-creation.spec.ts'),
            exact('tests/e2e/app/item-creation-refactored.spec.ts'),
            exact('tests/e2e/app/item-detail-routing.spec.ts'),
            exact('tests/e2e/app/item-maintenance.spec.ts'),
            exact('tests/e2e/app/items-and-tags.spec.ts'),
            exact('tests/e2e/app/search-and-filter.spec.ts'),
        ],
    },
    {
        description: 'Tags view, tag selection, tag detail, or tag API changed',
        groupIds: ['tags'],
        matchers: [
            prefix('meteor-app/imports/ui/AllTagsView/'),
            exact('meteor-app/imports/ui/AllTagsView.stories.tsx'),
            prefix('meteor-app/imports/ui/ItemsByTagView/'),
            exact('meteor-app/imports/ui/ItemsByTagView.stories.tsx'),
            exact('meteor-app/imports/ui/CreateTagDialog.tsx'),
            exact('meteor-app/imports/ui/CreateTagDialog.stories.tsx'),
            exact('meteor-app/imports/ui/TagChip.tsx'),
            exact('meteor-app/imports/ui/TagChip.stories.tsx'),
            exact('meteor-app/imports/ui/TagSelector.tsx'),
            exact('meteor-app/imports/ui/TagSelector.stories.tsx'),
            exact('meteor-app/imports/api/tags.ts'),
            exact('tests/e2e/app/tag-management.spec.ts'),
            exact('tests/e2e/app/items-and-tags.spec.ts'),
        ],
    },
];

export function normalizeChangedFiles(changedFiles) {
    return [...new Set(changedFiles.map((file) => file.trim()).filter((file) => file.length > 0))].sort();
}

function matchesFile(file, matcher) {
    if (matcher.type === 'exact') return file === matcher.value;
    if (matcher.type === 'prefix') return file.startsWith(matcher.value);
    throw new Error(`Unknown matcher type: ${matcher.type}`);
}

function collectReasons(changedFiles, rules) {
    return rules.flatMap((rule) => {
        const files = changedFiles.filter((file) => rule.matchers.some((matcher) => matchesFile(file, matcher)));

        if (files.length === 0) return [];

        return [
            {
                description: rule.description,
                groupIds: rule.groupIds,
                files,
            },
        ];
    });
}

function toScenarioPayload(scenario) {
    const group = GROUPS_BY_ID.get(scenario.groupId);

    return {
        ...scenario,
        groupLabel: group?.label ?? scenario.groupId,
    };
}

function buildGroups(groupIds, reasons) {
    return SCENARIO_GROUPS.filter(({ id }) => groupIds.has(id)).map((group) => {
        const groupReasons = reasons.filter((reason) => reason.groupIds.includes(group.id));

        return {
            ...group,
            reason: groupReasons.map(({ description }) => description).join('; '),
            matchedFiles: normalizeChangedFiles(groupReasons.flatMap(({ files }) => files)),
        };
    });
}

export function selectVisualScenarios(changedFilesInput) {
    const changedFiles = normalizeChangedFiles(changedFilesInput);
    const globalReasons = collectReasons(changedFiles, GLOBAL_RULES);

    if (globalReasons.length > 0) {
        const groupIds = new Set(GROUP_IDS);

        return {
            version: 1,
            mode: 'global',
            changedFiles,
            reasons: globalReasons,
            groups: buildGroups(groupIds, globalReasons),
            scenarios: SCENARIOS.filter((scenario) => groupIds.has(scenario.groupId)).map(toScenarioPayload),
        };
    }

    const selectedReasons = collectReasons(changedFiles, GROUP_RULES);
    const groupIds = new Set(selectedReasons.flatMap(({ groupIds: selectedGroupIds }) => selectedGroupIds));

    return {
        version: 1,
        mode: groupIds.size > 0 ? 'selected' : 'none',
        changedFiles,
        reasons: selectedReasons,
        groups: buildGroups(groupIds, selectedReasons),
        scenarios: SCENARIOS.filter((scenario) => groupIds.has(scenario.groupId)).map(toScenarioPayload),
    };
}

function readChangedFiles(path) {
    return readFileSync(path, 'utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
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

function writeGitHubOutputs(path, selection) {
    appendFileSync(
        path,
        [
            `has-scenarios=${selection.scenarios.length > 0 ? 'true' : 'false'}`,
            `scenario-count=${selection.scenarios.length}`,
            `scenario-slugs=${selection.scenarios.map(({ slug }) => slug).join(',')}`,
            `selection-json=${JSON.stringify(selection)}`,
            '',
        ].join('\n')
    );
}

function runCli() {
    const [command, ...args] = process.argv.slice(2);

    if (command !== 'select') {
        throw new Error(
            'Usage: node scripts/visual-scenarios.mjs select --changed-files <path> [--github-output <path>]'
        );
    }

    const changedFilesPath = readOption(args, '--changed-files');
    if (changedFilesPath === undefined) {
        throw new Error('Missing required --changed-files option');
    }

    const selection = selectVisualScenarios(readChangedFiles(changedFilesPath));
    const githubOutputPath = readOption(args, '--github-output');

    if (githubOutputPath !== undefined) {
        writeGitHubOutputs(githubOutputPath, selection);
    }

    console.log(JSON.stringify(selection, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runCli();
}
