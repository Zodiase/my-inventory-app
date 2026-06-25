export const uiTokens = {
    color: {
        brand: '#007aff',
        brandHover: '#0051d5',
        brandActive: '#004bb8',
        brandGhostHover: 'rgba(0, 122, 255, 0.08)',
        brandGhostActive: 'rgba(0, 122, 255, 0.15)',
        danger: '#ff3b30',
        dangerHover: '#e60000',
        dangerActive: '#cc0000',
        success: '#34c759',
        text: '#333333',
        textWeak: '#666666',
        textMuted: '#999999',
        border: '#dddddd',
        surface: '#f5f5f5',
        surfaceSubtle: '#f2f2f7',
        surfaceSubtleHover: '#e5e5ea',
        surfaceSubtleActive: '#d1d1d6',
        surfaceHover: '#cccccc',
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
    },
    font: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: '16px',
    },
    shadow: {
        raised: '0 1px 3px rgba(0, 0, 0, 0.12)',
        raisedHover: '0 2px 6px rgba(0, 0, 0, 0.15)',
        pressed: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
} as const;

// Grommet theme with iOS-style design and touch-friendly sizing.
export const theme = {
    global: {
        colors: {
            brand: uiTokens.color.brand,
            focus: uiTokens.color.brand,
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
    },
    button: {
        default: {
            padding: {
                vertical: '10px',
                horizontal: '20px',
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
            padding: 12px 16px;
        `,
    },
    textArea: {
        extend: `
            min-height: ${uiTokens.size.touchTarget};
            padding: 12px 16px;
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
