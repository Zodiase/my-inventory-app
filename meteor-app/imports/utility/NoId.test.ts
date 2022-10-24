import NoOp from '/imports/utility/NoOp';
import NoId from './NoId';

describe('NoId', function () {
    it('Type casting', async function () {
        const tester = <T>(x: T, y: NoId<T>): void => NoOp(x, y);

        tester(
            {
                _id: '',
                payload: 1,
            },
            {
                payload: 1,
            }
        );
    });
});
