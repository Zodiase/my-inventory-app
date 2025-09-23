/**
 * ESLint Flat Configuration for Meteor + TypeScript + React Project
 *
 * This config uses the new ESLint flat configuration format with dynamic imports
 * to avoid Node.js module type warnings while maintaining compatibility with Meteor.
 *
 * Configuration order matters: later configs override earlier ones.
 *
 * Known Issues:
 * - You may see "Unable to resolve timers/promises" warnings during tests
 *   This is a harmless warning from @sinonjs/fake-timers in browser contexts
 *   See docs/KNOWN_ISSUES.md for details - all functionality works correctly
 */
export default (async () => {
    // Dynamic imports for all ESLint plugins and configs
    // Using dynamic imports allows ES module syntax without setting "type": "module" in package.json
    const meteor = (await import('eslint-plugin-meteor')).default;
    const typescriptEslint = (await import('@typescript-eslint/eslint-plugin')).default;
    const react = (await import('eslint-plugin-react')).default;
    const reactHooks = (await import('eslint-plugin-react-hooks')).default;
    const love = (await import('eslint-config-love')).default; // Strict TypeScript rules
    const prettier = (await import('eslint-config-prettier')).default; // Disables conflicting formatting rules
    const importPlugin = (await import('eslint-plugin-import')).default;
    const typescriptParser = (await import('@typescript-eslint/parser')).default;

    // Environment globals for browser, Node.js, and ES2021
    const globals = await import('globals');
    const globalsBrowser = globals.default.browser; // window, document, etc.
    const globalsNode = globals.default.node; // process, Buffer, etc.
    const globalsEs2021 = globals.default.es2021; // globalThis, etc.

    return [
        // 1. Apply eslint-config-love first - provides strict TypeScript rules
        // This is a single config object, not an array, so we include it directly
        love,

        // 2. Base configuration for all files
        {
            languageOptions: {
                parser: typescriptParser,
                parserOptions: {
                    allowImportExportEverywhere: true, // Meteor allows imports/exports everywhere
                    ecmaVersion: 'latest', // Use latest ECMAScript features
                    project: './tsconfig.json', // Use TypeScript project config
                    sourceType: 'module', // Treat files as ES modules
                },
                globals: {
                    // Merge environment globals (replaces old "env" config)
                    ...globalsBrowser, // browser: true
                    ...globalsNode, // node: true
                    ...globalsEs2021, // es2021: true
                },
            },
            settings: {
                'import/resolver': 'meteor', // Use Meteor-specific import resolver
                react: {
                    version: 'detect', // Auto-detect React version
                },
            },
        },

        // 3. Plugin configuration and custom rules
        {
            files: ['**/*.{js,ts,tsx}'], // Apply to JavaScript, TypeScript, and TSX files
            plugins: {
                // Register all plugins (replaces old "plugins" array)
                meteor, // Meteor-specific rules
                '@typescript-eslint': typescriptEslint, // TypeScript rules
                react, // React rules
                'react-hooks': reactHooks, // React Hooks rules
                import: importPlugin, // Import/export rules
            },
            rules: {
                // Custom rule overrides (less strict than love config for some rules)
                '@typescript-eslint/no-empty-interface': 'warn', // Warn instead of error
                '@typescript-eslint/no-unused-vars': 'warn', // Warn instead of error

                // Import rules
                'import/extensions': 'off', // Don't require file extensions
                'import/no-absolute-path': 'off', // Allow absolute paths (Meteor pattern)
                'import/order': [
                    // Enforce import order
                    'error',
                    {
                        groups: [
                            'builtin', // Node.js built-ins
                            'external', // npm packages
                            'parent', // ../
                            'sibling', // ./
                            'index', // ./index
                        ],
                        pathGroups: [
                            {
                                pattern: '/**', // Meteor absolute imports
                                group: 'parent',
                                position: 'before',
                            },
                        ],
                        alphabetize: {
                            order: 'asc', // Sort imports alphabetically
                            caseInsensitive: true, // Ignore case when sorting
                        },
                        'newlines-between': 'always', // Require newlines between groups
                    },
                ],
                'import/prefer-default-export': 'off', // Allow named exports

                // React rules
                'react/jsx-filename-extension': 'off', // Allow JSX in .ts/.tsx files

                // General JavaScript rules
                'func-names': 'off', // Allow anonymous functions
                'no-underscore-dangle': [
                    // Allow specific underscored names
                    'error',
                    {
                        allow: ['_id', '_ensureIndex'], // MongoDB/Meteor conventions
                    },
                ],
                'object-shorthand': [
                    // Prefer object shorthand
                    'error',
                    'always',
                    {
                        avoidQuotes: false, // Allow quoted shorthand
                    },
                ],
                'spaced-comment': 'off', // Don't enforce comment spacing
            },
        },

        // 4. Prettier config - MUST be last to override conflicting formatting rules
        prettier,

        // 5. File ignore patterns (replaces old .eslintignore file)
        {
            ignores: [
                'node_modules/**', // Dependencies
                '*.html', // HTML files
                '.meteor/**', // Meteor build files
                'eslint.config.mjs', // This config file itself
            ],
        },
    ];
})();
