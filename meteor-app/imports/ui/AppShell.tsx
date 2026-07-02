/**
 * Responsive application chrome for primary navigation.
 * Keeps the header landmark, desktop links, and mobile tab bar consistent across routes.
 */
import { Box, Header, Main, Nav, Text } from 'grommet';
import { Apps, Configure, Search as SearchIcon, Tag as TagIcon } from 'grommet-icons';
import React, { type ReactElement, type ReactNode } from 'react';
import { Link } from 'wouter';

interface AppShellProps {
    children: ReactNode;
    location: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: ReactElement;
    isActive: (location: string) => boolean;
}

const navItems: NavItem[] = [
    {
        href: '/items',
        label: 'Items',
        icon: <Apps />,
        isActive: (location) => location === '/' || location.startsWith('/items') || location.startsWith('/container'),
    },
    {
        href: '/tags',
        label: 'Tags',
        icon: <TagIcon />,
        isActive: (location) => location.startsWith('/tags'),
    },
    {
        href: '/search',
        label: 'Search',
        icon: <SearchIcon />,
        isActive: (location) => location.startsWith('/search'),
    },
    {
        href: '/settings/data',
        label: 'Data',
        icon: <Configure />,
        isActive: (location) => location.startsWith('/settings/data'),
    },
];

const getAriaCurrent = (active: boolean): 'page' | undefined => (active ? 'page' : undefined);

export const AppShell = ({ children, location }: AppShellProps): ReactElement => {
    return (
        <Box fill className="app-shell">
            <Header background="brand" pad={{ horizontal: 'medium', vertical: 'small' }} className="app-shell-header">
                <Text as="span" color="white" weight="bold" className="app-shell-title">
                    Inventory App
                </Text>
                <Nav
                    direction="row"
                    gap="xsmall"
                    aria-label="Desktop primary navigation"
                    className="app-shell-desktop-nav"
                >
                    {navItems.map((item) => {
                        const active = item.isActive(location);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={getAriaCurrent(active)}
                                className={`app-shell-nav-link${active ? ' app-shell-nav-link-active' : ''}`}
                            >
                                <Box aria-hidden="true" className="app-shell-nav-link-icon">
                                    {item.icon}
                                </Box>
                                <Text as="span" weight={active ? 'bold' : 'normal'}>
                                    {item.label}
                                </Text>
                            </Link>
                        );
                    })}
                </Nav>
            </Header>

            <Main
                pad="medium"
                overflow="hidden"
                className="app-shell-main"
                style={{ WebkitOverflowScrolling: 'touch', minHeight: 0, flex: '1 1 0%' }}
            >
                {children}
            </Main>

            <Nav
                direction="row"
                aria-label="Mobile primary navigation"
                className="app-shell-mobile-nav"
                data-testid="mobile-primary-navigation"
            >
                {navItems.map((item) => {
                    const active = item.isActive(location);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={getAriaCurrent(active)}
                            className={`app-shell-mobile-tab${active ? ' app-shell-mobile-tab-active' : ''}`}
                        >
                            <Box align="center" justify="center" gap="xxsmall" className="app-shell-mobile-tab-content">
                                {item.icon}
                                <Text size="xsmall" weight={active ? 'bold' : 'normal'}>
                                    {item.label}
                                </Text>
                            </Box>
                        </Link>
                    );
                })}
            </Nav>
        </Box>
    );
};
