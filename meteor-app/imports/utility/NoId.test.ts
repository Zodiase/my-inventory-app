import { expect } from 'chai';

import NoId from './NoId';

// Test constants
const TEST_PAYLOAD_VALUE = 1;

describe('NoId', () => {
    it('Type behavior', () => {
        // Test that NoId type allows assignment of objects without _id
        const objectWithoutId: NoId<{ _id: string; payload: number }> = {
            payload: TEST_PAYLOAD_VALUE,
        };

        // Test that the type works as expected
        expect(objectWithoutId.payload).to.equal(TEST_PAYLOAD_VALUE);

        // Verify that NoId is just a type alias and the object structure is correct
        expect(objectWithoutId).to.be.an('object');
        expect(objectWithoutId).to.not.have.property('_id');
        expect(objectWithoutId).to.have.property('payload', TEST_PAYLOAD_VALUE);
    });
});
