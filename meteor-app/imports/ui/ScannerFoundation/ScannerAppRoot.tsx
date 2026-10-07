/**
 * Separates the temporary scanner route from the inventory application's hooks.
 * Entering the demo unmounts inventory subscriptions; leaving unmounts capture
 * listeners and in-memory fixtures. Ordinary inventory routing stays untouched.
 */
import React, { type ReactElement } from 'react';
import { useLocation } from 'wouter';

import { App } from '../App';

import { ScannerMoveDemo } from './ScannerMoveDemo';
export function ScannerAppRoot(): ReactElement {
    const [location, navigate] = useLocation();
    if (location === '/scanner/demo')
        return (
            <ScannerMoveDemo
                compactRecovery
                onLeave={() => {
                    navigate('/items');
                }}
            />
        );
    return <App />;
}
