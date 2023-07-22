import React, { type ReactElement } from 'react';

import AllItemsView from './AllItemsView';
import { AllTagsView } from './AllTagsView';

export const App = (): ReactElement => (
    <div>
        <h1>Welcome to Meteor!</h1>
        <AllItemsView />
        <AllTagsView />
    </div>
);
