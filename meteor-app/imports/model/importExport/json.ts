/**
 * Native JSON import/export format.
 *
 * Pure functions only. No Meteor imports. Suitable for use in both client and
 * server code, as well as in tests.
 *
 * Round-trip guarantee: for any state passed through `serializeJson`, calling
 * `parseJson` and then `serializeJson` again produces byte-for-byte identical
 * output. In particular `createdAt` and `modifiedAt` survive the round trip
 * with the same `.getTime()` value, so re-importing an unchanged JSON export
 * is a true no-op against the dedup comparator.
 */
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { PropertyValues } from '/imports/model/PropertyValues';
import type { TagRecord } from '/imports/model/TagRecord';

export const JSON_EXPORT_VERSION = 1 as const;

export interface InventoryState {
    items: InventoryItem[];
    tags: TagRecord[];
}

export interface ParsedState {
    version: typeof JSON_EXPORT_VERSION;
    exportedAt: Date;
    items: InventoryItem[];
    tags: TagRecord[];
}

export interface SerializeOptions {
    /** Defaults to `new Date()` when omitted. */
    exportedAt?: Date;
}

export class JsonImportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JsonImportError';
    }
}

/** Fields on `PropertyValues` whose values should be serialized as ISO date strings. */
const PROPERTY_DATE_FIELDS: ReadonlyArray<keyof PropertyValues> = ['purchaseDate'];

export const serializeJson = (state: InventoryState, options: SerializeOptions = {}): string => {
    const envelope = {
        version: JSON_EXPORT_VERSION,
        exportedAt: options.exportedAt ?? new Date(),
        items: state.items,
        tags: state.tags,
    };
    return JSON.stringify(envelope);
};

export const parseJson = (text: string): ParsedState => {
    const parsed = safeJsonParse(text);
    return validateEnvelope(parsed);
};

const safeJsonParse = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new JsonImportError(`Malformed JSON: ${detail}`);
    }
};

const validateEnvelope = (raw: unknown): ParsedState => {
    if (!isPlainObject(raw)) {
        throw new JsonImportError('Top-level JSON value must be an object');
    }
    if (!('version' in raw)) {
        throw new JsonImportError('Missing required key: version');
    }
    if (raw.version !== JSON_EXPORT_VERSION) {
        throw new JsonImportError(
            `Unsupported version: ${JSON.stringify(raw.version)} (expected ${String(JSON_EXPORT_VERSION)})`
        );
    }
    if (!('exportedAt' in raw) || typeof raw.exportedAt !== 'string') {
        throw new JsonImportError('Missing or invalid required key: exportedAt (must be ISO-8601 string)');
    }
    if (!('items' in raw) || !Array.isArray(raw.items)) {
        throw new JsonImportError('Missing or invalid required key: items (must be array)');
    }
    if (!('tags' in raw) || !Array.isArray(raw.tags)) {
        throw new JsonImportError('Missing or invalid required key: tags (must be array)');
    }
    const exportedAt = parseIsoDate(raw.exportedAt, 'exportedAt');
    const items = raw.items.map((item, index) => parseItem(item, index));
    const tags = raw.tags.map((tag, index) => parseTag(tag, index));
    return {
        ...raw,
        version: JSON_EXPORT_VERSION,
        exportedAt,
        items,
        tags,
    };
};

const parseItem = (raw: unknown, index: number): InventoryItem => {
    const where = `items[${String(index)}]`;
    if (!isPlainObject(raw)) {
        throw new JsonImportError(`${where}: must be an object`);
    }
    const createdAt = requireIsoDateString(raw, 'createdAt', where);
    const modifiedAt = requireIsoDateString(raw, 'modifiedAt', where);
    requireString(raw, '_id', where);
    requireString(raw, 'name', where);
    requireBoolean(raw, 'isContainer', where);
    requireStringArray(raw, 'tagIds', where);

    const result: Record<string, unknown> = {
        ...raw,
        createdAt: parseIsoDate(createdAt, `${where}.createdAt`),
        modifiedAt: parseIsoDate(modifiedAt, `${where}.modifiedAt`),
    };
    if (raw.properties !== undefined && raw.properties !== null) {
        if (!isPlainObject(raw.properties)) {
            throw new JsonImportError(`${where}.properties: must be an object`);
        }
        result.properties = parseProperties(raw.properties, where);
    }
    return result as unknown as InventoryItem;
};

const parseTag = (raw: unknown, index: number): TagRecord => {
    const where = `tags[${String(index)}]`;
    if (!isPlainObject(raw)) {
        throw new JsonImportError(`${where}: must be an object`);
    }
    const createdAt = requireIsoDateString(raw, 'createdAt', where);
    const modifiedAt = requireIsoDateString(raw, 'modifiedAt', where);
    requireString(raw, '_id', where);
    requireString(raw, 'name', where);
    requireString(raw, 'parentTagId', where);
    if (!('path' in raw) || !Array.isArray(raw.path)) {
        throw new JsonImportError(`${where}.path: must be an array`);
    }
    raw.path.forEach((entry, entryIndex) => {
        const entryWhere = `${where}.path[${String(entryIndex)}]`;
        if (!isPlainObject(entry)) {
            throw new JsonImportError(`${entryWhere}: must be an object`);
        }
        requireString(entry, '_id', entryWhere);
        requireString(entry, 'name', entryWhere);
    });
    return {
        ...raw,
        createdAt: parseIsoDate(createdAt, `${where}.createdAt`),
        modifiedAt: parseIsoDate(modifiedAt, `${where}.modifiedAt`),
    } as unknown as TagRecord;
};

const parseProperties = (raw: Record<string, unknown>, where: string): PropertyValues => {
    const result: Record<string, unknown> = { ...raw };
    for (const field of PROPERTY_DATE_FIELDS) {
        const value = raw[field];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string') {
            throw new JsonImportError(`${where}.properties.${field}: must be an ISO-8601 string`);
        }
        result[field] = parseIsoDate(value, `${where}.properties.${field}`);
    }
    return result;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const requireString = (obj: Record<string, unknown>, key: string, where: string): void => {
    if (!(key in obj) || typeof obj[key] !== 'string') {
        throw new JsonImportError(`${where}.${key}: must be a string`);
    }
};

const requireBoolean = (obj: Record<string, unknown>, key: string, where: string): void => {
    if (!(key in obj) || typeof obj[key] !== 'boolean') {
        throw new JsonImportError(`${where}.${key}: must be a boolean`);
    }
};

const requireStringArray = (obj: Record<string, unknown>, key: string, where: string): void => {
    const value = obj[key];
    if (!Array.isArray(value)) {
        throw new JsonImportError(`${where}.${key}: must be an array`);
    }
    value.forEach((entry, entryIndex) => {
        if (typeof entry !== 'string') {
            throw new JsonImportError(`${where}.${key}[${String(entryIndex)}]: must be a string`);
        }
    });
};

const requireIsoDateString = (obj: Record<string, unknown>, key: string, where: string): string => {
    const value = obj[key];
    if (typeof value !== 'string') {
        throw new JsonImportError(`${where}.${key}: must be an ISO-8601 string`);
    }
    return value;
};

const parseIsoDate = (iso: string, where: string): Date => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        throw new JsonImportError(`${where}: invalid ISO-8601 date "${iso}"`);
    }
    return parsed;
};
