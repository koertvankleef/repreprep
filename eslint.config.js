import tseslint from 'typescript-eslint'
import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    rules: {
      // Prefer TypeScript-aware rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],

      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': ['warn'],

      // Consistency rules
      'semi': ['error', 'never'],
      'no-extra-semi': 'error',
      'semi-style': ['error', 'last'],
      'no-unexpected-multiline': 'error',

      // Console usage
      'no-console': 'warn',

      // Disallow secure-context-only crypto APIs in CI code
      'no-restricted-properties': ['error',
        {
          object: 'crypto',
          property: 'subtle',
          message: 'Do not use crypto.subtle. Use the ci-core hash helper instead.'
        },
        {
          object: 'crypto',
          property: 'randomUUID',
          message: 'Do not use crypto.randomUUID in CI code targeting non-secure contexts.'
        }
      ],

      'no-restricted-syntax': ['error',
        {
          selector: "MemberExpression[object.object.name='window'][object.property.name='crypto'][property.name='subtle']",
          message: 'Do not use window.crypto.subtle. Use the ci-core hash helper instead.'
        },
        {
          selector: "MemberExpression[object.object.name='globalThis'][object.property.name='crypto'][property.name='subtle']",
          message: 'Do not use globalThis.crypto.subtle. Use the ci-core hash helper instead.'
        },
        {
          selector: "CallExpression[callee.object.object.name='crypto'][callee.object.property.name='subtle'][callee.property.name='digest']",
          message: 'Do not use crypto.subtle.digest(). Use the ci-core hash helper instead.'
        },
        {
          selector: "CallExpression[callee.object.object.name='window'][callee.object.property.name='crypto'][callee.property.property.name='digest']",
          message: 'Do not use window.crypto.subtle.digest(). Use the ci-core hash helper instead.'
        },
        {
          selector: "CallExpression[callee.object.object.name='globalThis'][callee.object.property.name='crypto'][callee.property.property.name='digest']",
          message: 'Do not use globalThis.crypto.subtle.digest(). Use the ci-core hash helper instead.'
        }
      ]
    }
  },
  {
    files: ['**/*.test.ts'],
    plugins: {
      vitest
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals
      }
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/expect-expect': 'warn',
      // Tests use a custom wrapper (specIt) and helper no-op stubs.
      // Keep these quiet to avoid false positives and noisy warnings.
      'vitest/no-standalone-expect': 'off',
      '@typescript-eslint/no-empty-function': 'off'
    }
  },
  {
    files: ['src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off'
    }
  }
]