import { Box, NameValueList, NameValuePair } from 'grommet';
import React, { type ReactElement, type ComponentProps } from 'react';

import type InventoryItem from '../model/InventoryItem';

interface ItemViewProps {
    item: null | InventoryItem;
}

const ItemView = ({ item, ref, ...rootElementProps }: ItemViewProps & ComponentProps<typeof Box>): ReactElement => {
    if (item === null) {
        return <Box {...rootElementProps}></Box>;
    }

    return (
        <Box pad="small" {...rootElementProps}>
            <NameValueList valueProps={{ width: 'auto' }}>
                {Object.entries(item).map(([name, value]) => (
                    <NameValuePair key={name} name={name}>
                        {String(value)}
                    </NameValuePair>
                ))}
            </NameValueList>
        </Box>
    );
};

export default ItemView;
