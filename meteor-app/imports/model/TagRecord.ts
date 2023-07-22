import type CollectionItem from './CollectionItem';

export interface TagRecord extends CollectionItem {
    /**
     * ID of the parent tag.
     * If there is no parent, the value is '' (empty string).
     */
    parentTagId: string;

    /**
     * Name of the tag.
     */
    name: string;

    /**
     * Cached path of this tag.
     * When this tag is moved, this path is updated.
     * The beginning of the path is the first item of the array.
     * The array contains this tag itself (for searching purposes).
     */
    path: Array<{ _id: string; name: string }>;
}

export default TagRecord;
