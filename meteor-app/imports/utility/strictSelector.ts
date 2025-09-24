import { CollectionItem } from '/imports/model/CollectionItem';

export const strictSelector = <
    T extends CollectionItem,
    F extends keyof T
>(
    doc: T,
    extraFields: F[] = []
): {
    [K in F | keyof CollectionItem]: T[K];
} => {
    type R = {
        [K in F | keyof CollectionItem]: T[K];
    };
    
    const allFields: Array<keyof T> = [
        CollectionItem._id,
        CollectionItem.createdAt,
        CollectionItem.modifiedAt,
        ...extraFields,
    ];

    return allFields.reduce<Partial<R>>((acc, field) => {
        return {
            ...acc,
            [field]: doc[field],
        };
    }, {}) as R;
};

export default strictSelector;
