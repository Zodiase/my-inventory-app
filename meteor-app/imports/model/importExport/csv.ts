/**
 * CSV reader/writer for inventory import/export.
 *
 * UMR (Under My Roof) is the reference target format: its canonical column set,
 * sentinels and field semantics are honoured byte-for-byte in `umrCompat` mode.
 * Extended mode adds non-UMR columns (createdAt, modifiedAt, tags) so a JSON-
 * level round-trip is also possible through CSV.
 *
 * Pure module: no Meteor, Mongo, or React imports. Uses `papaparse` for RFC-4180
 * parsing — handles BOM, quoted fields, embedded commas/newlines.
 *
 * Date convention for two-digit years: `M/D/YY` where `YY >= 50` is interpreted
 * as `19YY`, otherwise `20YY`. Documented at top of `parseDateString`.
 */

import Papa from 'papaparse';

import { SENTINELS, fromSentinel, toSentinel } from '/imports/model/importExport/sentinels';

export interface ExportRow {
    name: string;
    description?: string;
    category?: string;
    collection?: string;
    location?: string;
    make?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: Date;
    purchaseFrom?: string;
    purchasePrice?: number;
    marketValue?: number;
    warranty?: string;
    condition?: string;
    heir?: string;
    quantity?: number;
    tags?: string[];
    createdAt?: Date;
    modifiedAt?: Date;
}

export interface ParsedRow extends ExportRow {
    rowIndex: number;
    warnings: string[];
    rawColumns: Readonly<Record<string, string>>;
}

export interface StringifyOptions {
    umrCompat?: boolean;
}

export const UMR_COLUMNS: readonly string[] = Object.freeze([
    'Name',
    'Description',
    'Category',
    'Collection',
    'Location',
    'Make',
    'Model',
    'Serial Number',
    'Purchase Date',
    'Purchase From',
    'Purchase Price',
    'Market Value',
    'Warranty',
    'Condition',
    'Heir',
    'Quantity',
    'Tags',
]);

export const EXTENDED_COLUMNS: readonly string[] = Object.freeze([...UMR_COLUMNS, 'Created At', 'Modified At']);

const TWO_DIGIT_YEAR_PIVOT = 50;
const CENTS_PER_DOLLAR = 100;
const MAX_TWO_DIGIT_YEAR = 100;
const YEAR_1900 = 1900;
const YEAR_2000 = 2000;
const CURRENCY_DECIMALS = 2;
const ISO_DATE_LENGTH = 10;

function normalizeKey(raw: string): string {
    return raw
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase();
}

const COLUMN_ALIASES: Readonly<Record<string, keyof ExportRow>> = {
    name: 'name',
    description: 'description',
    notes: 'description',
    category: 'category',
    collection: 'collection',
    location: 'location',
    make: 'make',
    manufacturer: 'make',
    model: 'model',
    'serial number': 'serialNumber',
    serial: 'serialNumber',
    'purchase date': 'purchaseDate',
    'purchase from': 'purchaseFrom',
    'where bought': 'purchaseFrom',
    'purchase price': 'purchasePrice',
    'market value': 'marketValue',
    'replacement value': 'marketValue',
    warranty: 'warranty',
    condition: 'condition',
    heir: 'heir',
    quantity: 'quantity',
    tags: 'tags',
    'created at': 'createdAt',
    'modified at': 'modifiedAt',
};

export function parseCurrencyCents(raw: string | undefined | null): { value?: number; warning?: string } {
    const cleaned = fromSentinel(raw);
    if (cleaned === undefined) {
        return {};
    }
    const stripped = cleaned.replace(/[$,\s]/g, '');
    if (stripped === '') {
        return {};
    }
    const num = Number(stripped);
    if (!Number.isFinite(num)) {
        return { warning: `Could not parse currency value "${cleaned}"` };
    }
    return { value: Math.round(num * CENTS_PER_DOLLAR) };
}

export function formatCurrency(cents: number | undefined): string {
    if (cents === undefined) {
        return '';
    }
    const dollars = cents / CENTS_PER_DOLLAR;
    return `$${dollars.toFixed(CURRENCY_DECIMALS)}`;
}

export function parseDateString(raw: string | undefined | null): { value?: Date; warning?: string } {
    const cleaned = fromSentinel(raw);
    if (cleaned === undefined) {
        return {};
    }
    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(cleaned);
    if (slashMatch !== null) {
        const month = Number(slashMatch[1]);
        const day = Number(slashMatch[2]);
        let year = Number(slashMatch[3]);
        if (year < MAX_TWO_DIGIT_YEAR) {
            year = year >= TWO_DIGIT_YEAR_PIVOT ? YEAR_1900 + year : YEAR_2000 + year;
        }
        const d = new Date(Date.UTC(year, month - 1, day));
        if (!Number.isNaN(d.getTime())) {
            return { value: d };
        }
    }
    const iso = new Date(cleaned);
    if (!Number.isNaN(iso.getTime())) {
        return { value: iso };
    }
    return { warning: `Could not parse date "${cleaned}"` };
}

