import assert from 'assert';
import printable from './printable';

describe('printable', function () {
    it('returns string for printable primitives', async function () {
        assert.deepStrictEqual(printable(1), '[number]1');
        assert.deepStrictEqual(printable('2'), '[string]2');
        assert.deepStrictEqual(printable(true), '[boolean]true');
    });

    it('flattens complex values into a shallow object', async function () {
        assert.deepStrictEqual(printable([1, '2', true]), { '0': '[number]1', '1': '[string]2', '2': '[boolean]true' });
        assert.deepStrictEqual(printable([[1, '2', true]]), {
            '0.0': '[number]1',
            '0.1': '[string]2',
            '0.2': '[boolean]true',
        });
        assert.deepStrictEqual(printable({ foo: 1 }), { foo: '[number]1' });
        assert.deepStrictEqual(printable({ foo: [1, '2', true] }), {
            'foo.0': '[number]1',
            'foo.1': '[string]2',
            'foo.2': '[boolean]true',
        });
        assert.deepStrictEqual(printable({ foo: { bar: 1 } }), { 'foo.bar': '[number]1' });
        assert.deepStrictEqual(printable({ foo: [{ bar: 1 }] }), { 'foo.0.bar': '[number]1' });
    });
});
