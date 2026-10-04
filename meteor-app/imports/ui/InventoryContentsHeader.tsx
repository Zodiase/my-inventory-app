/**
 * Shared contents-page heading and controls, independent of routing and Meteor.
 * Keeps inspection of the current container separate from child-list operations.
 */
import { Box, Button, Heading, Text } from 'grommet';
import { Add, Filter } from 'grommet-icons';
import React from 'react';

interface Props {
    title: string;
    identityLabel?: string;
    onDetails?: () => void;
    detailsRef?: (node: HTMLButtonElement | HTMLAnchorElement | null) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    onCreate: () => void;
}

export const InventoryContentsHeader = ({
    title,
    identityLabel,
    onDetails,
    detailsRef,
    showFilters,
    onToggleFilters,
    onCreate,
}: Props): React.ReactElement => (
    <Box direction="row" wrap align="center" justify="between" gap="small" margin={{ bottom: 'medium' }} flex={false}>
        <Box style={{ minWidth: 0, maxWidth: '100%' }}>
            <Box direction="row" wrap align="center" gap="small">
                <Heading level={2} margin="none" style={{ overflowWrap: 'anywhere' }}>
                    {title}
                </Heading>
                {onDetails !== undefined && (
                    <Button ref={detailsRef} label="Container details" onClick={onDetails} style={{ flexShrink: 0 }} />
                )}
            </Box>
            {identityLabel !== undefined && (
                <Text size="small" color="brand" weight="bold">
                    ID: {identityLabel}
                </Text>
            )}
        </Box>
        <Box direction="row" wrap gap="small" flex={false}>
            <Button
                icon={<Filter />}
                label={showFilters ? 'Hide Filters' : 'Add Filters'}
                onClick={onToggleFilters}
                secondary={!showFilters}
                primary={showFilters}
            />
            <Button icon={<Add />} label="Create Item" primary onClick={onCreate} />
        </Box>
    </Box>
);
