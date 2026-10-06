/**
 * Presents the app simulation component with an external visual review contract.
 * Story fixtures never connect to household inventory services.
 */
import type { Meta, StoryObj } from '@storybook/react-webpack5';

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
