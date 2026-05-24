import assert from 'assert';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';

import {
    JSON_EXPORT_VERSION,
    JsonImportError,
    parseJson,
    serializeJson,
    type InventoryState,
    type ParsedState,
} from './json';

const FIXED_EXPORTED_AT = new Date('2026-01-15T10:30:00.000Z');

/**
 * Builds a deterministic 20-tag hierarchy:
 * - 4 root tags (parentTagId='')
 * - 16 child tags spread evenly under the roots
 * `path` includes ancestors plus the tag itself.
 */
const buildTags = (): TagRecord[] => {
    const roots: TagRecord[] = [];
    for (let i = 0; i < 4; i++) {
        const id = `tag-root-${String(i)}`;
        const name = `Root ${String(i)}`;
        roots.push({
            _id: id,
            name,
            parentTagId: '',
            path: [{ _id: id, name }],
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i)),
            modifiedAt: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, i)),
        });
    }
    const children: TagRecord[] = [];
    for (let i = 0; i < 16; i++) {
        const root = roots[i % 4];
        const id = `tag-child-${String(i)}`;
        const name = `Child ${String(i)}`;
        children.push({
            _id: id,
            name,
            parentTagId: root._id,
            path: [...root.path, { _id: id, name }],
            createdAt: new Date(Date.UTC(2026, 1, 2, 0, 0, i, 123)),
            modifiedAt: new Date(Date.UTC(2026, 1, 2, 1, 0, i, 456)),
        });
    }
    return [...roots, ...children];
};

/**
 * Builds 50 items with varying shapes:
 * - half are containers, half are leaves
 * - a third have a parent container reference
 * - every fifth item carries optional `properties` including `purchaseDate`
 * - every other item has no `description`
 */
const buildItems = (tags: TagRecord[]): InventoryItem[] => {
    const items: InventoryItem[] = [];
    for (let i = 0; i < 50; i++) {
        const isContainer = i % 2 === 0;
        const item: InventoryItem = {
            _id: `item-${String(i).padStart(3, '0')}`,
            name: `Item ${String(i)}`,
            isContainer,
            tagIds: [tags[i % tags.length]._id, tags[(i + 7) % tags.length]._id],
            createdAt: new Date(Date.UTC(2026, 2, 3, 12, i % 60, 30, 789)),
            modifiedAt: new Date(Date.UTC(2026, 3, 4, 14, i % 60, 45, 12)),
        };
        if (i % 2 === 1) {
            item.description = `Description for item ${String(i)}`;
        }
        if (i % 3 === 0 && i > 0) {
            item.containerId = `item-${String(i - 1).padStart(3, '0')}`;
        }
        if (i % 5 === 0) {
            item.properties = {
                serialNumber: `SN-${String(i)}`,
                make: 'TestMake',
                model: `Model-${String(i)}`,
                purchaseDate: new Date(Date.UTC(2025, 5, 6, 9, 0, 0, i)),
                purchaseFrom: 'Test Store',
                purchasePrice: 12345 + i,
                marketValue: 9999 + i,
                warranty: '1 year',
                condition: 'Good',
            };
        }
        items.push(item);
    }
    return items;
};

const buildFixture = (): InventoryState => {
    const tags = buildTags();
    const items = buildItems(tags);
    return { items, tags };
};

const assertSameDates = (a: Date, b: Date, label: string): void => {
    assert.strictEqual(a.getTime(), b.getTime(), `${label}: getTime() mismatch`);
};

