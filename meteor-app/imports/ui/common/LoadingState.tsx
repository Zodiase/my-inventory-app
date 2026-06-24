import { Box, Spinner, Text } from 'grommet';
import React, { type ReactElement } from 'react';

interface LoadingStateProps {
    message?: string;
}

export const LoadingState = ({ message = 'Loading…' }: LoadingStateProps): ReactElement => {
    return (
        <Box align="center" justify="center" pad="medium" gap="small" direction="row">
            <Spinner />
            <Text color="dark-4">{message}</Text>
        </Box>
    );
};
