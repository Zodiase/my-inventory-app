/**
 * Interactive review of the real application navigation chrome without Meteor.
 * Memory routing makes native-link selection and recovery observable without household data.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Grommet, Heading, Text } from 'grommet';
import React from 'react';
import { Router, useLocation } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { AppShell } from './AppShell';
import { DesignSystemGlobalStyle, theme } from './theme';

const NavigationReview = (): React.ReactElement => {
    const [location] = useLocation();
    return (
        <Grommet theme={theme}>
            <DesignSystemGlobalStyle />
            <Box height="100vh">
                <AppShell location={location}>
                    <Heading level={2}>
                        {location === '/items'
                            ? 'All Items'
                            : location === '/tags'
                            ? 'Tags'
                            : location === '/search'
                            ? 'Search'
                            : 'Data'}
                    </Heading>
                    <Text>Current route: {location}</Text>
                </AppShell>
            </Box>
        </Grommet>
    );
};

const meta: Meta<typeof NavigationReview> = {
    title: 'UI/AppShell',
    component: NavigationReview,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `Purpose: real hamburger navigation placement and native keyboard links.
Expected composition: menu opens immediately below the blue header, on the trigger side, with four readable links above the main content. It neither enlarges nor scrolls the document. Header, main content and search affordance remain reachable.
Required viewports: 390x844 phone, 820x900 tablet, 1280x720 desktop, 1600x1000 wide desktop, 640x720 and 641x720 breakpoint, 390x240 short compact view.
Responsive changes: header is 56px through width 640 and 60px above it. Menu remains anchored to its lower edge; a short viewport scrolls the menu internally to reach Data.
Interactions: open/close with the trigger; native Tab and Enter link activation; Escape closes navigation and returns focus to the trigger; link selection closes navigation and updates route; search route removes the hamburger; no horizontal/document overflow or browser error overlay.
Exclusions: household data, Meteor publications, other route content and outside-click dismissal.`,
            },
        },
    },
    decorators: [
        (Story) => {
            const { hook } = memoryLocation({ path: '/items' });
            return (
                <Router hook={hook}>
                    <Story />
                </Router>
            );
        },
    ],
};
export default meta;
type Story = StoryObj<typeof NavigationReview>;
export const Navigation: Story = {};
