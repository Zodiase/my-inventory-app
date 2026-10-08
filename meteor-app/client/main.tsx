import { Meteor } from 'meteor/meteor';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ScannerAppRoot } from '/imports/ui/ScannerFoundation/ScannerAppRoot';
import { setupDiagnostics } from '/imports/utility/diagnostics';

setupDiagnostics();

Meteor.startup(() => {
    const reactRenderRootElement = document.getElementById('react-target');

    if (reactRenderRootElement === null) {
        throw new Error('React root not found.');
    }

    createRoot(reactRenderRootElement).render(<ScannerAppRoot />);
});
