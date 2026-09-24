import assert from 'assert';

import { requireInventorySearchApiKey } from './config';

describe('inventory search configuration', function () {
    it('requires an explicit nonblank API key', function () {
        assert.throws(() => requireInventorySearchApiKey({}), /INVENTORY_SEARCH_API_KEY must be set/);
        assert.throws(
            () => requireInventorySearchApiKey({ INVENTORY_SEARCH_API_KEY: '   ' }),
            /INVENTORY_SEARCH_API_KEY must be set/
        );
        assert.strictEqual(
            requireInventorySearchApiKey({ INVENTORY_SEARCH_API_KEY: 'private-search-key' }),
            'private-search-key'
        );
    });
});
