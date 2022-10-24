import CollectionItem from './CollectionItem';

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
}

export default TagRecord;
