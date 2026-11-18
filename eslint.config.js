import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Providers and their hooks live together; fast refresh falls back to a full reload there.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
)
