import { expect } from 'chai';

import type { InventoryItem } from '/imports/model/InventoryItem';

import { classify, type NormalizedRow } from './dedup';

const BASE_CREATED = new Date('2024-01-15T10:00:00.000Z');
const BASE_MODIFIED = new Date('2024-02-01T10:00:00.000Z');
const PURCHASE_DATE = new Date('2023-06-01T00:00:00.000Z');

function makeExisting(overrides: Partial<InventoryItem> = {}): InventoryItem {
    return {
        _id: 'existing-1',
        createdAt: BASE_CREATED,
        modifiedAt: BASE_MODIFIED,
        name: 'Laptop',
        isContainer: false,
        tagIds: [],
        properties: {
            make: 'Acme',
            model: 'X1',
            serialNumber: 'SN-100',
            purchaseDate: PURCHASE_DATE,
        },
        ...overrides,
    };
}

function makeJsonCandidate(overrides: Partial<NormalizedRow> = {}): NormalizedRow {
    return {
        createdAt: BASE_CREATED,
        modifiedAt: BASE_MODIFIED,
        name: 'Laptop',
        isContainer: false,
        tagIds: [],
        properties: {
            make: 'Acme',
            model: 'X1',
            serialNumber: 'SN-100',
            purchaseDate: PURCHASE_DATE,
        },
        ...overrides,
    };
}

function makeCsvCandidate(overrides: Partial<NormalizedRow> = {}): NormalizedRow {
    return {
        name: 'Laptop',
        isContainer: false,
        tagIds: [],
        properties: {
            make: 'Acme',
            model: 'X1',
            serialNumber: 'SN-100',
            purchaseDate: PURCHASE_DATE,
        },
        ...overrides,
    };
}

