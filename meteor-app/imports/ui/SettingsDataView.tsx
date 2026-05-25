import { Meteor } from 'meteor/meteor';
import React, { type ReactElement } from 'react';

import type { ImportReport } from '/imports/api/importExport/import';

import { DesktopOnly } from './DesktopOnly';
import { SettingsDataViewPresentation } from './SettingsDataViewPresentation';

export const SettingsDataView = (): ReactElement => {
    const handleExportJson = async (): Promise<string> => {
        return await Meteor.callAsync('inventory.export.json');
    };

    const handleExportCsv = async (): Promise<string> => {
        return await Meteor.callAsync('inventory.export.csv', { umrCompat: false });
    };

    const handleImport = async (isCsv: boolean, content: string, dryRun: boolean): Promise<ImportReport> => {
        const method = isCsv ? 'inventory.import.csv' : 'inventory.import.json';
        return await Meteor.callAsync(method, content, { dryRun });
    };

    return (
        <DesktopOnly>
            <SettingsDataViewPresentation
                onExportJson={handleExportJson}
                onExportCsv={handleExportCsv}
                onImport={handleImport}
            />
        </DesktopOnly>
    );
};