describe('importExport/json', function () {
    describe('serializeJson', function () {
        it('produces an envelope with version, exportedAt, items, tags', function () {
            const text = serializeJson(buildFixture(), { exportedAt: FIXED_EXPORTED_AT });
            const raw = JSON.parse(text) as Record<string, unknown>;
            assert.strictEqual(raw.version, JSON_EXPORT_VERSION);
            assert.strictEqual(raw.exportedAt, FIXED_EXPORTED_AT.toISOString());
            assert.ok(Array.isArray(raw.items));
            assert.ok(Array.isArray(raw.tags));
        });

        it('defaults exportedAt to now when omitted', function () {
            const before = Date.now();
            const text = serializeJson({ items: [], tags: [] });
            const after = Date.now();
            const raw = JSON.parse(text) as { exportedAt: string };
            const ts = new Date(raw.exportedAt).getTime();
            assert.ok(
                ts >= before && ts <= after,
                `exportedAt ${String(ts)} out of [${String(before)}, ${String(after)}]`
            );
        });
    });

    describe('parseJson round-trip (50 items / 20 tags)', function () {
        const fixture: InventoryState = buildFixture();
        const firstText: string = serializeJson(fixture, { exportedAt: FIXED_EXPORTED_AT });
        const parsed: ParsedState = parseJson(firstText);

        it('parses envelope with correct version, exportedAt, and counts', function () {
            assert.strictEqual(parsed.version, JSON_EXPORT_VERSION);
            assert.ok(parsed.exportedAt instanceof Date);
            assertSameDates(parsed.exportedAt, FIXED_EXPORTED_AT, 'exportedAt');
            assert.strictEqual(parsed.items.length, 50);
            assert.strictEqual(parsed.tags.length, 20);
        });

        it('preserves every item field including timestamps and properties', function () {
            for (let i = 0; i < fixture.items.length; i++) {
                const original = fixture.items[i];
                const got = parsed.items[i];
                assert.strictEqual(got._id, original._id, `items[${String(i)}]._id`);
                assert.strictEqual(got.name, original.name, `items[${String(i)}].name`);
                assert.strictEqual(got.description, original.description, `items[${String(i)}].description`);
                assert.strictEqual(got.isContainer, original.isContainer, `items[${String(i)}].isContainer`);
                assert.strictEqual(got.containerId, original.containerId, `items[${String(i)}].containerId`);
                assert.deepStrictEqual(got.tagIds, original.tagIds, `items[${String(i)}].tagIds`);
                assert.ok(got.createdAt instanceof Date, `items[${String(i)}].createdAt is Date`);
                assert.ok(got.modifiedAt instanceof Date, `items[${String(i)}].modifiedAt is Date`);
                assertSameDates(got.createdAt, original.createdAt, `items[${String(i)}].createdAt`);
                assertSameDates(got.modifiedAt, original.modifiedAt, `items[${String(i)}].modifiedAt`);
                if (original.properties !== undefined) {
                    assert.ok(got.properties, `items[${String(i)}].properties present`);
                    const op = original.properties;
                    const gp = got.properties;
                    assert.strictEqual(gp.serialNumber, op.serialNumber);
                    assert.strictEqual(gp.make, op.make);
                    assert.strictEqual(gp.model, op.model);
                    assert.strictEqual(gp.purchaseFrom, op.purchaseFrom);
                    assert.strictEqual(gp.purchasePrice, op.purchasePrice);
                    assert.strictEqual(gp.marketValue, op.marketValue);
                    assert.strictEqual(gp.warranty, op.warranty);
                    assert.strictEqual(gp.condition, op.condition);
                    const opDate = op.purchaseDate;
                    const gpDate = gp.purchaseDate;
                    assert.ok(opDate instanceof Date, `items[${String(i)}].properties.purchaseDate (original) is Date`);
                    assert.ok(gpDate instanceof Date, `items[${String(i)}].properties.purchaseDate (parsed) is Date`);
                    assertSameDates(gpDate, opDate, `items[${String(i)}].properties.purchaseDate`);
                }
            }
        });

        it('preserves every tag field including nested path', function () {
            for (let i = 0; i < fixture.tags.length; i++) {
                const original = fixture.tags[i];
                const got = parsed.tags[i];
                assert.strictEqual(got._id, original._id);
                assert.strictEqual(got.name, original.name);
                assert.strictEqual(got.parentTagId, original.parentTagId);
                assert.deepStrictEqual(got.path, original.path, `tags[${String(i)}].path`);
                assertSameDates(got.createdAt, original.createdAt, `tags[${String(i)}].createdAt`);
                assertSameDates(got.modifiedAt, original.modifiedAt, `tags[${String(i)}].modifiedAt`);
            }
        });

        it('re-serializes byte-for-byte identical to the first serialize', function () {
            const secondText = serializeJson(parsed, { exportedAt: parsed.exportedAt });
            assert.strictEqual(secondText, firstText);
        });
    });

    describe('error handling', function () {
        it('rejects malformed JSON with a helpful error', function () {
            assert.throws(
                () => parseJson('{not json'),
                (err: unknown) => err instanceof JsonImportError && /Malformed JSON/i.test(err.message)
            );
        });

        it('rejects non-object top-level value', function () {
            assert.throws(
                () => parseJson('[]'),
                (err: unknown) => err instanceof JsonImportError && /must be an object/i.test(err.message)
            );
        });

        it('rejects unknown version with a clear message', function () {
            const text = JSON.stringify({
                version: 2,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                items: [],
                tags: [],
            });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && /Unsupported version/i.test(err.message)
            );
        });

        it('rejects missing version', function () {
            const text = JSON.stringify({ exportedAt: FIXED_EXPORTED_AT.toISOString(), items: [], tags: [] });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && /Missing required key: version/i.test(err.message)
            );
        });

        it('rejects missing exportedAt', function () {
            const text = JSON.stringify({ version: JSON_EXPORT_VERSION, items: [], tags: [] });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && /exportedAt/i.test(err.message)
            );
        });

        it('rejects missing items', function () {
            const text = JSON.stringify({
                version: JSON_EXPORT_VERSION,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                tags: [],
            });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && /items/i.test(err.message)
            );
        });

        it('rejects missing tags', function () {
            const text = JSON.stringify({
                version: JSON_EXPORT_VERSION,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                items: [],
            });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && /tags/i.test(err.message)
            );
        });

        it('reports the offending item index on malformed item', function () {
            const text = JSON.stringify({
                version: JSON_EXPORT_VERSION,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                items: [
                    {
                        _id: 'x',
                        name: 'y',
                        isContainer: true,
                        tagIds: [],
                        createdAt: 'not-a-date',
                        modifiedAt: new Date().toISOString(),
                    },
                ],
                tags: [],
            });
            assert.throws(
                () => parseJson(text),
                (err: unknown) => err instanceof JsonImportError && err.message.includes('items[0]')
            );
        });
    });

    describe('forward-compat', function () {
        it('tolerates extra unknown fields at the envelope level', function () {
            const text = JSON.stringify({
                version: JSON_EXPORT_VERSION,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                items: [],
                tags: [],
                somethingNew: { future: true },
                anotherField: 'hello',
            });
            const result = parseJson(text);
            assert.strictEqual(result.version, JSON_EXPORT_VERSION);
            assert.strictEqual((result as unknown as Record<string, unknown>).somethingNew !== undefined, true);
            assert.strictEqual((result as unknown as Record<string, unknown>).anotherField, 'hello');
        });

        it('tolerates extra unknown fields on items and tags', function () {
            const text = JSON.stringify({
                version: JSON_EXPORT_VERSION,
                exportedAt: FIXED_EXPORTED_AT.toISOString(),
                items: [
                    {
                        _id: 'i1',
                        name: 'I1',
                        isContainer: false,
                        tagIds: [],
                        createdAt: FIXED_EXPORTED_AT.toISOString(),
                        modifiedAt: FIXED_EXPORTED_AT.toISOString(),
                        futureField: 42,
                    },
                ],
                tags: [
                    {
                        _id: 't1',
                        name: 'T1',
                        parentTagId: '',
                        path: [{ _id: 't1', name: 'T1' }],
                        createdAt: FIXED_EXPORTED_AT.toISOString(),
                        modifiedAt: FIXED_EXPORTED_AT.toISOString(),
                        futureField: 'value',
                    },
                ],
            });
            const result = parseJson(text);
            assert.strictEqual((result.items[0] as unknown as Record<string, unknown>).futureField, 42);
            assert.strictEqual((result.tags[0] as unknown as Record<string, unknown>).futureField, 'value');
        });
    });
});
