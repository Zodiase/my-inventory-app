import { Meteor } from 'meteor/meteor';

import type AnyAny from './AnyAny';
import type { Defaults, OptionalDefaults } from './defaults';
import createLogger from './Logger';
import type NamedCollection from './NamedCollection';

// const logger = createLogger(module);

type MeteorMethods<M extends Record<string, (...args: unknown[]) => unknown>> = {
    [K in keyof M]: (...args: Parameters<M[K]>) => Promise<Awaited<ReturnType<M[K]>>>;
};

export function asMeteorMethods<
    T extends NamedCollection<AnyAny>,
    M extends Record<string, (...args: AnyAny[]) => unknown>
>(collection: OptionalDefaults<T, MeteorMethods<M>>, methods: M): Defaults<T, MeteorMethods<M>> {
    const collectionLogger = createLogger({ id: collection.name });

    Meteor.methods(methods);

    const methodNames: Array<keyof M & string> = Object.keys(methods);

    return methodNames.reduce((col, funcName) => {
        if (Object.prototype.hasOwnProperty.call(col, funcName)) {
            collectionLogger.warn(`Meteor method name "${funcName}" collides with property of collection.`);
            return col;
        }

        const collectionName: string = collection.name;
        const methodLogger = createLogger({
            id: `Collection/${collectionName}/MeteorMethods/${funcName}`,
        });

        return Object.assign(col, {
            async [funcName](...args: AnyAny[]) {
                return await new Promise((resolve, reject) => {
                    methodLogger.log(`Calling Meteor.${funcName}`, { args });
                    Meteor.apply(funcName, args, {}, (error, result) => {
                        methodLogger.log(`Response from Meteor.${funcName}`, { args, error, result });
                        if (typeof error !== 'undefined') {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                });
            },
        });
    }, collection) as Defaults<T, MeteorMethods<M>>;
}

export default asMeteorMethods;
