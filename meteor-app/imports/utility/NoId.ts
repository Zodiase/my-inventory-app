/**
 * Removes the requirement on property "_id".
 * This is useful when creating a new document to be inserted into a collection.
 */
export type NoId<T> = Omit<T, '_id'>;

export default NoId;
