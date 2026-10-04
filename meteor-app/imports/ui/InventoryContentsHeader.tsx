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
    detailsHref?: string;
    detailsRef?: (node: HTMLButtonElement | HTMLAnchorElement | null) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    onCreate: () => void;
}

export const InventoryContentsHeader = ({
    title,
    identityLabel,
    onDetails,
    detailsHref,
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
                    <Button
                        ref={detailsRef}
                        href={detailsHref}
                        label="Container details"
                        onClick={(event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                            // Preserve native copy/open and modified activation. Only the
                            // ordinary same-tab journey retains in-memory contents state.
                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                                return;
                            event.preventDefault();
                            onDetails();
                        }}
                        style={{ flexShrink: 0, minHeight: 44, minWidth: 44 }}
                    />
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
                style={{ minHeight: 44, minWidth: 44, flexShrink: 0 }}
                secondary={!showFilters}
                primary={showFilters}
            />
            <Button
                icon={<Add />}
                label="Create Item"
                primary
                onClick={onCreate}
                style={{ minHeight: 44, minWidth: 44, flexShrink: 0 }}
            />
        </Box>
    </Box>
);
