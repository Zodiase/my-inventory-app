/**
 * Responsive physical views for supported household storage fixtures.
 * It renders validated structural sections as navigation targets while keeping
 * rejected data and the ordinary list representation visible as fallbacks.
 */
import { Box, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';
import { Link } from 'wouter';

import { getInventoryIdLabel, type InventoryIdentity } from '/imports/model/InventoryIdentity';
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { PropertyValues } from '/imports/model/PropertyValues';
import {
    projectDeclarativeStorageItems,
    projectStackTowerItems,
    projectToiletRackItems,
    projectVanityItems,
    type StructuredStorageLayoutKind,
} from '/imports/model/StructuredStorageLayout';

const StackGrid = styled.div`
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
`;

const LayoutPanel = styled.section`
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1rem;
    border: 1px solid #d7cdf5;
    border-radius: 0.75rem;
    background: linear-gradient(180deg, #fbfaff 0%, #f7f4ff 100%);
    box-shadow: 0 0.2rem 0.75rem rgba(68, 44, 120, 0.1);
`;

const LayoutHeader = styled.div`
    display: flex;
    align-items: center;
    min-height: 2rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5def8;
`;

const LayoutBody = styled.div`
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    gap: 0.5rem;
    min-width: 0;
`;

const DirectionAxis = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
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

const VanityGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    grid-template-rows: repeat(3, minmax(4.75rem, auto));
    grid-template-areas:
        'drawer-1 false-front'
        'drawer-2 cabinet'
        'drawer-3 cabinet';
    gap: 0.5rem;
    min-width: 0;
`;

const VanityCell = styled.div<{ $area: string }>`
    grid-area: ${(props) => props.$area};
    min-width: 0;
`;

const FalseFront = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 4.75rem;
    padding: 0.75rem;
    border: 1px solid #c9c4d2;
    border-radius: 0.5rem;
    background: repeating-linear-gradient(135deg, #eeeaf4 0, #eeeaf4 8px, #f7f5fa 8px, #f7f5fa 16px);
    color: #68616f;
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
`;

const ShelfGrid = styled.div`
    display: grid;
    gap: 0.5rem;
    min-width: 0;
`;

const DeclarativeGrid = styled.div<{ $columns: number; $rows: number }>`
    display: grid;
    grid-template-columns: repeat(${(props) => props.$columns}, minmax(0, 1fr));
    grid-template-rows: repeat(${(props) => props.$rows}, minmax(4.75rem, auto));
    gap: 0.5rem;
    min-width: 0;
`;

const DeclarativeCell = styled.div<{ $row: number; $column: number; $rowSpan: number; $columnSpan: number }>`
    grid-row: ${(props) => `${props.$row} / span ${props.$rowSpan}`};
    grid-column: ${(props) => `${props.$column} / span ${props.$columnSpan}`};
    min-width: 0;
`;

const Slot = styled.div<{ $occupied: boolean }>`
    min-width: 0;
    height: 100%;
    min-height: 4.75rem;
    border: ${(props) => (props.$occupied ? 'none' : '1px dashed #aaa')};
    border-radius: 0.5rem;
    background: ${(props) => (props.$occupied ? 'transparent' : 'rgba(255, 255, 255, 0.72)')};
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
    box-shadow: 0 1px 3px rgba(68, 44, 120, 0.08);
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
    layoutKind: StructuredStorageLayoutKind;
    layout: PropertyValues['storageLayout'];
    items: InventoryItem[];
    identities: InventoryIdentity[];
    listFallback: ReactNode;
}

export const StructuredStorageStack = ({
    containerName,
    layoutKind,
    layout,
    items,
    identities,
    listFallback,
}: StructuredStorageStackProps): ReactElement => {
    const stackProjection = layoutKind === 'stack-tower' ? projectStackTowerItems(items) : undefined;
    const vanityProjection = layoutKind === 'vanity' ? projectVanityItems(items) : undefined;
    const rackProjection = layoutKind === 'over-toilet-rack' ? projectToiletRackItems(items) : undefined;
    const declarativeProjection =
        layoutKind === 'declarative' ? projectDeclarativeStorageItems(layout, items) : undefined;
    const fallbackItems =
        layoutKind === 'declarative'
            ? declarativeProjection?.fallbackItems ?? items
            : stackProjection?.fallbackItems ?? vanityProjection?.fallbackItems ?? rackProjection?.fallbackItems ?? [];
    const identitiesByItemId = new Map(identities.map((binding) => [binding.itemId, binding.identity]));

    const renderSlot = (item: InventoryItem | undefined, tier: number, position: 'left' | 'right'): ReactElement => {
        if (item === undefined) {
            return (
                <Slot role="cell" key={position} $occupied={false}>
                    <EmptySlot>Empty {position} slot</EmptySlot>
                </Slot>
            );
        }

        const identity = identitiesByItemId.get(item._id);
        const action = item.isContainer ? 'Open container' : 'View item';
        return (
            <Slot role="cell" key={position} $occupied>
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

    const renderFixtureSection = (
        item: InventoryItem | undefined,
        locationLabel: string,
        emptyLabel: string
    ): ReactElement => {
        if (item === undefined) {
            return (
                <Slot role="cell" $occupied={false}>
                    <EmptySlot>{emptyLabel}</EmptySlot>
                </Slot>
            );
        }

        const identity = identitiesByItemId.get(item._id);
        return (
            <Slot role="cell" $occupied>
                <SlotLink
                    href={item.isContainer ? `/container/${item._id}` : `/items/${item._id}`}
                    aria-label={`${item.isContainer ? 'Open container' : 'View item'} ${item.name}, ${locationLabel}`}
                >
                    {item.isContainer && <Folder size="small" color="brand" aria-hidden="true" />}
                    <Box flex style={{ minWidth: 0 }}>
                        <ItemName>{item.name}</ItemName>
                        {identity !== undefined && (
                            <CompactId title={identity.value}>
                                ID: {getInventoryIdLabel(identity, item.isContainer)}
                            </CompactId>
                        )}
                    </Box>
                    {item.isContainer && <Next size="small" color="text-weak" aria-hidden="true" />}
                </SlotLink>
            </Slot>
        );
    };

    const renderLayout = (): ReactElement => {
        if (layoutKind === 'declarative' && declarativeProjection !== undefined) {
            return (
                <LayoutBody>
                    {declarativeProjection.layout.axisLabel !== undefined ? (
                        <DirectionAxis aria-hidden="true">{declarativeProjection.layout.axisLabel}</DirectionAxis>
                    ) : (
                        <span />
                    )}
                    <DeclarativeGrid
                        $columns={declarativeProjection.layout.columns}
                        $rows={declarativeProjection.layout.rows}
                        role="table"
                        aria-label={`${containerName} physical arrangement`}
                    >
                        {declarativeProjection.cells.map((cell) => (
                            <DeclarativeCell
                                key={cell.slotId}
                                $row={cell.row}
                                $column={cell.column}
                                $rowSpan={cell.rowSpan ?? 1}
                                $columnSpan={cell.columnSpan ?? 1}
                            >
                                {cell.kind === 'non-storage' ? (
                                    <FalseFront>{cell.label}</FalseFront>
                                ) : (
                                    renderFixtureSection(
                                        declarativeProjection.itemsBySlot.get(cell.slotId),
                                        cell.label,
                                        `Empty ${cell.label}`
                                    )
                                )}
                            </DeclarativeCell>
                        ))}
                    </DeclarativeGrid>
                </LayoutBody>
            );
        }
        if (vanityProjection !== undefined) {
            return (
                <VanityGrid role="table" aria-label="Vanity storage with three drawers and an under-sink cabinet">
                    {vanityProjection.leftDrawers.map((drawer, index) => (
                        <VanityCell $area={`drawer-${index + 1}`} role="row" key={`drawer-${index + 1}`}>
                            {renderFixtureSection(
                                drawer,
                                `drawer ${index + 1} from top`,
                                `Empty drawer ${index + 1} slot`
                            )}
                        </VanityCell>
                    ))}
                    <VanityCell $area="false-front" role="row">
                        <FalseFront>False drawer front · non-storage</FalseFront>
                    </VanityCell>
                    <VanityCell $area="cabinet" role="row">
                        {renderFixtureSection(vanityProjection.underSink, 'under sink', 'Empty under-sink slot')}
                    </VanityCell>
                </VanityGrid>
            );
        }

        if (rackProjection !== undefined) {
            return (
                <LayoutBody>
                    <DirectionAxis aria-hidden="true">Top to bottom ↓</DirectionAxis>
                    <ShelfGrid role="table" aria-label="Four shelves ordered top to bottom">
                        {rackProjection.shelves.map((shelf, index) => (
                            <TierRow role="row" aria-label={`Shelf ${index + 1}`} key={`shelf-${index + 1}`}>
                                <TierLabel role="rowheader">Shelf {index + 1}</TierLabel>
                                <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                                    {renderFixtureSection(
                                        shelf,
                                        `shelf ${index + 1} from top`,
                                        `Empty shelf ${index + 1}`
                                    )}
                                </div>
                            </TierRow>
                        ))}
                    </ShelfGrid>
                </LayoutBody>
            );
        }

        return (
            <LayoutBody>
                <DirectionAxis aria-hidden="true">Top to bottom ↓</DirectionAxis>
                <StackGrid role="table" aria-label="Five tiers, ordered top to bottom, with left and right slots">
                    {stackProjection?.tiers.map(({ tier, slots }) => (
                        <TierRow role="row" aria-label={`Tier ${tier}`} key={tier}>
                            <TierLabel role="rowheader">Tier {tier}</TierLabel>
                            {renderSlot(slots.left, tier, 'left')}
                            {renderSlot(slots.right, tier, 'right')}
                        </TierRow>
                    ))}
                </StackGrid>
            </LayoutBody>
        );
    };

    return (
        <Box gap="small">
            <LayoutPanel role="region" aria-label={`${containerName} physical layout`}>
                <LayoutHeader>
                    <Text weight="bold">Physical layout</Text>
                </LayoutHeader>
                {renderLayout()}
            </LayoutPanel>

            {fallbackItems.length > 0 && (
                <Box as="section" role="region" aria-label="Placement issues" gap="xsmall">
                    <Text weight="bold" size="small">
                        Placement needs attention
                    </Text>
                    {fallbackItems.map((item) => (
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
