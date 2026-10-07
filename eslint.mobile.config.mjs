// Catches names used but never defined or imported in the two Expo apps. Metro bundles
// those without complaint and the app only crashes when the line runs on the phone.
// The apps have no ESLint of their own, so this borrows the dashboard's:
//   node client/node_modules/eslint/bin/eslint.js --no-config-lookup -c eslint.mobile.config.mjs collector community
import globals from './client/node_modules/globals/index.js';

export default [
  { ignores: ['**/node_modules/**', '**/android/**', '**/ios/**', '**/.expo/**', '**/dist/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly' },
    },
    rules: { 'no-undef': 'error' },
  },
];
