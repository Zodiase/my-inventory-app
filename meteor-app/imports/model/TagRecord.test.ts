import assert from 'assert';

import NoOp from '/imports/utility/NoOp';

import type TagRecord from './TagRecord';

describe('TagRecord', function () {
    it('Type casting', async function () {
        const tester = (x: TagRecord): void => {
            NoOp(x);
        };

        assert.doesNotThrow(() => {
            tester({
                _id: '',
                createdAt: new Date(),
                modifiedAt: new Date(),
                parentTagId: '',
                name: '',
                path: [{ _id: '', name: '' }],
            });
        });
    });
});
