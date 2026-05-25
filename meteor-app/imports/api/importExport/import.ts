import { Meteor } from 'meteor/meteor';

import { createResolverSession, DEFAULT_CONTAINER_PATH_SEPARATOR } from '/imports/api/importExport/pathResolvers';
import { InventoryItemsCollection, updateInventoryItem } from '/imports/api/items';
import { parseCsv } from '/imports/model/importExport/csv';
import { classify } from '/imports/model/importExport/dedup';
import type { NormalizedRow } from '/imports/model/importExport/dedup';
import { parseJson } from '/imports/model/importExport/json';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import type NoId from '/imports/utility/NoId';

export interface ImportReport {
    toCreate: number;
    exactDuplicates: number;
    supersetMerges: number;
    warnings: string[];
    errors: string[];
    info: string[];
    samplePreview: Array<{ action: string; name: string; info?: string }>;
}

export function buildJsonContainerPath(itemId: string, itemsById: Map<string, InventoryItem>): string | undefined {
    const current = itemsById.get(itemId);
    if (current?.containerId == null || current.containerId === '') return undefined;

    const parts: string[] = [];
    let parentId: string | undefined = current.containerId;
    while (parentId != null && parentId !== '') {
        const parent = itemsById.get(parentId);
        if (parent == null) break;
        parts.unshift(parent.name);
        parentId = parent.containerId;
    }
    if (parts.length === 0) return undefined;
    return parts.join(DEFAULT_CONTAINER_PATH_SEPARATOR);
}

