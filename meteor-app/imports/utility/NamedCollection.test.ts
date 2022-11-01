import assert from 'assert';
import NamedCollection from './NamedCollection';

describe('NamedCollection', function () {
    it('has property "name"', async function () {
        const collection = new NamedCollection('foobar');

        assert.strictEqual('foobar', collection.name);
    });
});
