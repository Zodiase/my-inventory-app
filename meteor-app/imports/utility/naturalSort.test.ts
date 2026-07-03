import assert from 'assert';

import { compareNaturalText } from './naturalSort';

describe('compareNaturalText', function () {
    it('sorts numbered item and container labels naturally', function () {
        const names = ['Cable 10', 'Box 10', 'Cable 2', 'Box 2'];

        assert.deepStrictEqual(names.sort(compareNaturalText), ['Box 2', 'Box 10', 'Cable 2', 'Cable 10']);
    });
});
