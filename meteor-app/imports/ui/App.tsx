import React, { ReactElement } from 'react';
import { Hello } from './Hello';
import { Info } from './Info';

export const App = (): ReactElement => (
    <div>
        <h1>Welcome to Meteor!</h1>
        <Hello />
        <Info />
    </div>
);
