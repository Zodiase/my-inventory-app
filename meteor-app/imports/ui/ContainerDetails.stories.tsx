/** Exercises the real contents header, list and own-details presentation without a database. */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Grommet, Text } from 'grommet';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
import { AppShell } from '/imports/ui/AppShell';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { InventoryContentsHeader } from '/imports/ui/InventoryContentsHeader';
import { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';
import { DesignSystemGlobalStyle, theme } from '/imports/ui/theme';

const date = new Date('2026-10-04');
const rack: InventoryItem = {
    _id: 'rack',
    name: 'Network rack',
    isContainer: true,
    tagIds: [],
    createdAt: date,
    modifiedAt: date,
    description:
        'Rack specifications and purchase history.\n' +
        'Full wrapping description. '.repeat(15) +
        '\nhttps://example.com/' +
        'product-reference'.repeat(20),
    properties: {
        make: 'SONGMICS',
        model: 'Rack prototype',
        purchaseDate: date,
        purchaseFrom: 'Amazon',
        purchasePrice: 12999,
        marketValue: 10000,
        warranty: 'Two years\nKeep the receipt',
        condition: 'Good',
        serialNumber: 'RACK-001',
        searchAliases: ['network cabinet'],
        searchVocabulary: { en: ['rack'], zh: ['机架'], ja: ['ラック'] },
        observedEmpty: false,
        structuralSectionCount: 3,
        structuralSection: false,
        falseFrontBelowSink: false,
        fixtureType: 'rack',
        childrenPresentation: 'hoist-in-parent',
        storageLayout: {
            modelId: 'stack-tower-2col-5tier-v1',
            tierCount: 5,
            positions: ['left', 'right'],
            columns: 2,
            rows: 3,
            axisLabel: 'Tiers',
            cells: [{ slotId: 'top', label: 'Top', row: 1, column: 1, kind: 'storage' }],
        },
        storagePlacement: { modelId: 'rack', tier: 1, position: 'left', slotId: 'top' },
    },
};
const child: InventoryItem = {
    ...rack,
    _id: 'pdu',
    name: 'Bypass PDU',
    isContainer: false,
    containerId: 'rack',
    description: 'Child PDU details',
    properties: undefined,
};
const Fixture = ({ variant = 'populated' }: { variant?: string }): React.ReactElement => {
    const [details, setDetails] = useState<InventoryItem | undefined>();
    const [filters, setFilters] = useState(false);
    const current =
        variant === 'minimal'
            ? { ...rack, description: undefined, properties: undefined }
            : variant === 'long-title'
            ? { ...rack, name: 'Network rack with a long title that remains readable in a narrow viewport' }
            : rack;
    return (
        <Grommet theme={theme} full>
            <DesignSystemGlobalStyle />
            <AppShell location="/items">
                {variant === 'loading' ? (
                    <LoadingState />
                ) : variant === 'missing' ? (
                    <Text>Container Not Found</Text>
                ) : details ? (
                    <Box fill style={{ minHeight: 0 }}>
                        <Box flex={false} align="start">
                            <Button
                                label="Back to contents"
                                onClick={() => {
                                    setDetails(undefined);
                                }}
                            />
                        </Box>
                        <ItemDetailViewPresentation item={details} />
                    </Box>
                ) : (
                    <Box fill style={{ minHeight: 0 }}>
                        <InventoryContentsHeader
                            detailsHref={`/items/${current._id}`}
                            title={variant === 'global' ? 'All Items' : current.name}
                            onDetails={
                                variant === 'global'
                                    ? undefined
                                    : () => {
                                          setDetails(current);
                                      }
                            }
                            showFilters={filters}
                            onToggleFilters={() => {
                                setFilters(!filters);
                            }}
                            onCreate={() => undefined}
                        />
                        {filters && (
                            <Box flex={false} pad="small" background="light-2">
                                <Text>Active contents filter</Text>
                            </Box>
                        )}
                        <AllItemsViewPresentation
                            items={['empty', 'filtered-empty'].includes(variant) ? [] : [child]}
                            containerPath={
                                variant === 'global'
                                    ? []
                                    : [
                                          variant === 'structured'
                                              ? {
                                                    ...rack,
                                                    properties: {
                                                        storageLayout: {
                                                            modelId: 'stack-tower-2col-5tier-v1',
                                                            tierCount: 5,
                                                            positions: ['left', 'right'],
                                                        },
                                                    },
                                                }
                                              : { ...current, properties: undefined },
                                      ]
                            }
                            onViewItemDetails={() => {
                                setDetails(child);
                            }}
                            onNavigateToContainer={() => undefined}
                            onBreadcrumbNavigate={() => undefined}
                        />
                    </Box>
                )}
            </AppShell>
        </Grommet>
    );
};
const meta = {
    title: 'Integration/ContainerDetails',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Inspect each story at1280×720,820×1180,1180×820,390×480. Current-container heading and labelled44px details action stay together, centered on wide rows and deliberately wrap on narrow screens. Filter/Create controls retain shared styling and remain reachable. Open details and return; full multiline description/URL and all supported properties wrap within a vertically scrollable detail region. Contents identity remains distinct from child PDU. Empty/filtered-empty and structured states retain entry; global/loading/missing have none. No database mutations; actual route/filter/scroll restoration belongs to app tests. Minimal suppresses blank sections. Long-title remains legible. Inspect focus and document overflow, all neighbors and shell.',
            },
        },
    },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Populated: Story = { render: () => <Fixture /> };
export const Empty: Story = { render: () => <Fixture variant="empty" /> };
export const FilteredEmpty: Story = { render: () => <Fixture variant="filtered-empty" /> };
export const Structured: Story = { render: () => <Fixture variant="structured" /> };
export const Minimal: Story = { render: () => <Fixture variant="minimal" /> };
export const LongTitle: Story = { render: () => <Fixture variant="long-title" /> };
export const Global: Story = { render: () => <Fixture variant="global" /> };
export const Loading: Story = { render: () => <Fixture variant="loading" /> };
export const Missing: Story = { render: () => <Fixture variant="missing" /> };
