import React from 'react';
import { Meteor } from 'meteor/meteor';
import { createRoot } from 'react-dom/client';
import { App } from '/imports/ui/App';

Meteor.startup(() => {
    const reactRenderRootElement = document.getElementById('react-target');

    if (reactRenderRootElement === null) {
        throw new Error('React root not found.');
    }

    createRoot(reactRenderRootElement).render(<App />);
});
