/**
 * Compact projection for a logical container whose children are useful in its parent's view.
 * The real hierarchy stays intact: the legend links to the container and every child keeps
 * its own destination. Data loading and the decision to hoist belong outside this module.
 */
import { Box, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ReactElement } from 'react';
import styled from 'styled-components';
import { Link } from 'wouter';

import type { InventoryItem } from '/imports/model/InventoryItem';

const Group = styled.div`
    min-width: 0;
    margin: 4px 0;
`;

const GroupHeader = styled.div`
    display: flex;
    align-items: center;

    &::before,
    &::after {
        content: '';
        height: 12px;
        border-top: 1px solid rgba(127, 127, 127, 0.45);
    }

    &::before {
        width: 16px;
        flex: 0 0 16px;
        border-left: 1px solid rgba(127, 127, 127, 0.45);
        border-top-left-radius: 8px;
    }

    &::after {
        min-width: 12px;
        flex: 1;
        border-right: 1px solid rgba(127, 127, 127, 0.45);
        border-top-right-radius: 8px;
    }
`;

const LegendLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 0 7px;
    color: inherit;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }

    &:focus-visible {
        outline: 3px solid #007aff;
        outline-offset: 2px;
        border-radius: 2px;
    }
`;

const GroupBody = styled.div`
    padding: 4px 6px 6px;
    border-right: 1px solid rgba(127, 127, 127, 0.45);
    border-bottom: 1px solid rgba(127, 127, 127, 0.45);
    border-left: 1px solid rgba(127, 127, 127, 0.45);
    border-radius: 0 0 8px 8px;
`;

const ChildGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
    gap: 4px;
`;

const ChildLink = styled(Link)`
    display: block;
    height: 100%;
    min-width: 0;
    color: inherit;
    text-decoration: none;
    border-radius: 6px;

    &:hover {
        background: rgba(127, 127, 127, 0.1);
    }

    &:focus-visible {
        outline: 3px solid #007aff;
        outline-offset: 1px;
    }
`;

export interface HoistedContainerGroupProps {
    container: InventoryItem;
    items: InventoryItem[];
}

export const HoistedContainerGroup = ({ container, items }: HoistedContainerGroupProps): ReactElement => (
    <Group role="group" aria-label={`${container.name} contents`}>
        <GroupHeader data-testid="hoisted-container-heading">
            <LegendLink href={`/container/${container._id}`} aria-label={`Open container ${container.name}`}>
                <Folder size="small" color="brand" aria-hidden="true" />
                <Text weight="bold" truncate>
                    {container.name}
                </Text>
                <Text size="small" color="text-weak">
                    {items.length} {items.length === 1 ? 'location' : 'locations'}
                </Text>
                <Next size="small" color="text-weak" aria-hidden="true" />
            </LegendLink>
        </GroupHeader>
        <GroupBody>
            <ChildGrid role="list">
                {items.map((child) => (
                    <div key={child._id} role="listitem">
                        <ChildLink
                            href={child.isContainer ? `/container/${child._id}` : `/items/${child._id}`}
                            aria-label={child.isContainer ? `Open container ${child.name}` : `View item ${child.name}`}
                        >
                            <Box
                                direction="row"
                                align="center"
                                gap="small"
                                pad={{ horizontal: 'small', vertical: 'xsmall' }}
                                style={{ height: '100%', minHeight: '44px' }}
                            >
                                {child.isContainer && <Folder size="medium" color="brand" aria-hidden="true" />}
                                <Box flex style={{ minWidth: 0 }}>
                                    <Text weight={child.isContainer ? 'bold' : 'normal'} truncate>
                                        {child.name}
                                    </Text>
                                    {child.description !== undefined && child.description !== '' && (
                                        <Text size="small" color="text-weak" truncate>
                                            {child.description}
                                        </Text>
                                    )}
                                </Box>
                                {child.isContainer && <Next size="medium" color="text-weak" aria-hidden="true" />}
                            </Box>
                        </ChildLink>
                    </div>
                ))}
            </ChildGrid>
        </GroupBody>
    </Group>
);
