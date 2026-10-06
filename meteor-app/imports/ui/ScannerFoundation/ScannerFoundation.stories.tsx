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

export const ActionCodes: Story = {
    args: { actionCards: true },
    parameters: {
        review: {
            viewports: ['1280x720', '820x900', '390x844', '390x480'],
            textScale: [1, 1.25],
            purpose: 'Read-only scanner-operated action and synthetic fixture QR screen.',
            responsive:
                'Two action cards side by side when space permits; one column on narrow screens. Code content scrolls above a separate bottom capture row.',
            interactions: [
                'Start/Resume focus, native mode command then fixture, tap parity, interruptions, diagnostics disclosure, scroll to every card.',
            ],
            exclusions: ['Physical screen scanning, scanner settings, household writes, application integration.'],
            expectations: [
                'Primary session status, next step and read-only outcome are understandable without opening diagnostics.',
                'Human labels and matching tap buttons accompany genuine black-on-white square action QR codes with four-module quiet zones.',
                'Synthetic item/container/product test codes are a distinct group with no owned-inventory claim.',
                'Codes remain224px square, buttons at least44px high, labels readable at125% text; no horizontal document overflow.',
                'Each card and capture control remains reachable on narrow/short screens via the content scrollbar; diagnostics are closed initially.',
                'The capture field stays in a bottom row while code cards scroll within the remaining viewport; Start/Resume do not scroll the content. No automatic refocus after interruption.',
                'Capitalized commands remain rejected with an actionable visible reason; escaped raw text is local diagnostics only. Native iOS keyboard/visual viewport behavior requires physical retest.',
            ],
        },
    },
};
