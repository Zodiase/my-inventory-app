import NoOp from '/imports/utility/NoOp';

import NoId from './NoId';

// Test constants
const TEST_PAYLOAD_VALUE = 1;

describe('NoId', () => {
    it('Type casting', () => {
        const tester = (
            input: { _id: string; payload: number },
            output: NoId<{ _id: string; payload: number }>
        ): void => {
            expect(input as NoId<{ _id: string; payload: number }>).toStrictEqual(output);
        };

        tester(
            {
                _id: '',
                payload: TEST_PAYLOAD_VALUE,
            },
            {
                payload: TEST_PAYLOAD_VALUE,
            }
        );
    });
});
