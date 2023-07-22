import assert from 'assert';

import NoOp from '/imports/utility/NoOp';

import { CollectionItem } from './CollectionItem';

describe('CollectionItem', function () {
    it('Type casting', async function () {
        const tester = (x: CollectionItem): void => {
            NoOp(x);
        };

        assert.doesNotThrow(() => {
            tester({
                _id: '',
                createdAt: new Date(),
                modifiedAt: new Date(),
            });
        });
    });

    it('Can be constructed', async function () {
        assert.doesNotThrow(() => {
            return new CollectionItem({
                _id: '',
                createdAt: new Date(),
                modifiedAt: new Date(),
            });
        });
    });
});