export function generateLikelyRelatedGroups(rows: NormalizedRow[]): string[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
        if (
            row.isContainer !== true &&
            row.properties?.make != null &&
            row.properties.make !== '' &&
            row.properties.model != null &&
            row.properties.model !== ''
        ) {
            const key = `${row.properties.make} ${row.properties.model}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    const MAX_INFO_GROUPS = 10;
    const sorted = Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_INFO_GROUPS);

    return sorted.map(([key, count]) => `${count}× ${key}`);
}

interface ProcessRowContext {
    dryRun: boolean;
    report: ImportReport;
    rowIndex: number;
    baseNow: number;
    virtualItems: InventoryItem[];
    createdItemIds: string[];
}

async function processRow(candidate: NormalizedRow, ctx: ProcessRowContext): Promise<void> {
    const { dryRun, report, rowIndex, baseNow, virtualItems, createdItemIds } = ctx;
    const dbMatches = await InventoryItemsCollection.find({ name: candidate.name }).fetchAsync();
    const virtualMatches = virtualItems.filter((v) => v.name === candidate.name);
    const existingMatches = [...dbMatches, ...virtualMatches];

    const result = classify(candidate, existingMatches);

    const MAX_SAMPLE_PREVIEW = 20;

    if (result.action === 'exact-duplicate') {
        report.exactDuplicates++;
        if (report.samplePreview.length < MAX_SAMPLE_PREVIEW) {
            report.samplePreview.push({ action: 'skip', name: candidate.name, info: 'Exact duplicate' });
        }
    } else if (result.action === 'superset-merge') {
        report.supersetMerges++;
        if (!dryRun && result.target != null && result.mergeFields != null) {
            await updateInventoryItem(result.target._id, result.mergeFields);
        }
        if (report.samplePreview.length < MAX_SAMPLE_PREVIEW) {
            report.samplePreview.push({ action: 'merge', name: candidate.name, info: 'Merged missing fields' });
        }
    } else {
        report.toCreate++;
        const createdAt = candidate.createdAt ?? new Date(baseNow + rowIndex);
        const modifiedAt = candidate.modifiedAt ?? createdAt;

        const newItem: NoId<InventoryItem> = {
            name: candidate.name,
            description: candidate.description,
            containerId: candidate.containerId,
            isContainer: candidate.isContainer ?? false,
            tagIds: candidate.tagIds ?? [],
            properties: candidate.properties,
            createdAt,
            modifiedAt,
        };

        if (!dryRun) {
            const id = await InventoryItemsCollection.insertAsync(newItem);
            createdItemIds.push(id);
        } else {
            const virtualItem: InventoryItem = {
                _id: `virtual-item-${report.toCreate}`,
                ...newItem,
            };
            virtualItems.push(virtualItem);
        }
        if (report.samplePreview.length < MAX_SAMPLE_PREVIEW) {
            report.samplePreview.push({ action: 'create', name: candidate.name });
        }
    }
}

export async function importJson(payload: string, opts: { dryRun: boolean }): Promise<ImportReport> {
    const report: ImportReport = {
        toCreate: 0,
        exactDuplicates: 0,
        supersetMerges: 0,
        warnings: [],
        errors: [],
        info: [],
        samplePreview: [],
    };
    const createdItemIds: string[] = [];
    const virtualItems: InventoryItem[] = [];
    try {
        const parsed = parseJson(payload);

        const tagsById = new Map<string, TagRecord>();
        for (const t of parsed.tags) tagsById.set(t._id, t);
        const itemsById = new Map<string, InventoryItem>();
        for (const i of parsed.items) itemsById.set(i._id, i);

        const resolverSession = createResolverSession({ dryRun: opts.dryRun });
        const baseNow = Date.now();

        const candidates: NormalizedRow[] = [];

        for (let i = 0; i < parsed.items.length; i++) {
            const item = parsed.items[i];
            try {
                const tagNames: string[] = [];
                for (const tagId of item.tagIds) {
                    const tag = tagsById.get(tagId);
                    if (tag != null) tagNames.push(tag.name);
                }
                const tagIds = await resolverSession.resolveTagList(tagNames, { autoCreate: true });

                let containerId: string | undefined = undefined;
                if (item.containerId != null && item.containerId !== '') {
                    const containerPath = buildJsonContainerPath(item._id, itemsById);
                    if (containerPath != null && containerPath !== '') {
                        containerId = await resolverSession.resolveContainerPath(containerPath, { autoCreate: true });
                    }
                }

                const candidate: NormalizedRow = {
                    createdAt: item.createdAt,
                    modifiedAt: item.modifiedAt,
                    name: item.name,
                    description: item.description,
                    containerId,
                    isContainer: item.isContainer,
                    tagIds,
                    properties: item.properties,
                };
                candidates.push(candidate);

                await processRow(candidate, {
                    dryRun: opts.dryRun,
                    report,
                    rowIndex: i,
                    baseNow,
                    virtualItems,
                    createdItemIds,
                });
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const name = item.name;
                report.errors.push(`Row ${i} '${name}': ${errorMessage}`);
            }
        }

        report.info = generateLikelyRelatedGroups(candidates);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        report.errors.push(`Import failed: ${errorMessage}`);
    }

    return report;
}

export async function importCsv(
    payload: string,
    opts: { dryRun: boolean; umrCompat?: boolean }
): Promise<ImportReport> {
    const report: ImportReport = {
        toCreate: 0,
        exactDuplicates: 0,
        supersetMerges: 0,
        warnings: [],
        errors: [],
        info: [],
        samplePreview: [],
    };
    const createdItemIds: string[] = [];
    const virtualItems: InventoryItem[] = [];

    try {
        const rows = parseCsv(payload);
        const resolverSession = createResolverSession({ dryRun: opts.dryRun });
        const baseNow = Date.now();
        const candidates: NormalizedRow[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const tagIds: string[] = [];
                if (row.category != null && row.category !== '') {
                    tagIds.push(
                        await resolverSession.resolveTagByName(row.category, {
                            groupName: 'Category',
                            autoCreate: true,
                        })
                    );
                }
                if (row.collection != null && row.collection !== '') {
                    tagIds.push(
                        await resolverSession.resolveTagByName(row.collection, {
                            groupName: 'Collection',
                            autoCreate: true,
                        })
                    );
                }
                if (row.tags != null && row.tags.length > 0) {
                    const resolvedIds = await resolverSession.resolveTagList(row.tags, { autoCreate: true });
                    tagIds.push(...resolvedIds);
                }

                let containerId: string | undefined = undefined;
                if (row.location != null && row.location !== '') {
                    containerId = await resolverSession.resolveContainerPath(row.location, { autoCreate: true });
                }

                const properties: Record<string, unknown> = {};
                if (row.make != null && row.make !== '') properties.make = row.make;
                if (row.model != null && row.model !== '') properties.model = row.model;
                if (row.serialNumber != null && row.serialNumber !== '') properties.serialNumber = row.serialNumber;
                if (row.purchaseDate != null) properties.purchaseDate = row.purchaseDate;
                if (row.purchasePrice !== undefined) properties.purchasePrice = row.purchasePrice;
                if (row.marketValue !== undefined) properties.marketValue = row.marketValue;
                if (row.purchaseFrom != null && row.purchaseFrom !== '') properties.purchaseFrom = row.purchaseFrom;
                if (row.warranty != null && row.warranty !== '') properties.warranty = row.warranty;
                if (row.condition != null && row.condition !== '') properties.condition = row.condition;

                if (row.heir != null && row.heir !== '')
                    report.warnings.push(`Row ${row.rowIndex} '${row.name}': dropped Heir=${row.heir}`);
                if (row.quantity !== undefined && row.quantity !== 1)
                    report.warnings.push(`Row ${row.rowIndex} '${row.name}': dropped Quantity=${row.quantity}`);
                if (row.warnings.length > 0) {
                    report.warnings.push(...row.warnings.map((w) => `Row ${row.rowIndex}: ${w}`));
                }

                const candidate: NormalizedRow = {
                    createdAt: row.createdAt,
                    modifiedAt: row.modifiedAt,
                    name: row.name,
                    description: row.description,
                    containerId,
                    isContainer: false,
                    tagIds,
                    properties: Object.keys(properties).length > 0 ? properties : undefined,
                };
                candidates.push(candidate);

                await processRow(candidate, {
                    dryRun: opts.dryRun,
                    report,
                    rowIndex: i,
                    baseNow,
                    virtualItems,
                    createdItemIds,
                });
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const name = row.name;
                report.errors.push(`Row ${row.rowIndex} '${name}': ${errorMessage}`);
            }
        }

        report.info = generateLikelyRelatedGroups(candidates);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        report.errors.push(`Import failed: ${errorMessage}`);
    }

    return report;
}

if (Meteor.isServer) {
    Meteor.methods({
        'inventory.import.json': importJson,
        'inventory.import.csv': importCsv,
    });
}
