import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';

export default [
    {
        files: ['**/*.{js,mjs,cjs,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            // Indentation: Use 4 spaces (not tabs)
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            
            // Code quality
            'no-unused-vars': 'off', // Disabled - allow unused variables
            'no-console': 'off', // Allow console for debugging
            'no-debugger': 'warn',
            
            // Best practices
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'brace-style': ['error', '1tbs'],
            
            // ES6+
            'prefer-const': 'error',
            'no-var': 'error',
            'arrow-spacing': 'error',
            
            // Spacing
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'space-before-blocks': 'error',
            'keyword-spacing': 'error',
            
            // Multi-line
            'object-curly-newline': ['error', { 'multiline': true, 'consistent': true }],
            'function-paren-newline': ['error', 'consistent']
        }
    },
    // Vue-specific configuration
    ...pluginVue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module'
            }
        },
        rules: {
            // Vue-specific rules
            'vue/multi-word-component-names': 'off',
            'vue/html-indent': ['error', 4],
            'vue/script-indent': ['error', 4, { 'baseIndent': 0, 'switchCase': 1 }],
            'vue/max-attributes-per-line': 'off', // Allow multiple attributes per line
            'vue/first-attribute-linebreak': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/component-name-in-template-casing': 'off', // Allow kebab-case for Vuetify components
            'vue/v-slot-style': 'off', // Allow both v-slot:name and #name syntax
            'vue/attributes-order': 'off', // Flexible attribute ordering
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/no-v-html': 'off', // Allow v-html for i18n translations with HTML
        }
    },
    {
        files: ['src/**/*.{js,vue}'],
        rules: {
            // Stricter rules for source code
        }
    },
    {
        files: ['tests/**/*.{js,vue}'],
        rules: {
            // Relaxed rules for tests
        }
    },
    {
        ignores: [
            'eslint.config.js',
            'node_modules/**',
            'dist/**',
            '*.min.js',
            'coverage/**',
            '.vite/**'
        ]
    }
];
