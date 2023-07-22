import { useTracker } from 'meteor/react-meteor-data';
import React, { type ComponentProps, type ReactElement } from 'react';
import styled from 'styled-components';

import { InventoryItemsCollection } from '/imports/api/items';

interface ItemListProps {
    //!
}

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
                {items.map((item) => (
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
