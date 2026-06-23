import { Meteor } from 'meteor/meteor';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';

import { BoundedBuffer } from './BoundedBuffer';

const MAX_ENTRIES = 200;

const errorsBuffer = new BoundedBuffer<unknown>(MAX_ENTRIES);
const warningsBuffer = new BoundedBuffer<unknown>(MAX_ENTRIES);
const exceptionsBuffer = new BoundedBuffer<unknown>(MAX_ENTRIES);
const rejectionsBuffer = new BoundedBuffer<unknown>(MAX_ENTRIES);

let isSetup = false;

export function setupDiagnostics(): void {
    if (!Meteor.isDevelopment || !Meteor.isClient || isSetup) {
        return;
    }
    isSetup = true;

    // Preserve original console
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: unknown[]): void => {
        errorsBuffer.push(args.length === 1 ? args[0] : args);
        originalConsoleError.apply(console, args);
    };

    console.warn = (...args: unknown[]): void => {
        warningsBuffer.push(args.length === 1 ? args[0] : args);
        originalConsoleWarn.apply(console, args);
    };

    window.addEventListener('error', (event) => {
        exceptionsBuffer.push({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error instanceof Error ? event.error.stack : String(event.error ?? ''),
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        rejectionsBuffer.push({
            reason: event.reason instanceof Error ? event.reason.stack : String(event.reason ?? ''),
        });
    });

    Object.assign(window, {
        __diagnostics: {
            get: () => ({
                errors: errorsBuffer.get(),
                warnings: warningsBuffer.get(),
                exceptions: exceptionsBuffer.get(),
                rejections: rejectionsBuffer.get(),
                route: window.location.pathname,
                counts: {
                    items: InventoryItemsCollection.find({ isContainer: { $ne: true } }).count(),
                    containers: InventoryItemsCollection.find({ isContainer: true }).count(),
                    tags: TagsCollection.find({}).count(),
                },
                timestamp: Date.now(),
            }),
            clear: () => {
                errorsBuffer.clear();
                warningsBuffer.clear();
                exceptionsBuffer.clear();
                rejectionsBuffer.clear();
            },
            version: '1',
        },
    });
}
