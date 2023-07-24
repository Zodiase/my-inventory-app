import { Box, Button, DataTable } from 'grommet';
import React, { type ReactElement, type ComponentProps, useMemo } from 'react';

import { useItemsController } from './ItemsViewController';
import Toolbar from './Toolbar';

interface ItemListProps {}

const ItemList = ({ ...rootElementProps }: ItemListProps & ComponentProps<typeof Box>): ReactElement => {
    const { items, selectedItem, setSelectedItem } = useItemsController();
    const rowProps = useMemo(() => {
        if (typeof selectedItem === 'undefined') {
            return {};
        }

        return {
            [selectedItem._id]: {
                background: 'dark-1',
            },
        };
    }, [selectedItem]);

    return (
        <Box pad="xsmall" gap="small" {...rootElementProps}>
            <Box
                flex={{
                    grow: 1,
                    shrink: 1,
                }}
                overflow="auto"
            >
                <DataTable
                    primaryKey="_id"
                    pin={true}
                    replace={true}
                    columns={[
                        {
                            property: 'name',
                            header: 'Name',
                        },
                    ]}
                    // rowDetails={(row) => row._id}
                    rowProps={rowProps}
                    data={items}
                    sortable={false}
                    onClickRow={(event) => {
                        setSelectedItem(event.datum);
                    }}
                />
            </Box>
            <Toolbar
                flex={{
                    grow: 0,
                    shrink: 0,
                }}
            >
                <Button secondary={true} label="Create" />
            </Toolbar>
        </Box>
    );
};

export default ItemList;
