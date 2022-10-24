import { Meteor } from 'meteor/meteor';
import { Defaults, OptionalDefaults } from './Defaults';

type MeteorMethods<M extends Record<string, (...args: any[]) => any>> = {
    [K in keyof M]: (...args: Parameters<M[K]>) => Promise<Awaited<ReturnType<M[K]>>>;
};

export function asMeteorMethods<T, M extends Record<string, (...args: any[]) => any>>(
    collection: OptionalDefaults<T, MeteorMethods<M>>,
    methods: M
): Defaults<T, MeteorMethods<M>> {
    Meteor.methods(methods);

    const methodNames: Array<keyof M & string> = Object.keys(methods);

    return methodNames.reduce((col, funcName) => {
        if (Object.prototype.hasOwnProperty.call(col, funcName)) {
            console.warn(`Meteor method name "${funcName}" collides with method of collection.`, col);
            return col;
        }

        return Object.assign(col, {
            async [funcName](...args: any[]) {
                return await new Promise((resolve, reject) => {
                    console.log(`Calling Meteor.${funcName}`, { args });
                    Meteor.apply(funcName, args, {}, (error, result) => {
                        console.log(`Response from Meteor.${funcName}`, { args, error, result });
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
