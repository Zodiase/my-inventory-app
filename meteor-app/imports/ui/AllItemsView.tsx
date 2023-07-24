import { Box, Grid, Layer } from 'grommet';
import React, { type ComponentProps, type ReactElement } from 'react';

import CreateNewItemView from './CreateNewItemView';
import ItemList from './ItemList';
import { ItemsControllerProvider, useNewItemsController } from './ItemsViewController';
import ItemView from './ItemView';

const AllItemsView = (rootElementProps: ComponentProps<'div'>): ReactElement => {
    const itemsController = useNewItemsController();
    const { inCreateMode } = itemsController;

    return (
        <ItemsControllerProvider itemsController={itemsController}>
            <>
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
                    <ItemList gridArea="list" background="light-5" />
                    <Box gridArea="view" background="light-2">
                        <ItemView />
                    </Box>
                </Grid>
                {inCreateMode && (
                    <Layer position="center" modal responsive background="transparent">
                        <CreateNewItemView width="large" height="medium" background="light-1" />
                    </Layer>
                )}
            </>
        </ItemsControllerProvider>
    );
};

export default AllItemsView;
