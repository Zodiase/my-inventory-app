import React, { type ComponentProps, type ReactElement } from 'react';
import styled from 'styled-components';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import { useTracker } from '/imports/utility/reactMeteorData';

// Empty props interface - component has no specific props currently
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ItemListProps {}

const ItemList = styled(({ ...rootElementProps }: ItemListProps & ComponentProps<'div'>): ReactElement => {
    const items = useTracker(
        () =>
            InventoryItemsCollection.find(
                {
                    //!
                },
                {
                    sort: [
                        ['name', 'asc'],
                        ['createdAt', 'asc'],
                    ],
                }
            ).fetch(),
        []
    );

    return (
        <div {...rootElementProps}>
            <div>All items</div>
            <ul className="item-list" data-items-count={items.length}>
                {items.map((item: InventoryItem) => (
                    <li key={item._id}>
                        <div className="item-body" data-item-id={item._id}>
                            <label className="item-name-label">{item.name}</label>
                            <span className="tag-actions-container"></span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
})``;

export const AllItemsView = styled((rootElementProps: ComponentProps<'div'>): ReactElement => {
    return (
        <div {...rootElementProps}>
            <ItemList />
        </div>
    );
})`
    ${ItemList} {
    }
`;
