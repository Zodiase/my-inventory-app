import { expect } from 'chai';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { sortInventoryItems } from '/imports/ui/AllItemsView/inventorySort';

const item = (
    name: string,
    options: { isContainer?: boolean; createdAt?: string; modifiedAt?: string } = {}
): InventoryItem => ({
    _id: name,
    name,
    isContainer: options.isContainer ?? false,
    tagIds: [],
    createdAt: new Date(options.createdAt ?? '2026-01-01T00:00:00Z'),
    modifiedAt: new Date(options.modifiedAt ?? '2026-01-01T00:00:00Z'),
});

describe('inventorySort', function () {
    it('keeps containers first and applies natural ascending names', function () {
        const result = sortInventoryItems(
            [
                item('Cable 10'),
                item('Box 10', { isContainer: true }),
                item('Cable 2'),
                item('Box 2', { isContainer: true }),
            ],
            'name-asc'
        );

        expect(result.map(({ name }) => name)).to.deep.equal(['Box 2', 'Box 10', 'Cable 2', 'Cable 10']);
    });

    it('keeps containers first while reversing names within each type', function () {
        const result = sortInventoryItems(
            [
                item('Cable 10'),
                item('Box 10', { isContainer: true }),
                item('Cable 2'),
                item('Box 2', { isContainer: true }),
            ],
            'name-desc'
        );

        expect(result.map(({ name }) => name)).to.deep.equal(['Box 10', 'Box 2', 'Cable 10', 'Cable 2']);
    });

    it('sorts all entries by modified time for recent and oldest options', function () {
        const olderContainer = item('Older container', {
            isContainer: true,
            modifiedAt: '2026-01-01T00:00:00Z',
        });
        const newerItem = item('Newer item', { modifiedAt: '2026-02-01T00:00:00Z' });

        expect(sortInventoryItems([olderContainer, newerItem], 'updated-desc').map(({ name }) => name)).to.deep.equal([
            'Newer item',
            'Older container',
        ]);
        expect(sortInventoryItems([olderContainer, newerItem], 'updated-asc').map(({ name }) => name)).to.deep.equal([
            'Older container',
            'Newer item',
        ]);
    });
});
