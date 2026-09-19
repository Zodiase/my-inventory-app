/**
 * Shared import-result contract for API execution and presentation components.
 * Keep this model independent of Meteor so isolated UI builds can consume it.
 */
export interface ImportReport {
    toCreate: number;
    exactDuplicates: number;
    supersetMerges: number;
    warnings: string[];
    errors: string[];
    info: string[];
    samplePreview: Array<{ action: string; name: string; info?: string }>;
}
