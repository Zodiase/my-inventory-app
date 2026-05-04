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
    const collectionName: string = collection.name;
    const methodNames: Array<keyof M & string> = Object.keys(methods);

    const namespacedMethods = methodNames.reduce<Record<string, (...args: AnyAny[]) => unknown>>((acc, funcName) => {
        acc[`${collectionName}.${funcName}`] = methods[funcName];
        return acc;
    }, {});

    if (Meteor.isServer) {
        // Register legacy unprefixed methods for backward compatibility.
        Meteor.methods(methods);
        // Register namespaced methods to match the API contract and current app/test usage.
        Meteor.methods(namespacedMethods);
    }

    return methodNames.reduce((col, funcName) => {
        if (Object.prototype.hasOwnProperty.call(col, funcName)) {
            collectionLogger.warn(`Meteor method name "${funcName}" collides with property of collection.`);
            return col;
        }

        const meteorMethodName = `${collectionName}.${funcName}`;
        const methodLogger = createLogger({
            id: `Collection/${collectionName}/MeteorMethods/${funcName}`,
        });

        return Object.assign(col, {
            async [funcName](...args: AnyAny[]) {
                return await new Promise((resolve, reject) => {
                    methodLogger.log(`Calling Meteor.${meteorMethodName}`, { args });
                    Meteor.apply(meteorMethodName, args, {}, (error, result) => {
                        methodLogger.log(`Response from Meteor.${meteorMethodName}`, { args, error, result });
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
