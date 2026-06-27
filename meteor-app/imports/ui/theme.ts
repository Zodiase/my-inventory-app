import { createGlobalStyle } from 'styled-components';

export const uiTokens = {
    color: {
        canvas: '#ffffff',
        brand: '#007aff',
        brandHover: '#0051d5',
        brandActive: '#004bb8',
        brandSubtle: 'rgba(0, 122, 255, 0.1)',
        brandGhostHover: 'rgba(0, 122, 255, 0.08)',
        brandGhostActive: 'rgba(0, 122, 255, 0.15)',
        danger: '#ff3b30',
        dangerHover: '#e60000',
        dangerActive: '#cc0000',
        dangerSubtle: 'rgba(255, 59, 48, 0.1)',
        dangerSubtleStrong: 'rgba(255, 59, 48, 0.2)',
        success: '#34c759',
        successSubtle: '#e8f5e9',
        warning: '#ff9500',
        warningSubtle: '#fff3cd',
        warningText: '#856404',
        info: '#4a90e2',
        text: '#333333',
        textWeak: '#666666',
        textMuted: '#999999',
        textInverse: '#ffffff',
        textInverseWeak: 'rgba(255, 255, 255, 0.2)',
        textInverseWeakHover: 'rgba(255, 255, 255, 0.3)',
        textInverseWeakActive: 'rgba(255, 255, 255, 0.4)',
        border: '#dddddd',
        borderSubtle: '#eeeeee',
        borderStrong: '#d9dde4',
        surface: '#f5f5f5',
        surfaceRaised: '#ffffff',
        surfaceSunken: '#f7f8fa',
        surfaceSubtle: '#f2f2f7',
        surfaceSubtleHover: '#e5e5ea',
        surfaceSubtleActive: '#d1d1d6',
        surfaceHover: '#cccccc',
        overlayLight: 'rgba(255, 255, 255, 0.95)',
        scrimWeak: 'rgba(0, 0, 0, 0.05)',
        scrim: 'rgba(0, 0, 0, 0.1)',
        white: '#ffffff',
    },
    radius: {
        control: '8px',
        small: '4px',
        pill: '999px',
        round: '50%',
    },
    size: {
        touchTarget: '44px',
        mobileNav: '72px',
    },
    space: {
        none: '0',
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
        page: '16px',
    },
    font: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: '16px',
        sizeXSmall: '12px',
        sizeSmall: '14px',
        sizeMedium: '16px',
        sizeLarge: '20px',
        sizeTitle: '24px',
        weightRegular: 400,
        weightMedium: 500,
        weightSemibold: 600,
        lineHeightTight: 1.2,
        lineHeightBody: 1.4,
    },
    shadow: {
        raised: '0 1px 3px rgba(0, 0, 0, 0.12)',
        raisedHover: '0 2px 6px rgba(0, 0, 0, 0.15)',
        pressed: '0 1px 2px rgba(0, 0, 0, 0.1)',
        nav: '0 -2px 10px rgba(0, 0, 0, 0.08)',
        menu: '0 4px 16px rgba(0, 0, 0, 0.2)',
    },
    focus: {
        ring: '2px solid rgba(0, 122, 255, 0.45)',
        offset: '2px',
    },
    motion: {
        fast: '0.15s ease-out',
        standard: '0.2s ease-out',
    },
    zIndex: {
        nav: 20,
        overlay: 9999,
    },
} as const;

export const uiTokenCssVariables = {
    '--inventory-color-canvas': uiTokens.color.canvas,
    '--inventory-color-brand': uiTokens.color.brand,
    '--inventory-color-brand-subtle': uiTokens.color.brandSubtle,
    '--inventory-color-text': uiTokens.color.text,
    '--inventory-color-text-weak': uiTokens.color.textWeak,
    '--inventory-color-text-muted': uiTokens.color.textMuted,
    '--inventory-color-border': uiTokens.color.border,
    '--inventory-color-border-subtle': uiTokens.color.borderSubtle,
    '--inventory-color-surface': uiTokens.color.surface,
    '--inventory-color-surface-raised': uiTokens.color.surfaceRaised,
    '--inventory-font-family': uiTokens.font.family,
    '--inventory-font-size-body': uiTokens.font.size,
    '--inventory-radius-control': uiTokens.radius.control,
    '--inventory-size-touch-target': uiTokens.size.touchTarget,
    '--inventory-size-mobile-nav': uiTokens.size.mobileNav,
    '--inventory-shadow-nav': uiTokens.shadow.nav,
    '--inventory-focus-ring': uiTokens.focus.ring,
    '--inventory-focus-offset': uiTokens.focus.offset,
    '--inventory-z-nav': uiTokens.zIndex.nav,
} as const;

const cssVariableDeclarations = Object.entries(uiTokenCssVariables)
    .map(([name, value]) => `        ${name}: ${String(value)};`)
    .join('\n');

export const DesignSystemGlobalStyle = createGlobalStyle`
    :root {
${cssVariableDeclarations}
    }

    html {
        color-scheme: light;
        background: var(--inventory-color-canvas);
    }

    body {
        color: var(--inventory-color-text);
        background: var(--inventory-color-canvas);
        font-family: var(--inventory-font-family);
        font-size: var(--inventory-font-size-body);
    }

    :focus-visible {
        outline: var(--inventory-focus-ring);
        outline-offset: var(--inventory-focus-offset);
    }
`;

// Grommet theme with iOS-style design and touch-friendly sizing.
export const theme = {
    global: {
        colors: {
            brand: uiTokens.color.brand,
            focus: uiTokens.color.brand,
            'status-critical': uiTokens.color.danger,
            'status-ok': uiTokens.color.success,
            'status-warning': uiTokens.color.warning,
        },
        font: {
            family: uiTokens.font.family,
            size: uiTokens.font.size,
        },
        control: {
            border: {
                radius: uiTokens.radius.control,
            },
        },
        edgeSize: {
            xsmall: uiTokens.space.xs,
            small: uiTokens.space.sm,
            medium: uiTokens.space.lg,
            large: uiTokens.space.xxl,
        },
    },
    button: {
        default: {
            padding: {
                vertical: uiTokens.space.md,
                horizontal: uiTokens.space.xl,
            },
        },
        border: {
            radius: uiTokens.radius.control,
        },
    },
    formField: {
        border: false,
        content: {
            pad: { vertical: 'small' },
        },
    },
    textInput: {
        extend: `
            min-height: ${uiTokens.size.touchTarget};
            padding: ${uiTokens.space.md} ${uiTokens.space.lg};
        `,
    },
    textArea: {
        extend: `
            min-height: ${uiTokens.size.touchTarget};
            padding: ${uiTokens.space.md} ${uiTokens.space.lg};
        `,
    },
    select: {
        container: {
            extend: `
                min-height: ${uiTokens.size.touchTarget};
            `,
        },
    },
};
