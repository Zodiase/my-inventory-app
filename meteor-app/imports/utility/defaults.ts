/**
 * Applies missing default fields while preserving the target object's more specific type.
 * This module owns the type-level merge contract and its small mutation helper.
 */
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
    const result: Record<string, unknown> = target;

    for (const [key, value] of Object.entries(source)) {
        if (!Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = value;
        }
    }

    return result as Defaults<T, S>;
}
