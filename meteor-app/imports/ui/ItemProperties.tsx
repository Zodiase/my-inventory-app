/**
 * Read-only presentation of the inventory model's supported structured properties.
 * Labels and formatting belong here; persistence, field editing and inferred facts do not.
 */
import { Box, Heading, Text } from 'grommet';
import React from 'react';

import type { PropertyValues } from '/imports/model/PropertyValues';

const CENTS_PER_DOLLAR = 100;
const ISO_DATE_LENGTH = 10;

type Entry = [string, string];
const money = (cents: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / CENTS_PER_DOLLAR);

export const ItemProperties = ({ properties }: { properties?: PropertyValues }): React.ReactElement | null => {
    if (properties === undefined) return null;
    const entries: Entry[] = [];
    const add = (label: string, value: string | number | boolean | undefined): void => {
        if (value !== undefined && value !== '')
            entries.push([label, typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)]);
    };
    add('Manufacturer', properties.make);
    add('Model', properties.model);
    add('Serial number', properties.serialNumber);
    if (properties.purchaseDate !== undefined)
        add('Purchase date', new Date(properties.purchaseDate).toISOString().slice(0, ISO_DATE_LENGTH));
    add('Purchased from', properties.purchaseFrom);
    if (properties.purchasePrice !== undefined) add('Purchase price', money(properties.purchasePrice));
    if (properties.marketValue !== undefined) add('Market value', money(properties.marketValue));
    add('Warranty', properties.warranty);
    add('Condition', properties.condition);
    add('Search aliases', properties.searchAliases?.join(', '));
    add('English search vocabulary', properties.searchVocabulary?.en?.join(', '));
    add('Chinese search vocabulary', properties.searchVocabulary?.zh?.join(', '));
    add('Japanese search vocabulary', properties.searchVocabulary?.ja?.join(', '));
    if (properties.childrenPresentation !== undefined) add('Contents presentation', 'Grouped in parent');
    add('Fixture type', properties.fixtureType);
    add('Structural section count', properties.structuralSectionCount);
    add('Structural section', properties.structuralSection);
    add('Observed empty', properties.observedEmpty);
    add('False front below sink', properties.falseFrontBelowSink);
    const layout = properties.storageLayout;
    if (layout !== undefined) {
        add('Storage layout model', layout.modelId);
        add('Storage tiers', layout.tierCount);
        add('Storage positions', layout.positions?.join(', '));
        add('Storage columns', layout.columns);
        add('Storage rows', layout.rows);
        add('Storage axis label', layout.axisLabel);
        layout.cells?.forEach((cell) => {
            add(
                `Slot ${cell.slotId}`,
                `${cell.label} — ${cell.kind === 'storage' ? 'Storage' : 'Non-storage'}; row ${cell.row}, column ${
                    cell.column
                }; spans ${cell.rowSpan ?? 1} row(s), ${cell.columnSpan ?? 1} column(s)`
            );
        });
    }
    const placement = properties.storagePlacement;
    if (placement !== undefined) {
        add('Placement model', placement.modelId);
        add('Placement tier', placement.tier);
        add('Placement position', placement.position);
        add('Placement slot', placement.slotId);
    }
    if (entries.length === 0) return null;
    return (
        <Box flex={false} gap="small">
            <Heading level={3} margin="none">
                Properties
            </Heading>
            <Box as="dl" margin="none" gap="small">
                {entries.map(([label, value]) => (
                    <Box key={label} flex={false}>
                        <Text as="dt" size="small" color="text-weak">
                            {label}
                        </Text>
                        <Text as="dd" margin="none" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {value}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};
