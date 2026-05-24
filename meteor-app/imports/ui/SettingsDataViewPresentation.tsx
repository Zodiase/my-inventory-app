import { Box, Heading, Text, Card, CardBody, CardHeader } from 'grommet';
import { DocumentDownload, DocumentUpload } from 'grommet-icons';
import React, { useState, type ReactElement, useRef } from 'react';

import type { ImportReport } from '/imports/api/importExport/import';
import { TouchButton } from '/imports/ui/TouchButton';

export interface SettingsDataViewProps {
    onExportJson: () => Promise<string>;
    onExportCsv: () => Promise<string>;
    onImport: (isCsv: boolean, content: string, dryRun: boolean) => Promise<ImportReport>;
    _testState?: {
        exportingJson?: boolean;
        importing?: boolean;
        importFile?: { name: string } | null;
        importReport?: ImportReport | null;
        importSuccess?: boolean;
    };
}

export const SettingsDataViewPresentation = ({
    onExportJson,
    onExportCsv,
    onImport,
    _testState,
}: SettingsDataViewProps): ReactElement => {
    const [exportingJson, setExportingJson] = useState(_testState?.exportingJson ?? false);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const [importFile, setImportFile] = useState<File | { name: string } | null>(_testState?.importFile ?? null);
    const [importContent, setImportContent] = useState<string | null>(null);
    const [importing, setImporting] = useState(_testState?.importing ?? false);
    const [importReport, setImportReport] = useState<ImportReport | null>(_testState?.importReport ?? null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(_testState?.importSuccess ?? false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadBlob = (data: string, filename: string, type: string): void => {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getFormattedDate = (): string => {
        const iso = new Date().toISOString();
        return iso.split('T')[0];
    };

    const handleExportJson = async (): Promise<void> => {
        try {
            setExportingJson(true);
            setExportError(null);
            const data = await onExportJson();
            downloadBlob(data, `inventory-${getFormattedDate()}.json`, 'application/json');
        } catch (err: unknown) {
            setExportError(err instanceof Error ? err.message : String(err));
        } finally {
            setExportingJson(false);
        }
    };

    const handleExportCsv = async (): Promise<void> => {
        try {
            setExportingCsv(true);
            setExportError(null);
            const data = await onExportCsv();
            downloadBlob(data, `inventory-${getFormattedDate()}.csv`, 'text/csv');
        } catch (err: unknown) {
            setExportError(err instanceof Error ? err.message : String(err));
        } finally {
            setExportingCsv(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (file == null) return;

        try {
            setImporting(true);
            setImportError(null);
            setImportReport(null);
            setImportSuccess(false);

            const text = await file.text();
            setImportFile(file);
            setImportContent(text);
        } catch (err: unknown) {
            setImportError(err instanceof Error ? err.message : String(err));
        } finally {
            setImporting(false);
            if (fileInputRef.current !== null) {
                fileInputRef.current.value = '';
            }
        }
    };

    const executeImport = async (dryRun: boolean): Promise<void> => {
        if (importFile === null || importContent === null) return;

        try {
            setImporting(true);
            setImportError(null);
            const isCsv = importFile.name.toLowerCase().endsWith('.csv');
            const report = await onImport(isCsv, importContent, dryRun);

            setImportReport(report);
            if (!dryRun) {
                setImportSuccess(true);
            }
        } catch (err: unknown) {
            setImportError(err instanceof Error ? err.message : String(err));
        } finally {
            setImporting(false);
        }
    };

    return (
        <Box gap="medium" pad={{ bottom: 'xlarge' }}>
            <Heading level="2" margin="none">
                Data Management
            </Heading>

            {/* Export Card */}
            <Card background="light-1" elevation="none" border={{ color: 'light-4' }}>
                <CardHeader pad="medium" background="light-2">
                    <Heading level="3" margin="none" size="small">
                        Export Data
                    </Heading>
                </CardHeader>
                <CardBody pad="medium" gap="medium">
                    <Text>
                        Download a full backup of your inventory, including items, tags, and container hierarchy.
                    </Text>
                    {exportError != null && (
                        <Text color="status-critical" size="small">
                            {exportError}
                        </Text>
                    )}
                    <Box direction="row" gap="small" wrap>
                        <TouchButton
                            variant="primary"
                            icon={<DocumentDownload />}
                            isLoading={exportingJson}
                            disabled={exportingCsv}
                            onClick={() => {
                                void handleExportJson();
                            }}
                        >
                            Download JSON
                        </TouchButton>
                        <TouchButton
                            variant="secondary"
                            icon={<DocumentDownload />}
                            isLoading={exportingCsv}
                            disabled={exportingJson}
                            onClick={() => {
                                void handleExportCsv();
                            }}
                        >
                            Download CSV
                        </TouchButton>
                    </Box>
                </CardBody>
            </Card>

            {/* Import Card */}
            <Card background="light-1" elevation="none" border={{ color: 'light-4' }}>
                <CardHeader pad="medium" background="light-2">
                    <Heading level="3" margin="none" size="small">
                        Import Data
                    </Heading>
                </CardHeader>
                <CardBody pad="medium" gap="medium">
                    <Text>
                        Import items from a JSON or CSV file. Existing items with exact matches will be skipped or
                        merged.
                    </Text>

                    {importError != null && (
                        <Text color="status-critical" size="small">
                            {importError}
                        </Text>
                    )}

                    {importSuccess && (
                        <Box background="status-ok" pad="small" round="small">
                            <Text color="white">Import completed successfully!</Text>
                        </Box>
                    )}

                    <Box>
                        <input
                            type="file"
                            accept=".json,.csv"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={(e) => {
                                void handleFileChange(e);
                            }}
                        />
                        <Box direction="row" gap="medium" align="center">
                            <TouchButton
                                variant="secondary"
                                icon={<DocumentUpload />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                            >
                                Select File
                            </TouchButton>
                            {importFile != null && (
                                <Text size="small" weight="bold">
                                    {importFile.name}
                                </Text>
                            )}
                        </Box>
                    </Box>

                    {importFile != null && !importSuccess && importReport == null && (
                        <Box margin={{ top: 'small' }}>
                            <TouchButton
                                variant="primary"
                                isLoading={importing}
                                onClick={() => {
                                    void executeImport(true);
                                }}
                            >
                                Preview Import
                            </TouchButton>
                        </Box>
                    )}

                    {importReport != null && !importSuccess && (
                        <Box background="light-2" pad="medium" round="small" gap="small" margin={{ top: 'small' }}>
                            <Heading level="4" margin="none">
                                Preview Results
                            </Heading>

                            <Box direction="row" gap="medium" wrap>
                                <Box>
                                    <Text size="small" color="dark-3">
                                        To Create
                                    </Text>
                                    <Text size="large" weight="bold" color="status-ok">
                                        {importReport.toCreate}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text size="small" color="dark-3">
                                        To Merge
                                    </Text>
                                    <Text size="large" weight="bold" color="status-warning">
                                        {importReport.supersetMerges}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text size="small" color="dark-3">
                                        To Skip (Exact Duplicates)
                                    </Text>
                                    <Text size="large" weight="bold">
                                        {importReport.exactDuplicates}
                                    </Text>
                                </Box>
                            </Box>

                            {importReport.errors.length > 0 && (
                                <Box margin={{ top: 'small' }} gap="xsmall">
                                    <Text weight="bold" color="status-critical">
                                        Errors:
                                    </Text>
                                    {importReport.errors.map((err, i) => (
                                        <Text key={i} size="small" color="status-critical">
                                            • {err}
                                        </Text>
                                    ))}
                                </Box>
                            )}

                            {importReport.warnings.length > 0 && (
                                <Box margin={{ top: 'small' }} gap="xsmall">
                                    <Text weight="bold" color="status-warning">
                                        Warnings:
                                    </Text>
                                    {importReport.warnings.map((warn, i) => (
                                        <Text key={i} size="small" color="status-warning">
                                            • {warn}
                                        </Text>
                                    ))}
                                </Box>
                            )}

                            {importReport.samplePreview.length > 0 && (
                                <Box margin={{ top: 'small' }} gap="xsmall">
                                    <Text weight="bold">
                                        Sample Preview (first {importReport.samplePreview.length}):
                                    </Text>
                                    {importReport.samplePreview.map((s, i) => (
                                        <Text key={i} size="small">
                                            • [{s.action.toUpperCase()}] {s.name}{' '}
                                            {s.info !== undefined && s.info !== '' ? `(${s.info})` : ''}
                                        </Text>
                                    ))}
                                </Box>
                            )}

                            <Box margin={{ top: 'medium' }} direction="row" justify="end">
                                <TouchButton
                                    variant="primary"
                                    isLoading={importing}
                                    disabled={
                                        importReport.errors.length > 0 &&
                                        importReport.toCreate === 0 &&
                                        importReport.supersetMerges === 0
                                    }
                                    onClick={() => {
                                        void executeImport(false);
                                    }}
                                >
                                    Confirm Import
                                </TouchButton>
                            </Box>
                        </Box>
                    )}
                </CardBody>
            </Card>
        </Box>
    );
};
