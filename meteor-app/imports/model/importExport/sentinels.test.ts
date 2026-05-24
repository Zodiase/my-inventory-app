import assert from 'assert';

import { SENTINELS, fromSentinel, isSentinel, toSentinel } from '/imports/model/importExport/sentinels';

describe('importExport/sentinels', function () {
    describe('SENTINELS', function () {
        it('exposes the four UMR sentinel strings', function () {
            assert.strictEqual(SENTINELS.generic, '(unspecified)');
            assert.strictEqual(SENTINELS.category, '(uncategorized)');
            assert.strictEqual(SENTINELS.collection, '(uncollected)');
            assert.strictEqual(SENTINELS.location, '(unassigned)');
        });
    });

    describe('fromSentinel', function () {
        it('returns undefined for null and undefined', function () {
            assert.strictEqual(fromSentinel(undefined), undefined);
            assert.strictEqual(fromSentinel(null), undefined);
        });

        it('returns undefined for empty and whitespace-only strings', function () {
            assert.strictEqual(fromSentinel(''), undefined);
            assert.strictEqual(fromSentinel('   '), undefined);
        });

        it('returns undefined for every known sentinel', function () {
            for (const sentinel of Object.values(SENTINELS)) {
                assert.strictEqual(fromSentinel(sentinel), undefined, sentinel);
                assert.strictEqual(fromSentinel(`  ${sentinel}  `), undefined, `padded ${sentinel}`);
            }
        });

        it('returns the trimmed value otherwise', function () {
            assert.strictEqual(fromSentinel('Hammer'), 'Hammer');
            assert.strictEqual(fromSentinel('  Hammer  '), 'Hammer');
        });

        it('does not treat lookalike substrings as sentinels', function () {
            assert.strictEqual(fromSentinel('(unspecified) tool'), '(unspecified) tool');
        });
    });

    describe('toSentinel', function () {
        it('returns the matching sentinel for empty/undefined values', function () {
            assert.strictEqual(toSentinel(undefined, 'generic'), '(unspecified)');
            assert.strictEqual(toSentinel(null, 'category'), '(uncategorized)');
            assert.strictEqual(toSentinel('', 'collection'), '(uncollected)');
            assert.strictEqual(toSentinel('', 'location'), '(unassigned)');
        });

        it('returns the original value when present', function () {
            assert.strictEqual(toSentinel('Garage', 'location'), 'Garage');
            assert.strictEqual(toSentinel('Tools', 'category'), 'Tools');
        });
    });

    describe('isSentinel', function () {
        it('detects known sentinel strings', function () {
            assert.strictEqual(isSentinel('(unspecified)'), true);
            assert.strictEqual(isSentinel('(uncategorized)'), true);
            assert.strictEqual(isSentinel('(uncollected)'), true);
            assert.strictEqual(isSentinel('(unassigned)'), true);
        });

        it('returns false for non-sentinel input', function () {
            assert.strictEqual(isSentinel(undefined), false);
            assert.strictEqual(isSentinel(null), false);
            assert.strictEqual(isSentinel(''), false);
            assert.strictEqual(isSentinel('Hammer'), false);
        });
    });
});
