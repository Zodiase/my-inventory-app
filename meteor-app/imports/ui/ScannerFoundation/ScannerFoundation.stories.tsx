/**
 * Publishes the interactive synthetic capture contract for independent browser
 * and visual review. Expectations live in story parameters, outside the render.
 */
import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { ScannerFoundationProof } from './ScannerFoundationProof';
const meta = {
    title: 'Scanner/Foundation',
    component: ScannerFoundationProof,
    parameters: {
        layout: 'fullscreen',
        review: {
            viewports: ['1280x720', '820x900', '390x844', '390x480'],
            textScale: [1, 1.25],
            purpose: 'Read-only interactive scanner framing and semantic dispatch foundation.',
            responsive: 'Controls wrap; document scrolls vertically. Status, outcomes and controls remain readable.',
            interactions: ['Focus, scan repeats, interruption recovery, log expansion, proof control scrolling, Exit.'],
            exclusions: ['Household writes, application integration, C850 qualification, actual QR screen scanning.'],
            expectations: [
                'Status, next step, last outcome and Exit stay readable; vertical scrolling is allowed.',
                'No horizontal document overflow. Touch targets are at least 44px; focus is visible.',
                'Interrupted input shows a discarded boundary recovery before any successful capture.',
                'A focused complete read-only mode command stays ready for the next scan; a real interruption shows explicit Resume.',
                'All actions and proof controls remain usable at 125% text. No hardware or saved-inventory claim.',
            ],
        },
    },
} satisfies Meta<typeof ScannerFoundationProof>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
