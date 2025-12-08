import { CollectionItem } from '/imports/model/CollectionItem';

/**
 * Creates a strict MongoDB/Meteor selector from a document by extracting specific fields.
 *
 * This function generates a selector object that includes the base CollectionItem fields
 * (_id, createdAt, modifiedAt) plus any additional fields you specify. This creates a
 * more restrictive query than using just an _id, which helps prevent race conditions
 * and ensures the document hasn't changed since it was read.
 *
 * @template T - The document type, must extend CollectionItem
 * @template F - The additional field names to include in the selector
 *
 * @param doc - The source document to extract field values from
 * @param extraFields - Array of additional field names to include in the selector (beyond base fields)
 *
 * @returns A selector object containing:
 *   - _id: The document's unique identifier
 *   - createdAt: When the document was created
 *   - modifiedAt: When the document was last modified
 *   - All fields specified in extraFields with their values from doc
 *
 * @example
 * ```typescript
 * const tag = { _id: '123', name: 'MyTag', createdAt: new Date(), modifiedAt: new Date() };
 * const selector = strictSelector(tag, ['name']);
 * // Returns: { _id: '123', createdAt: Date, modifiedAt: Date, name: 'MyTag' }
 *
 * // Use with Meteor collection update
 * await TagsCollection.updateAsync(selector, { $set: { name: 'NewName' } });
 * // Only updates if _id, createdAt, modifiedAt, and name all match
 * ```
 *
 * @remarks
 * This is particularly useful for update operations where you want to ensure the document
 * hasn't been modified by another process since you read it (optimistic locking pattern).
 */
export const strictSelector = <T extends CollectionItem, F extends keyof T>(
    doc: T,
    extraFields: F[] = []
): {
    [K in F | keyof CollectionItem]: T[K];
} => {
    const allFields: Array<keyof T> = [
        CollectionItem._id,
        CollectionItem.createdAt,
        CollectionItem.modifiedAt,
        ...extraFields,
    ];

    // Using `any` as accumulator type is necessary for dynamic property mapping
    // The return type is properly typed via the function signature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return allFields.reduce<any>((acc, field) => {
        return {
            ...acc,
            [field]: doc[field],
        };
    }, {}) as {
        [K in F | keyof CollectionItem]: T[K];
    };
};

export default strictSelector;
