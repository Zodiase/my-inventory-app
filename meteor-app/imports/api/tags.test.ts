import assert from 'assert';
import { createTag } from './tags';

describe('tags', function () {
    describe('createTag', function () {
        it('throws when tag name is undefined', async function () {
            await assert.rejects(
                async () => await createTag({}),
                (error) => {
                    assert(error instanceof Error);
                    assert.equal(error.message, 'Tag must have a name.');

                    return true;
                }
            );
        });
    });
});
