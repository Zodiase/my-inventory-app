/**
 * Responsive physical view for the supported five-tier bedside stack model.
 * It renders validated slots as navigation targets and exposes rejected data
 * plus the ordinary list representation so layout metadata never hides items.
 */
import { Box, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';
import { Link } from 'wouter';

import { getInventoryIdLabel, type InventoryIdentity } from '/imports/model/InventoryIdentity';
import type { InventoryItem } from '/imports/model/InventoryItem';
import { projectStackTowerItems } from '/imports/model/StructuredStorageLayout';

const StackGrid = styled.div`
    display: grid;
    gap: 0.5rem;
    width: 100%;
`;

const TierRow = styled.div`
    display: grid;
    grid-template-columns: minmax(2.75rem, auto) repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    align-items: stretch;
`;

const TierLabel = styled.div`
    align-self: center;
    color: #666;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
`;

const Slot = styled.div`
    min-width: 0;
    min-height: 4.75rem;
    border: 1px dashed #b6b6b6;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.55);
`;

const SlotLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 100%;
    min-height: 4.75rem;
    padding: 0.6rem;
    border: 1px solid #d7cdf5;
    border-radius: 0.5rem;
    background: #fff;
    color: inherit;
    text-decoration: none;

    &:hover {
        background: #f3efff;
    }

    &:focus-visible {
        outline: 3px solid #007aff;
        outline-offset: 2px;
    }
`;

const ItemName = styled.span`
    display: -webkit-box;
    min-width: 0;
    overflow: hidden;
    font-weight: 700;
    line-height: 1.2;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
`;

const CompactId = styled.span`
    color: #7d4cdb;
    font-size: 0.75rem;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EmptySlot = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 4.75rem;
    padding: 0.5rem;
    color: #777;
    font-size: 0.75rem;
    text-align: center;
`;

const AlternateList = styled.details`
    margin-top: 0.75rem;

    summary {
        min-height: 44px;
        cursor: pointer;
        font-weight: 700;
    }
`;

export interface StructuredStorageStackProps {
    containerName: string;
    items: InventoryItem[];
    identities: InventoryIdentity[];
    listFallback: ReactNode;
}

export const StructuredStorageStack = ({
    containerName,
    items,
    identities,
    listFallback,
}: StructuredStorageStackProps): ReactElement => {
    const projection = projectStackTowerItems(items);
    const identitiesByItemId = new Map(identities.map((binding) => [binding.itemId, binding.identity]));

    const renderSlot = (item: InventoryItem | undefined, tier: number, position: 'left' | 'right'): ReactElement => {
        if (item === undefined) {
            return (
                <Slot role="cell" key={position}>
                    <EmptySlot>Empty {position} slot</EmptySlot>
                </Slot>
            );
        }

        const identity = identitiesByItemId.get(item._id);
        const action = item.isContainer ? 'Open container' : 'View item';
        return (
            <Slot role="cell" key={position}>
                <SlotLink
                    href={item.isContainer ? `/container/${item._id}` : `/items/${item._id}`}
                    aria-label={`${action} ${item.name}, tier ${tier} ${position}`}
                >
                    {item.isContainer && <Folder size="small" color="brand" aria-hidden="true" />}
                    <Box flex style={{ minWidth: 0 }}>
                        <ItemName>{item.name}</ItemName>
                        {identity !== undefined && (
                            <CompactId data-testid={`stack-id-${item._id}`} title={identity.value}>
                                ID: {getInventoryIdLabel(identity, item.isContainer)}
                            </CompactId>
                        )}
                    </Box>
                    {item.isContainer && <Next size="small" color="text-weak" aria-hidden="true" />}
                </SlotLink>
            </Slot>
        );
    };

    return (
        <Box gap="small">
            <Box as="section" role="region" aria-label={`${containerName} physical layout`} gap="small">
                <Box direction="row" justify="between" align="end" gap="small">
                    <Text weight="bold">Physical layout</Text>
                    <Text size="small" color="text-weak">
                        Top to bottom
                    </Text>
                </Box>
                <StackGrid role="table" aria-label="Five tiers with left and right slots">
                    {projection.tiers.map(({ tier, slots }) => (
                        <TierRow role="row" aria-label={`Tier ${tier}`} key={tier}>
                            <TierLabel role="rowheader">Tier {tier}</TierLabel>
                            {renderSlot(slots.left, tier, 'left')}
                            {renderSlot(slots.right, tier, 'right')}
                        </TierRow>
                    ))}
                </StackGrid>
            </Box>

            {projection.fallbackItems.length > 0 && (
                <Box as="section" role="region" aria-label="Placement issues" gap="xsmall">
                    <Text weight="bold" size="small">
                        Placement needs attention
                    </Text>
                    {projection.fallbackItems.map((item) => (
                        <SlotLink
                            key={item._id}
                            href={item.isContainer ? `/container/${item._id}` : `/items/${item._id}`}
                            aria-label={`${item.isContainer ? 'Open container' : 'View item'} ${
                                item.name
                            }, placement needs attention`}
                        >
                            <Box flex style={{ minWidth: 0 }}>
                                <ItemName>{item.name}</ItemName>
                                <Text size="xsmall" color="text-weak">
                                    Unplaced, invalid, or duplicate slot
                                </Text>
                            </Box>
                        </SlotLink>
                    ))}
                </Box>
            )}

            <AlternateList>
                <summary>Show accessible list view</summary>
                {listFallback}
            </AlternateList>
        </Box>
    );
};
