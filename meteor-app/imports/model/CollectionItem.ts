export class CollectionItem {
    static _id: keyof CollectionItem = '_id';
    static createdAt: keyof CollectionItem = 'createdAt';
    static modifiedAt: keyof CollectionItem = 'modifiedAt';

    _id: string;

    /**
     * Date-time when this record was created.
     */
    createdAt: Date;

    /**
     * Date-time when this record was last modified.
     */
    modifiedAt: Date;

    constructor(defaultProps: Partial<CollectionItem> = {}) {
        const now = new Date();

        const { _id = '', createdAt = now, modifiedAt = now } = defaultProps;

        this._id = _id;
        this.createdAt = createdAt;
        this.modifiedAt = modifiedAt;
    }
}

export default CollectionItem;
