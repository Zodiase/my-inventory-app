import { Box, Heading, Text } from 'grommet';
import { Monitor } from 'grommet-icons';
import React, { type ReactElement, type ReactNode, useEffect, useState } from 'react';

/**
 * A hook to evaluate CSS media queries.
 */
function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return true;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = (): void => {
            setMatches(media.matches);
        };
        media.addEventListener('change', listener);
        return () => {
            media.removeEventListener('change', listener);
        };
    }, [query, matches]);

    return matches;
}

export interface DesktopOnlyProps {
    /** The content to display on desktop viewports. */
    children: ReactNode;
    /** Optional custom fallback content to display on mobile viewports. */
    fallback?: ReactNode;
}

/**
 * Conditionally renders children only on desktop viewports (>= 768px).
 * On smaller viewports, it renders a fallback view indicating that the feature
 * is best used on a computer.
 *
 * This pattern is useful for complex UI features (like import/export) where
 * the mobile experience is too limited or poor to justify support.
 */
export const DesktopOnly = ({ children, fallback }: DesktopOnlyProps): ReactElement | null => {
    // 768px is the standard breakpoint for tablets/desktops.
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Ensure we don't have hydration mismatch by returning null initially if needed,
    // but in Meteor we are usually client-side rendered.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    if (isDesktop) {
        return <>{children}</>;
    }

    if (fallback !== undefined && fallback !== null) {
        return <>{fallback}</>;
    }

    return (
        <Box
            fill
            align="center"
            justify="center"
            pad="large"
            background="light-1"
            style={{ minHeight: '100%', textAlign: 'center' }}
        >
            <Monitor size="xlarge" color="dark-4" />
            <Heading level="3" margin={{ top: 'medium', bottom: 'small' }}>
                Please use a computer
            </Heading>
            <Text color="dark-4" size="large">
                This feature is best used on a desktop device.
            </Text>
            <Text color="dark-5" margin={{ top: 'small' }}>
                Mobile filesystem access is limited and unreliable.
            </Text>
        </Box>
    );
};
