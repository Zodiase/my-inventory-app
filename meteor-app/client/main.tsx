import { Meteor } from 'meteor/meteor';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ScannerAppRoot } from '/imports/ui/ScannerFoundation/ScannerAppRoot';
import { setupDiagnostics } from '/imports/utility/diagnostics';
import {
    captureDocumentRoot,
    captureRecoverableError,
    loadingCaptureEnabled,
} from '/imports/utility/e2eLoadingCapture';

setupDiagnostics();

Meteor.startup(() => {
    const reactRenderRootElement = document.getElementById('react-target');

    if (reactRenderRootElement === null) {
        throw new Error('React root not found.');
    }

    createRoot(
        reactRenderRootElement,
        loadingCaptureEnabled ? { onRecoverableError: captureRecoverableError } : undefined
    ).render(captureDocumentRoot(reactRenderRootElement, <ScannerAppRoot />));
});
