import type { StorybookConfig } from '@storybook/react-webpack5';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
    stories: ['../imports/**/*.stories.@(js|jsx|mjs|ts|tsx)', '../imports/**/*.mdx'],
    addons: ['@storybook/addon-webpack5-compiler-swc', '@storybook/addon-docs', '@storybook/addon-onboarding'],
    framework: {
        name: '@storybook/react-webpack5',
        options: {},
    },
    // Configure webpack to support Meteor's absolute imports
    webpackFinal: async (config: any) => {
        // Support Meteor's absolute imports (paths starting with /)
        if (config.resolve) {
            config.resolve.alias = {
                ...config.resolve.alias,
                '/imports': resolve(__dirname, '../imports'),
            };
        }
        return config;
    },
};

export default config;
