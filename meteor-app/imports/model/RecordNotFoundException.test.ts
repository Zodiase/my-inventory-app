import assert from 'assert';

import NoOp from '/imports/utility/NoOp';

import RecordNotFoundException from './RecordNotFoundException';

describe('RecordNotFoundException', function () {
    it('Type casting', async function () {
        const tester = (x: RecordNotFoundException): void => {
            NoOp(x);
        };

        assert.doesNotThrow(() => {
            const exception = {
                ...new Error(''),
                cause: {},
            };

            tester(exception);
        });
    });

    it('has the right cause', async function () {
        const selector = {};
        const exception = new RecordNotFoundException('', selector);

        assert.strictEqual(exception.cause, selector);
    });
});
