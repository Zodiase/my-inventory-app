/**
 * An Error with a selector attached as the cause for not founding the record.
 */
export class RecordNotFoundException<T extends Record<string, unknown> = Record<string, unknown>> extends Error {
    cause: T;

    constructor(message: string, selector: T) {
        super(message);

        this.cause = selector;
    }
}

export default RecordNotFoundException;
