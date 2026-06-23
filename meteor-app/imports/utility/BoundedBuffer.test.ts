import { expect } from 'chai';

import { BoundedBuffer } from './BoundedBuffer';

describe('BoundedBuffer', () => {
    it('buffers items and respects maximum capacity', () => {
        const buffer = new BoundedBuffer<number>(3);

        buffer.push(1);
        buffer.push(2);
        expect(buffer.get()).to.deep.equal([1, 2]);

        buffer.push(3);
        buffer.push(4);
        expect(buffer.get()).to.deep.equal([2, 3, 4]);

        buffer.push(5);
        expect(buffer.get()).to.deep.equal([3, 4, 5]);
    });

    it('clears items correctly', () => {
        const buffer = new BoundedBuffer<number>(3);
        buffer.push(1);
        buffer.push(2);

        buffer.clear();
        expect(buffer.get()).to.deep.equal([]);

        buffer.push(3);
        expect(buffer.get()).to.deep.equal([3]);
    });
});
