import React, { type ReactElement } from 'react';
import { Grommet } from 'grommet';

import { AllItemsView } from './AllItemsView';
import { AllTagsView } from './AllTagsView';

// Grommet theme with iOS-style design
const theme = {
    global: {
        colors: {
            brand: '#007aff', // iOS blue
            focus: '#007aff',
        },
        font: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: '16px',
        },
        control: {
            border: {
                radius: '8px',
            },
        },
    },
};

export const App = (): ReactElement => (
    <Grommet theme={theme} full>
        <div>
            <h1>Welcome to Meteor!</h1>
            <AllItemsView />
            <AllTagsView />
        </div>
    </Grommet>
);
