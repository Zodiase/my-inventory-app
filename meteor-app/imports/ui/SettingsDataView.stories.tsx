import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'grommet';
import React from 'react';

import type { ImportReport } from '/imports/api/importExport/import';

import { SettingsDataViewPresentation, type SettingsDataViewProps } from './SettingsDataViewPresentation';

const meta: Meta<SettingsDataViewProps> = {
    title: 'UI/SettingsDataViewPresentation',
    component: SettingsDataViewPresentation,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box fill background="background-back" pad="medium">
                <Story />
            </Box>
        ),
    ],
} satisfies Meta<SettingsDataViewProps>;

export default meta;
type Story = StoryObj<SettingsDataViewProps>;

const mockReport: ImportReport = {
    toCreate: 10,
    exactDuplicates: 5,
    supersetMerges: 2,
    warnings: ['Dropped unsupported Heir property on row 1'],
    errors: [],
    info: ['Created implicit Category container'],
    samplePreview: [
        { action: 'create', name: 'Camping Tent' },
        { action: 'skip', name: 'Hammer', info: 'Exact duplicate' },
        { action: 'merge', name: 'Wrench', info: 'Merged missing fields' },
    ],
};

const mockReportWithError: ImportReport = {
    toCreate: 0,
    exactDuplicates: 0,
    supersetMerges: 0,
    warnings: [],
    errors: ['Invalid CSV format on row 5: missing name'],
    info: [],
    samplePreview: [],
};
const mockDryRunReport: ImportReport = {
    toCreate: 12,
    exactDuplicates: 3,
    supersetMerges: 1,
    warnings: [],
    errors: [],
    info: ['3× Bambu Lab AMS', '5× PLA Filament', '4× PETG Filament'],
    samplePreview: [
        { action: 'create', name: 'Bambu Lab AMS 1' },
        { action: 'create', name: 'Bambu Lab AMS 2' },
        { action: 'create', name: 'Bambu Lab AMS 3' },
        { action: 'skip', name: 'PLA Black', info: 'Exact duplicate' },
        { action: 'skip', name: 'PLA White', info: 'Exact duplicate' },
        { action: 'skip', name: 'PLA Red', info: 'Exact duplicate' },
        { action: 'merge', name: 'PETG Blue', info: 'Merged missing fields' },
    ],
};

const mockDelay = async (ms = 1000) => await new Promise((resolve) => setTimeout(resolve, ms));

export const Idle: Story = {
    args: {
        onExportJson: async () => {
            await mockDelay();
            return '{"version": 1, "items": [], "tags": []}';
        },
        onExportCsv: async () => {
            await mockDelay();
            return 'name,make\\nTest,Test';
        },
        onImport: async (_isCsv: boolean, _content: string, _dryRun: boolean) => {
            await mockDelay();
            return mockReport;
        },
    },
};

export const ExportError: Story = {
    args: {
        ...Idle.args,
        onExportJson: async () => {
            await mockDelay();
            throw new Error('Failed to connect to database');
        },
    },
};

export const ImportError: Story = {
    args: {
        ...Idle.args,
        onImport: async (_isCsv: boolean, _content: string, _dryRun: boolean) => {
            await mockDelay();
            throw new Error('Network timeout during upload');
        },
    },
};

export const ImportWithValidationErrors: Story = {
    args: {
        ...Idle.args,
        onImport: async (_isCsv: boolean, _content: string, _dryRun: boolean) => {
            await mockDelay();
            return mockReportWithError;
        },
    },
};

export const Loading: Story = {
    args: {
        ...Idle.args,
        _testState: {
            exportingJson: true,
        },
    },
};

export const DryRunPreview: Story = {
    args: {
        ...Idle.args,
        _testState: {
            importFile: { name: 'inventory-backup.csv' },
            importReport: mockDryRunReport,
        },
    },
};

export const Success: Story = {
    args: {
        ...Idle.args,
        _testState: {
            importFile: { name: 'inventory-backup.csv' },
            importSuccess: true,
        },
    },
};
