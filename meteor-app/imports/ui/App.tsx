import React, { ReactElement } from 'react';

import { AllTagsView } from './AllTagsView';

export const App = (): ReactElement => (
    <div>
        <h1>Welcome to Meteor!</h1>
        <AllTagsView />
    </div>
);
