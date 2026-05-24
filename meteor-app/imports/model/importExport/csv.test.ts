import assert from 'assert';
import fs from 'fs';
import path from 'path';

import type { ExportRow, ParsedRow } from '/imports/model/importExport/csv';
import {
    EXTENDED_COLUMNS,
    UMR_COLUMNS,
    formatCurrency,
    formatDate,
    parseCsv,
    parseCurrencyCents,
    parseDateString,
    parseTags,
    stringifyCsv,
} from '/imports/model/importExport/csv';

const UMR_FIXTURE = `Name,Description,Category,Collection,Location,Make,Model,Serial Number,Purchase Date,Purchase From,Purchase Price,Market Value,Warranty,Condition,Heir,Quantity,Tags
"Hammer, 16oz","Claw hammer
with grip",Tools,(uncollected),House / Garage / Toolbox,Stanley,STHT51512,SN-001,3/14/22,Hardware Store,"$12.99","$15.00",(unspecified),Good,(unspecified),1,"diy, hand-tool"
"Tesla Model X","",Vehicles,Cars,(unassigned),Tesla,Model X,5YJXCAE26LF286058,1/2/21,Tesla,"$95,000.00","$60,000.00",(unspecified),Excellent,(unspecified),1,(unspecified)
Notebook,(unspecified),(uncategorized),(uncollected),(unassigned),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),(unspecified),1,(unspecified)`;

