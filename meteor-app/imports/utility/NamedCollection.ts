import type { DDP } from 'meteor/ddp';
import { Mongo } from 'meteor/mongo';
import type * as MongoNpmModule from 'mongodb';
export class NamedCollection<T extends MongoNpmModule.Document, U = T> extends Mongo.Collection<T, U> {
    readonly name: string;

    constructor(
        name: string,
        options?: {
            connection?: DDP.DDPStatic | null | undefined;
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
