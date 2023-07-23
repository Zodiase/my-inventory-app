import { Box } from 'grommet';
import React, { type ReactElement, type ComponentProps } from 'react';

export interface SpacerProps {
    size?: ComponentProps<typeof Box>['basis'];
}

export const Spacer = ({ size, children, ...rootElementProps }: SpacerProps & ComponentProps<typeof Box>): ReactElement => {
    if (typeof size === 'undefined') {
        return <Box basis="0" flex={{ grow: 1, shrink: 1 }} alignSelf="stretch" {...rootElementProps} />;
    } else {
        return <Box basis={size} flex={{ grow: 0, shrink: 1 }} alignSelf="stretch" {...rootElementProps} />;
    }
};

const Toolbar = ({ children, ...rootElementProps }: ComponentProps<typeof Box>): ReactElement => {
    return (
        <Box align="start" gap="small" direction="row" flex={false} {...rootElementProps}>
            {children}
        </Box>
    );
};

export default Toolbar;
