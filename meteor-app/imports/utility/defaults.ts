export type Defaults<T, S> = T & {
    [K in Exclude<keyof S, keyof T>]: S[K];
};

export type OptionalDefaults<T, S> = T & {
    [K in Exclude<keyof S, keyof T>]?: S[K];
};

export function defaults<T extends Record<string, unknown>, S extends Record<string, unknown>>(
    target: T,
    source: S
): Defaults<T, S> {
    return Object.entries(source).reduce((t, [key, value]) => {
        if (Object.prototype.hasOwnProperty.call(t, key)) {
            return t;
        }

        return Object.assign(t, {
            [key]: value,
        });
    }, target) as Defaults<T, S>;
}