describe('importExport/csv', function () {
    describe('parseCurrencyCents', function () {
        it('parses $1,234.56 to 123456 cents', function () {
            assert.strictEqual(parseCurrencyCents('$1,234.56').value, 123456);
        });

        it('parses plain numbers', function () {
            assert.strictEqual(parseCurrencyCents('42').value, 4200);
            assert.strictEqual(parseCurrencyCents('0.01').value, 1);
        });

        it('returns undefined for sentinels and empty', function () {
            assert.strictEqual(parseCurrencyCents('(unspecified)').value, undefined);
            assert.strictEqual(parseCurrencyCents('').value, undefined);
            assert.strictEqual(parseCurrencyCents(undefined).value, undefined);
        });

        it('warns on non-numeric input', function () {
            const result = parseCurrencyCents('not a price');
            assert.strictEqual(result.value, undefined);
            assert.ok(result.warning?.includes('not a price'));
        });
    });

    describe('formatCurrency', function () {
        it('round-trips cents to a dollar string', function () {
            assert.strictEqual(formatCurrency(123456), '$1234.56');
            assert.strictEqual(formatCurrency(1), '$0.01');
            assert.strictEqual(formatCurrency(0), '$0.00');
        });

        it('returns empty for undefined', function () {
            assert.strictEqual(formatCurrency(undefined), '');
        });
    });

    describe('parseDateString', function () {
        it('parses M/D/YY using YY>=50 -> 19YY else 20YY', function () {
            const a = parseDateString('3/14/22').value;
            assert.strictEqual(a?.getUTCFullYear(), 2022);
            assert.strictEqual(a?.getUTCMonth(), 2);
            assert.strictEqual(a?.getUTCDate(), 14);

            const b = parseDateString('6/1/85').value;
            assert.strictEqual(b?.getUTCFullYear(), 1985);
        });

        it('parses MM/DD/YYYY', function () {
            const d = parseDateString('12/31/1999').value;
            assert.strictEqual(d?.getUTCFullYear(), 1999);
            assert.strictEqual(d?.getUTCMonth(), 11);
            assert.strictEqual(d?.getUTCDate(), 31);
        });

        it('parses ISO date strings', function () {
            const d = parseDateString('2024-05-24').value;
            assert.strictEqual(d?.getUTCFullYear(), 2024);
        });

        it('returns undefined for sentinels and empty', function () {
            assert.strictEqual(parseDateString('(unspecified)').value, undefined);
            assert.strictEqual(parseDateString('').value, undefined);
        });

        it('warns on unparseable input', function () {
            const r = parseDateString('not a date');
            assert.strictEqual(r.value, undefined);
            assert.ok(r.warning !== undefined);
        });
    });

    describe('parseTags', function () {
        it('splits comma-separated tags and trims whitespace', function () {
            assert.deepStrictEqual(parseTags('  red ,green , blue'), ['red', 'green', 'blue']);
        });

        it('drops empty entries', function () {
            assert.deepStrictEqual(parseTags('a,,b, ,c'), ['a', 'b', 'c']);
        });

        it('returns empty array for sentinels and empty', function () {
            assert.deepStrictEqual(parseTags('(unspecified)'), []);
            assert.deepStrictEqual(parseTags(''), []);
            assert.deepStrictEqual(parseTags(undefined), []);
        });
    });

    describe('parseCsv', function () {
        it('returns empty array for empty input', function () {
            assert.deepStrictEqual(parseCsv(''), []);
            assert.deepStrictEqual(parseCsv('   \n   '), []);
        });

        it('parses the UMR-shaped fixture with zero warnings on the first row', function () {
            const rows = parseCsv(UMR_FIXTURE);
            assert.strictEqual(rows.length, 3);
            const first = rows[0];
            assert.strictEqual(first.name, 'Hammer, 16oz');
            assert.strictEqual(first.description, 'Claw hammer\nwith grip');
            assert.strictEqual(first.category, 'Tools');
            assert.strictEqual(first.collection, undefined);
            assert.strictEqual(first.location, 'House / Garage / Toolbox');
            assert.strictEqual(first.serialNumber, 'SN-001');
            assert.strictEqual(first.purchasePrice, 1299);
            assert.strictEqual(first.marketValue, 1500);
            assert.deepStrictEqual(first.tags, ['diy', 'hand-tool']);
            assert.strictEqual(first.warnings.length, 0);
        });

        it('preserves VIN-like serial numbers unchanged', function () {
            const rows = parseCsv(UMR_FIXTURE);
            assert.strictEqual(rows[1].serialNumber, '5YJXCAE26LF286058');
            assert.strictEqual(rows[1].purchasePrice, 9500000);
        });

        it('treats every UMR sentinel as undefined', function () {
            const rows = parseCsv(UMR_FIXTURE);
            const fully = rows[2];
            assert.strictEqual(fully.category, undefined);
            assert.strictEqual(fully.collection, undefined);
            assert.strictEqual(fully.location, undefined);
            assert.strictEqual(fully.make, undefined);
            assert.strictEqual(fully.purchasePrice, undefined);
            assert.deepStrictEqual(fully.tags, []);
        });

        it('strips a UTF-8 BOM from the first header', function () {
            const withBom = `\uFEFF${UMR_FIXTURE}`;
            const rows = parseCsv(withBom);
            assert.strictEqual(rows[0].name, 'Hammer, 16oz');
        });

        it('handles trailing newlines without producing empty rows', function () {
            const rows = parseCsv(`${UMR_FIXTURE}\n\n`);
            assert.strictEqual(rows.length, 3);
        });

        it('handles aliases like Notes -> description and Manufacturer -> make', function () {
            const csv = 'Name,Notes,Manufacturer\nWidget,A note,ACME';
            const rows = parseCsv(csv);
            assert.strictEqual(rows[0].description, 'A note');
            assert.strictEqual(rows[0].make, 'ACME');
        });
    });

    describe('stringifyCsv', function () {
        const sampleRow: ExportRow = {
            name: 'Hammer, 16oz',
            description: 'Claw hammer\nwith grip',
            category: 'Tools',
            location: 'House / Garage / Toolbox',
            make: 'Stanley',
            serialNumber: 'SN-001',
            purchaseDate: new Date(Date.UTC(2022, 2, 14)),
            purchasePrice: 1299,
            marketValue: 1500,
            quantity: 1,
            tags: ['diy', 'hand-tool'],
        };

        it('emits the UMR column header in umrCompat mode', function () {
            const csv = stringifyCsv([sampleRow], { umrCompat: true });
            const firstLine = csv.split('\n')[0];
            assert.strictEqual(firstLine, UMR_COLUMNS.join(','));
        });

        it('emits extended columns by default', function () {
            const csv = stringifyCsv([sampleRow]);
            const firstLine = csv.split('\n')[0];
            assert.strictEqual(firstLine, EXTENDED_COLUMNS.join(','));
        });

        it('writes UMR sentinels for empty Category/Collection/Location in umrCompat', function () {
            const csv = stringifyCsv([{ name: 'X', quantity: 1 }], { umrCompat: true });
            assert.ok(csv.includes('(uncategorized)'));
            assert.ok(csv.includes('(uncollected)'));
            assert.ok(csv.includes('(unassigned)'));
        });

        it('round-trips comparable fields', function () {
            const csv = stringifyCsv([sampleRow], { umrCompat: true });
            const rows = parseCsv(csv);
            const r = rows[0];
            assert.strictEqual(r.name, sampleRow.name);
            assert.strictEqual(r.description, sampleRow.description);
            assert.strictEqual(r.category, sampleRow.category);
            assert.strictEqual(r.location, sampleRow.location);
            assert.strictEqual(r.make, sampleRow.make);
            assert.strictEqual(r.serialNumber, sampleRow.serialNumber);
            assert.strictEqual(r.purchasePrice, sampleRow.purchasePrice);
            assert.strictEqual(r.marketValue, sampleRow.marketValue);
            assert.deepStrictEqual(r.tags, sampleRow.tags);
            assert.strictEqual(formatDate(r.purchaseDate), '2022-03-14');
        });
    });

    describe('UMR sample fixture', function () {
        it('parses without errors when present on disk', function () {
            const fixturePath = path.resolve(
                __dirname,
                '../../../../specs/004-import-export/fixtures/under-my-roof-sample.csv'
            );
            let contents = '';
            try {
                contents = fs.readFileSync(fixturePath, 'utf8');
            } catch {
                this.skip();
                return;
            }
            if (contents.trim() === '') {
                this.skip();
                return;
            }
            const rows: ParsedRow[] = parseCsv(contents);
            assert.ok(rows.length > 0, 'expected at least one row from fixture');
            for (const r of rows) {
                assert.ok(typeof r.name === 'string');
            }
        });
    });
});