describe('importExport/dedup classify (truth table)', function () {
    describe('empty existing matches', function () {
        it('create-new when no existing items supplied', function () {
            const result = classify(makeJsonCandidate(), []);
            expect(result.action).to.equal('create-new');
            expect(result.target).to.equal(undefined);
            expect(result.mergeFields).to.equal(undefined);
        });
    });

    describe('exact-duplicate', function () {
        it('JSON candidate with matching createdAt and identical other fields (round-trip no-op)', function () {
            const existing = makeExisting();
            const result = classify(makeJsonCandidate(), [existing]);
            expect(result.action).to.equal('exact-duplicate');
            expect(result.target).to.equal(existing);
            expect(result.mergeFields).to.equal(undefined);
        });

        it('CSV candidate (no createdAt) with same name/make/model/serial/purchaseDate as existing', function () {
            const existing = makeExisting();
            const result = classify(makeCsvCandidate(), [existing]);
            expect(result.action).to.equal('exact-duplicate');
            expect(result.target).to.equal(existing);
        });

        it('CSV candidate with empty tagIds matches existing empty tagIds (set-equal)', function () {
            const existing = makeExisting({ tagIds: [] });
            const result = classify(makeCsvCandidate({ tagIds: [] }), [existing]);
            expect(result.action).to.equal('exact-duplicate');
        });

        it('treats tagIds as set-equal regardless of order', function () {
            const existing = makeExisting({ tagIds: ['t-a', 't-b'] });
            const result = classify(makeCsvCandidate({ tagIds: ['t-b', 't-a'] }), [existing]);
            expect(result.action).to.equal('exact-duplicate');
        });
    });

    describe('superset-merge', function () {
        it('candidate adds a previously-undefined non-comparable field (description)', function () {
            const existing = makeExisting({ description: undefined });
            const candidate = makeJsonCandidate({ description: 'A new note' });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('superset-merge');
            expect(result.target).to.equal(existing);
            expect(result.mergeFields).to.deep.equal({ description: 'A new note' });
        });

        it('candidate adds a previously-undefined comparable field (purchaseDate)', function () {
            const existing = makeExisting({
                properties: { make: 'Acme', model: 'X1', serialNumber: 'SN-100' },
            });
            const candidate = makeCsvCandidate();
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('superset-merge');
            expect(result.mergeFields?.properties).to.deep.equal({
                make: 'Acme',
                model: 'X1',
                serialNumber: 'SN-100',
                purchaseDate: PURCHASE_DATE,
            });
        });

        it('candidate adds a previously-undefined non-comparable property (purchaseFrom)', function () {
            const existing = makeExisting();
            const candidate = makeJsonCandidate({
                properties: {
                    make: 'Acme',
                    model: 'X1',
                    serialNumber: 'SN-100',
                    purchaseDate: PURCHASE_DATE,
                    purchaseFrom: 'StoreCo',
                },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('superset-merge');
            expect(result.mergeFields?.properties?.purchaseFrom).to.equal('StoreCo');
            expect(result.mergeFields?.properties?.make).to.equal('Acme');
        });
    });

    describe('create-new', function () {
        it('different name => create-new', function () {
            const existing = makeExisting();
            const result = classify(makeCsvCandidate({ name: 'Phone' }), [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('JSON candidate with different createdAt than existing => create-new', function () {
            const existing = makeExisting();
            const candidate = makeJsonCandidate({ createdAt: new Date('2024-12-31T00:00:00.000Z') });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('conflicting comparable property (make) => create-new', function () {
            const existing = makeExisting();
            const candidate = makeCsvCandidate({
                properties: { make: 'Other', model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('conflicting non-comparable field (description) => create-new', function () {
            const existing = makeExisting({ description: 'original' });
            const candidate = makeJsonCandidate({ description: 'different' });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('existing has comparable field defined, candidate does not => create-new', function () {
            const existing = makeExisting();
            const candidate = makeCsvCandidate({
                properties: { make: 'Acme', model: 'X1', purchaseDate: PURCHASE_DATE },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('tagIds membership differs => create-new', function () {
            const existing = makeExisting({ tagIds: ['t-a'] });
            const candidate = makeCsvCandidate({ tagIds: ['t-b'] });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });
    });

    describe('undefined vs empty-string distinction', function () {
        it('existing.make = undefined, candidate.make = "" => superset-merge adds empty string', function () {
            const existing = makeExisting({
                properties: { model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const candidate = makeCsvCandidate({
                properties: { make: '', model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('superset-merge');
            expect(result.mergeFields?.properties?.make).to.equal('');
        });

        it('existing.make = "", candidate.make = undefined => create-new (existing defined, candidate not)', function () {
            const existing = makeExisting({
                properties: { make: '', model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const candidate = makeCsvCandidate({
                properties: { model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('create-new');
        });

        it('existing.make = "", candidate.make = "" => exact-duplicate', function () {
            const existing = makeExisting({
                properties: { make: '', model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const candidate = makeCsvCandidate({
                properties: { make: '', model: 'X1', serialNumber: 'SN-100', purchaseDate: PURCHASE_DATE },
            });
            const result = classify(candidate, [existing]);
            expect(result.action).to.equal('exact-duplicate');
        });
    });

    describe('multiple existing matches — highest-priority outcome wins', function () {
        it('returns exact-duplicate when one of many matches is an exact duplicate', function () {
            const supersetTarget = makeExisting({ _id: 'a', description: undefined });
            const exactTarget = makeExisting({ _id: 'b', description: 'added' });
            const candidate = makeJsonCandidate({ description: 'added' });
            const result = classify(candidate, [supersetTarget, exactTarget]);
            expect(result.action).to.equal('exact-duplicate');
            expect(result.target?._id).to.equal('b');
        });

        it('returns superset-merge over create-new when no exact-duplicate is present', function () {
            const conflictTarget = makeExisting({ _id: 'a', description: 'conflicting' });
            const mergeTarget = makeExisting({ _id: 'b', description: undefined });
            const candidate = makeJsonCandidate({ description: 'added' });
            const result = classify(candidate, [conflictTarget, mergeTarget]);
            expect(result.action).to.equal('superset-merge');
            expect(result.target?._id).to.equal('b');
            expect(result.mergeFields?.description).to.equal('added');
        });

        it('returns the first superset-merge match when multiple superset matches exist', function () {
            const first = makeExisting({ _id: 'a', description: undefined });
            const second = makeExisting({ _id: 'b', description: undefined });
            const candidate = makeJsonCandidate({ description: 'added' });
            const result = classify(candidate, [first, second]);
            expect(result.action).to.equal('superset-merge');
            expect(result.target?._id).to.equal('a');
        });

        it('returns create-new when no existing match qualifies', function () {
            const conflictA = makeExisting({ _id: 'a', name: 'Other' });
            const conflictB = makeExisting({ _id: 'b', description: 'x' });
            const candidate = makeJsonCandidate({ description: 'y' });
            const result = classify(candidate, [conflictA, conflictB]);
            expect(result.action).to.equal('create-new');
            expect(result.target).to.equal(undefined);
        });
    });
});
