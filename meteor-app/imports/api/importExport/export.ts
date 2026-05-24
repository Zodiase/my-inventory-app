import { Meteor } from 'meteor/meteor';

import { DEFAULT_CONTAINER_PATH_SEPARATOR } from '/imports/api/importExport/pathResolvers';
import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { stringifyCsv, type ExportRow } from '/imports/model/importExport/csv';
import { serializeJson } from '/imports/model/importExport/json';

const buildCsvRows = async (): Promise<ExportRow[]> => {
    const items = await InventoryItemsCollection.find({}).fetchAsync();
    const tags = await TagsCollection.find({}).fetchAsync();

    const containerMap = new Map(items.filter((i) => i.isContainer).map((i) => [i._id, i]));
    const tagMap = new Map(tags.map((t) => [t._id, t]));

    const categoryRoot = tags.find((t) => t.parentTagId === '' && t.name === 'Category');
    const collectionRoot = tags.find((t) => t.parentTagId === '' && t.name === 'Collection');

    const getPath = (containerId: string | undefined): string | undefined => {
        if (typeof containerId === 'undefined') return undefined;
        const parts: string[] = [];
        let curr: string | undefined = containerId;
        while (typeof curr !== 'undefined') {
            const container = containerMap.get(curr);
            if (typeof container === 'undefined') break;
            parts.unshift(container.name);
            curr = container.containerId;
        }
        return parts.length > 0 ? parts.join(` ${DEFAULT_CONTAINER_PATH_SEPARATOR} `) : undefined;
    };

    return items.map((item) => {
        let category: string | undefined = undefined;
        let collection: string | undefined = undefined;
        const plainTags: string[] = [];

        for (const tagId of item.tagIds) {
            const tag = tagMap.get(tagId);
            if (typeof tag === 'undefined') continue;

            if (
                typeof categoryRoot !== 'undefined' &&
                (tag._id === categoryRoot._id || tag.parentTagId === categoryRoot._id)
            ) {
                if (tag.parentTagId === categoryRoot._id && typeof category === 'undefined') {
                    category = tag.name;
                }
            } else if (
                typeof collectionRoot !== 'undefined' &&
                (tag._id === collectionRoot._id || tag.parentTagId === collectionRoot._id)
            ) {
                if (tag.parentTagId === collectionRoot._id && typeof collection === 'undefined') {
                    collection = tag.name;
                }
            } else {
                plainTags.push(tag.name);
            }
        }

        const props = item.properties ?? {};

        return {
            name: item.name,
            description: item.description,
            category,
            collection,
            location: getPath(item.containerId),
            make: props.make,
            model: props.model,
            serialNumber: props.serialNumber,
            purchaseDate: props.purchaseDate,
            purchaseFrom: props.purchaseFrom,
            purchasePrice: props.purchasePrice,
            marketValue: props.marketValue,
            warranty: props.warranty,
            condition: props.condition,
            heir: undefined,
            quantity: undefined,
            tags: plainTags.length > 0 ? plainTags : undefined,
            createdAt: item.createdAt,
            modifiedAt: item.modifiedAt,
        };
    });
};

export const exportJson = async (): Promise<string> => {
    const items = await InventoryItemsCollection.find({}).fetchAsync();
    const tags = await TagsCollection.find({}).fetchAsync();
    return serializeJson({ items, tags });
};

export const exportCsv = async (opts?: { umrCompat?: boolean }): Promise<string> => {
    const rows = await buildCsvRows();
    return stringifyCsv(rows, opts);
};

if (Meteor.isServer) {
    Meteor.methods({
        'inventory.export.json': exportJson,
        'inventory.export.csv': exportCsv,
    });
}
