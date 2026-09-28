/**
 * Responsive application chrome for primary navigation.
 * Keeps the header landmark, desktop links, and mobile tab bar consistent across routes.
 */
import { Box, Button, Header, Main, Nav, Text } from 'grommet';
import { Apps, Configure, Menu, Search as SearchIcon, Tag as TagIcon } from 'grommet-icons';
import React, { type ReactElement, type ReactNode, useState } from 'react';
import { Link } from 'wouter';

interface AppShellProps {
    children: ReactNode;
    location: string;
    headerContent?: ReactNode;
    searchHref?: string;
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

export const AppShell = ({
    children,
    location,
    headerContent,
    searchHref = '/search',
}: AppShellProps): ReactElement => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isSearchRoute = location === '/search';

    return (
        <Box fill className="app-shell">
            <Header background="brand" pad={{ horizontal: 'medium', vertical: 'small' }} className="app-shell-header">
                <Box direction="row" align="center" gap="small" fill>
                    <Button
                        plain
                        icon={<Menu color="white" />}
                        aria-label="Open navigation menu"
                        aria-expanded={menuOpen}
                        onClick={() => {
                            setMenuOpen((open) => !open);
                        }}
                        className="app-shell-menu-button"
                    />
                    <Text as="span" color="white" weight="bold" className="app-shell-title">
                        Inventory
                    </Text>
                    <Box flex="grow" style={{ minWidth: 0 }} className="app-shell-header-content">
                        {headerContent}
                    </Box>
                    {!isSearchRoute && (
                        <Link href={searchHref} aria-label="Search inventory" className="app-shell-search-link">
                            <SearchIcon aria-hidden="true" />
                        </Link>
                    )}
                </Box>
            </Header>

            {menuOpen && (
                <Nav aria-label="Primary navigation" className="app-shell-menu">
                    {navItems.map((item) => {
                        const active = item.isActive(location);
                        if (item.href === '/search' && isSearchRoute) {
                            return (
                                <span
                                    key={item.href}
                                    aria-current="page"
                                    className="app-shell-menu-link app-shell-menu-link-active"
                                >
                                    <Box aria-hidden="true" className="app-shell-nav-link-icon">
                                        {item.icon}
                                    </Box>
                                    <Text as="span" weight="bold">
                                        {item.label}
                                    </Text>
                                </span>
                            );
                        }
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={getAriaCurrent(active)}
                                className={`app-shell-menu-link${active ? ' app-shell-menu-link-active' : ''}`}
                                onClick={() => {
                                    setMenuOpen(false);
                                }}
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
            )}

            <Main
                pad="medium"
                overflow="hidden"
                className="app-shell-main"
                style={{ WebkitOverflowScrolling: 'touch', minHeight: 0, flex: '1 1 0%' }}
            >
                {children}
            </Main>
        </Box>
    );
};
