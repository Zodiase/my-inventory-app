/**
 * Reusable physical-layout metadata for structured storage fixtures.
 * This model is intentionally independent of rendering so queries and
 * conversational inventory answers can use placement data without a UI.
 */

export type StoragePosition = 'left' | 'right';

export interface StorageLayoutReference {
    modelId: string;
    tierCount: number;
    positions: StoragePosition[];
}

export interface StoragePlacement {
    modelId: string;
    tier: number;
    position: StoragePosition;
}
