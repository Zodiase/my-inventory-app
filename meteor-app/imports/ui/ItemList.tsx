import { Box, Button, DataTable } from 'grommet';
import React, { type ReactElement, type ComponentProps, useMemo } from 'react';

import type InventoryItem from '../model/InventoryItem';
import Toolbar from './Toolbar';

interface ItemListProps {
    items: InventoryItem[];
    selectedItem: undefined | string;
    onSelectItem: ComponentProps<typeof DataTable<InventoryItem>>['onClickRow'];
}

const ItemList = ({
    items,
    selectedItem,
    onSelectItem,
    ref,
    ...rootElementProps
}: ItemListProps & ComponentProps<typeof Box>): ReactElement => {
    const rowProps = useMemo(() => {
        if (typeof selectedItem === 'undefined') {
            return {};
        }

        return {
            [selectedItem]: {
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
                    onClickRow={onSelectItem}
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
