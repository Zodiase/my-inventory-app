import CollectionItem from './CollectionItem';

export default interface LocationRecord extends CollectionItem {
    /**
     * Name of the location.
     */
    name: string;

    /**
     * Description of the location.
     */
    description: string;
}
