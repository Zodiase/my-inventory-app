import { CollectionItem } from '/imports/model/CollectionItem';

export const strictSelector = <
    T extends CollectionItem,
    F extends keyof T,
    R = {
        [K in F | keyof CollectionItem]: T[K];
    }
>(
    doc: T,
    extraFields: F[] = []
): R => {
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
