import * as MongoNpmModule from 'mongodb';
import { Mongo } from 'meteor/mongo';
export class NamedCollection<T extends MongoNpmModule.Document, U = T> extends Mongo.Collection<T, U> {
    readonly name: string;

    constructor(
        name: string,
        options?: {
            connection?: Record<string, unknown> | null | undefined;
            idGeneration?: string | undefined;
            transform?: (doc: T) => U;
            defineMutationMethods?: boolean | undefined;
        }
    ) {
        super(name, options);

        this.name = name;
    }
}

export default NamedCollection;
