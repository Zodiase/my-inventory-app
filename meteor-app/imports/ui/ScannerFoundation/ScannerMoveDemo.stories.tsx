/**
 * Presents the app simulation component with an external visual review contract.
 * Story fixtures never connect to household inventory services.
 */
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';

import { ScannerMoveDemo } from './ScannerMoveDemo';
const meta = {
    title: 'Scanner/Move simulation',
    component: ScannerMoveDemo,
    parameters: {
        layout: 'fullscreen',
        review: {
            purpose: 'Destination-first, existing-item move simulation with shared capture and explicit recovery.',
            viewports: ['1280x720', '820x900', '390x844', '390x480'],
            textScale: [1, 1.25],
            responsive:
                'Session and action cards stack on phones. Workspace scrolls above reserved viewport capture dock.',
            expectations: [
                'When paused, an explicit44px Resume button sits beside the44px input in the reserved bottom dock; it stays visible at every content scroll position and125% text without automatic refocus.',
                'Simulation and no household writes clearly labeled; destination, next scan, outcome and Exit readable.',
                'Full224px QR including quiet zone reachable above dock; controls44px; no horizontal overflow.',
                'Populated location/result text wraps. No automatic focus restoration. Diagnostics start collapsed.',
            ],
            interactions: [
                'Start, Move, Resume, destination, successive items, repeat no-op, change destination, pause/resume and Exit.',
                'Scroll every action and test QR into view; manual note pauses capture; test delayed cancellation.',
            ],
            exclusions: [
                'Physical scanner qualification, native iOS keyboard, persistence, production security acceptance.',
            ],
        },
    },
} satisfies Meta<typeof ScannerMoveDemo>;
export default meta;
export const Interactive: StoryObj<typeof meta> = {};

function CompactRecoveryProof() {
    const [left, setLeft] = useState(false);
    return left ? (
        <main>
            <h1>Simulation left</h1>
            <p>Synthetic proof only. No household inventory changed.</p>
        </main>
    ) : (
        <ScannerMoveDemo
            compactRecovery
            onLeave={() => {
                setLeft(true);
            }}
        />
    );
}

export const CompactRecovery: StoryObj<typeof meta> = {
    render: () => <CompactRecoveryProof />,
    parameters: {
        review: {
            purpose: 'Storybook-only compact recovery and persistent Leave proposal; app/default unchanged.',
            viewports: ['1280x720', '820x900', '390x844', '390x480'],
            textScale: [1, 1.25],
            responsive:
                'Scrollable workspace reserves the dock; input and Resume remain adjacent, status and Leave share a second row.',
            expectations: [
                'Paused and Recovering guidance is fully visible without inner scrolling; only one current Resume instruction in the dock; discard guidance appears only for uncertain interrupted frames.',
                'Dock at most150px on390x480 normal/125%, including long outcomes retained in the scrollable session; every224px QR remains scroll-reachable.',
                'Input, Resume and Leave have44px targets and visible focus; no horizontal overflow or auto-refocus.',
                'Leave remains reachable at QR and diagnostics scroll positions and exits to synthetic landing state.',
                'Partial-input interruption still requires explicit Resume, discards first completed read and preserves ordinary field editing.',
            ],
            interactions: [
                'Start, partial-input Tab, scroll QR/diagnostics, Resume, first-read discard, second read, keyboard Leave.',
            ],
            exclusions: [
                'Actual app integration, native iOS keyboard, physical qualification, persistence, security/release acceptance.',
            ],
        },
    },
};
