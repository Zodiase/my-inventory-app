import type { ReactElement } from 'react';
import { Box, Button, Heading } from 'grommet';
import { Home } from 'grommet-icons';

/**
 * NotFoundView component displays a 404 error message when user navigates to an invalid route.
 *
 * Features:
 * - Displays "Page not found" message
 * - Provides button to navigate back to home
 * - Uses Grommet UI components for consistent styling
 *
 * @returns NotFoundView component
 */
export const NotFoundView = (): ReactElement => {
    return (
        <Box fill align="center" justify="center" gap="medium" pad="large">
            <Heading level={2}>Page Not Found</Heading>
            <Heading level={4} color="text-weak">
                The page you're looking for doesn't exist.
            </Heading>
            <Button icon={<Home />} label="Go to Home" href="/" primary />
        </Box>
    );
};
