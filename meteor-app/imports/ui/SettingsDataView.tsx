/** Connects import/export presentation callbacks to Meteor methods. */
import { Meteor } from 'meteor/meteor';
import React, { type ReactElement } from 'react';

import type { ImportReport } from '/imports/model/ImportReport';

import { DesktopOnly } from './DesktopOnly';
import { SettingsDataViewPresentation } from './SettingsDataViewPresentation';

export const SettingsDataView = (): ReactElement => {
    const handleExportJson = async (): Promise<string> => {
        const result: unknown = await Meteor.callAsync('inventory.export.json');
        if (typeof result !== 'string') throw new Error('JSON export returned an invalid response.');
        return result;
    };

    const handleExportCsv = async (): Promise<string> => {
        const result: unknown = await Meteor.callAsync('inventory.export.csv', { umrCompat: false });
        if (typeof result !== 'string') throw new Error('CSV export returned an invalid response.');
        return result;
    };

    const handleImport = async (isCsv: boolean, content: string, dryRun: boolean): Promise<ImportReport> => {
        const method = isCsv ? 'inventory.import.csv' : 'inventory.import.json';
        const result: unknown = await Meteor.callAsync(method, content, { dryRun });
        if (typeof result !== 'object' || result === null) throw new Error('Import returned an invalid response.');
        return result as ImportReport;
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