export function formatDate(d: Date | undefined): string {
    if (d === undefined) {
        return '';
    }
    return d.toISOString().slice(0, ISO_DATE_LENGTH);
}

export function parseTags(raw: string | undefined | null): string[] {
    const cleaned = fromSentinel(raw);
    if (cleaned === undefined) {
        return [];
    }
    return cleaned
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
}

export { COLUMN_ALIASES, normalizeKey, SENTINELS, toSentinel };

type RawRow = Record<string, string>;

function mapRawColumns(raw: Readonly<Record<string, string>>): Map<keyof ExportRow, string> {
    const out = new Map<keyof ExportRow, string>();
    for (const [rawKey, rawValue] of Object.entries(raw)) {
        const normalized = normalizeKey(rawKey);
        if (!Object.prototype.hasOwnProperty.call(COLUMN_ALIASES, normalized)) {
            continue;
        }
        const field = COLUMN_ALIASES[normalized];
        if (!out.has(field)) {
            out.set(field, rawValue);
        }
    }
    return out;
}

function buildParsedRow(raw: Readonly<Record<string, string>>, rowIndex: number): ParsedRow {
    const fields = mapRawColumns(raw);
    const warnings: string[] = [];

    const stringField = (key: keyof ExportRow): string | undefined => fromSentinel(fields.get(key));

    const currency = (key: keyof ExportRow): number | undefined => {
        const { value, warning } = parseCurrencyCents(fields.get(key));
        if (warning !== undefined) {
            warnings.push(warning);
        }
        return value;
    };

    const date = (key: keyof ExportRow): Date | undefined => {
        const { value, warning } = parseDateString(fields.get(key));
        if (warning !== undefined) {
            warnings.push(warning);
        }
        return value;
    };

    const quantityRaw = fromSentinel(fields.get('quantity'));
    let quantity: number | undefined = undefined;
    if (quantityRaw !== undefined) {
        const n = Number(quantityRaw);
        if (Number.isFinite(n)) {
            quantity = n;
        } else {
            warnings.push(`Could not parse quantity "${quantityRaw}"`);
        }
    }

    const row: ParsedRow = {
        rowIndex,
        warnings,
        rawColumns: raw,
        name: stringField('name') ?? '',
        description: stringField('description'),
        category: stringField('category'),
        collection: stringField('collection'),
        location: stringField('location'),
        make: stringField('make'),
        model: stringField('model'),
        serialNumber: stringField('serialNumber'),
        purchaseDate: date('purchaseDate'),
        purchaseFrom: stringField('purchaseFrom'),
        purchasePrice: currency('purchasePrice'),
        marketValue: currency('marketValue'),
        warranty: stringField('warranty'),
        condition: stringField('condition'),
        heir: stringField('heir'),
        quantity,
        tags: parseTags(fields.get('tags')),
        createdAt: date('createdAt'),
        modifiedAt: date('modifiedAt'),
    };
    return row;
}

export function parseCsv(text: string): ParsedRow[] {
    if (text.trim() === '') {
        return [];
    }
    const result = Papa.parse<RawRow>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h: string) => h.replace(/^\uFEFF/, '').trim(),
    });
    return result.data.map((raw, idx) => buildParsedRow(raw, idx));
}

function stringifyRowUmr(row: ExportRow): Record<string, string> {
    return {
        Name: row.name,
        Description: row.description ?? '',
        Category: toSentinel(row.category, 'category'),
        Collection: toSentinel(row.collection, 'collection'),
        Location: toSentinel(row.location, 'location'),
        Make: row.make ?? '',
        Model: row.model ?? '',
        'Serial Number': row.serialNumber ?? '',
        'Purchase Date': formatDate(row.purchaseDate),
        'Purchase From': row.purchaseFrom ?? '',
        'Purchase Price': formatCurrency(row.purchasePrice),
        'Market Value': formatCurrency(row.marketValue),
        Warranty: row.warranty ?? '',
        Condition: row.condition ?? '',
        Heir: row.heir ?? '',
        Quantity: row.quantity === undefined ? '' : String(row.quantity),
        Tags: row.tags === undefined ? '' : row.tags.join(', '),
    };
}

function stringifyRowExtended(row: ExportRow): Record<string, string> {
    return {
        ...stringifyRowUmr(row),
        Category: row.category ?? '',
        Collection: row.collection ?? '',
        Location: row.location ?? '',
        'Created At': row.createdAt === undefined ? '' : row.createdAt.toISOString(),
        'Modified At': row.modifiedAt === undefined ? '' : row.modifiedAt.toISOString(),
    };
}

export function stringifyCsv(rows: readonly ExportRow[], opts: StringifyOptions = {}): string {
    const umrCompat = opts.umrCompat === true;
    const columns = umrCompat ? UMR_COLUMNS : EXTENDED_COLUMNS;
    const data = rows.map((r) => (umrCompat ? stringifyRowUmr(r) : stringifyRowExtended(r)));
    return Papa.unparse({ fields: [...columns], data }, { newline: '\n', quotes: false });
}
