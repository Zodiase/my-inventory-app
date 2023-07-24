import { Box, Grid } from 'grommet';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useState, type ComponentProps, type ReactElement } from 'react';

import { type InventoryItem, InventoryItemsCollection } from '/imports/api/items';
import NotImplementedError from '/imports/model/NotImplementedError';

import ItemList from './ItemList';
import ItemView from './ItemView';

const AllItemsView = (rootElementProps: ComponentProps<'div'>): ReactElement => {
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
    const [selectedItem, setSelectedItem] = useState<null | InventoryItem>(() => null);
    const onSelectItemFromList = (event: { datum: InventoryItem; index?: number }): void => {
        setSelectedItem(event.datum);
    };

    return (
        <Grid
            {...rootElementProps}
            height="400px"
            rows={['xxsmall', 'auto']}
            columns={['medium', 'auto']}
            gap="small"
            areas={[
                { name: 'header', start: [0, 0], end: [1, 0] },
                { name: 'list', start: [0, 1], end: [0, 1] },
                { name: 'view', start: [1, 1], end: [1, 1] },
            ]}
        >
            <Box gridArea="header" background="brand">
                All Items View
            </Box>
            <ItemList
                gridArea="list"
                background="light-5"
                items={items}
                selectedItem={selectedItem?._id}
                onSelectItem={onSelectItemFromList}
            />
            <Box gridArea="view" background="light-2">
                <ItemView
                    item={selectedItem}
                    onUpdateItem={async (newItem) => {
                        // TODO: execute update.
                        console.log('onUpdateItem', newItem);
                        throw new NotImplementedError();
                    }}
                    onDeleteItem={async (item) => {
                        // TODO: execute deletion.
                        console.log('onDeleteItem', item);
                        throw new NotImplementedError();
                    }}
                />
            </Box>
        </Grid>
    );
};

export default AllItemsView;
