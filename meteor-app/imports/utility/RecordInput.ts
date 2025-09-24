import type { CollectionItem } from '/imports/model/CollectionItem';

/**
 * Returns a type that is suitable for user input for creating a collection record.
 * Basically this removes the requirements on properties managed by the server.
 * Also all remaining properties are made optional.
 */
export type RecordInput<T> = Partial<Omit<T, keyof CollectionItem>>;

export default RecordInput;
