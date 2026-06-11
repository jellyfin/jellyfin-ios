/**
 * Copyright (c) 2025 Jellyfin Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const babelParser = require('@babel/eslint-parser');
const js = require('@eslint/js');
const comments = require('@eslint-community/eslint-plugin-eslint-comments/configs');
const stylistic = require('@stylistic/eslint-plugin');
const compat = require('eslint-plugin-compat');
const importPlugin = require('eslint-plugin-import');
const jest = require('eslint-plugin-jest');
const promise = require('eslint-plugin-promise');
const react = require('eslint-plugin-react');
const globals = require('globals');
const tseslint = require('typescript-eslint');

// Formatting rules (moved out of ESLint core into @stylistic in v9)
const styleRules = {
	'@stylistic/jsx-quotes': [ 'error', 'prefer-single' ],
	'@stylistic/array-bracket-spacing': [ 'error', 'always', { objectsInArrays: false, arraysInArrays: false }],
	'@stylistic/arrow-spacing': [ 'error' ],
	'@stylistic/block-spacing': [ 'error' ],
	'@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true }],
	'@stylistic/comma-dangle': [ 'error', 'never' ],
	'@stylistic/comma-spacing': [ 'error' ],
	'@stylistic/dot-location': [ 'error', 'property' ],
	'@stylistic/eol-last': [ 'error' ],
	'@stylistic/indent': [ 'error', 'tab', { SwitchCase: 1 }],
	'@stylistic/key-spacing': [ 'error' ],
	'@stylistic/keyword-spacing': [ 'error' ],
	'@stylistic/max-statements-per-line': [ 'error' ],
	'@stylistic/no-floating-decimal': [ 'error' ],
	'@stylistic/no-multi-spaces': [ 'error' ],
	'@stylistic/no-multiple-empty-lines': [ 'error', { max: 1 }],
	'@stylistic/no-trailing-spaces': [ 'error' ],
	'@stylistic/object-curly-spacing': [ 'error', 'always' ],
	'@stylistic/padded-blocks': [ 'error', 'never' ],
	'@stylistic/quote-props': [ 'error', 'as-needed' ],
	'@stylistic/quotes': [ 'error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
	'@stylistic/semi': [ 'error' ],
	'@stylistic/space-before-blocks': [ 'error' ],
	'@stylistic/space-before-function-paren': [ 'error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
	'@stylistic/space-in-parens': [ 'error' ],
	'@stylistic/space-infix-ops': [ 'error' ]
};

// Logical rules that remain in ESLint core / plugins
const logicRules = {
	'react/prop-types': [ 'error' ],
	'import/no-named-as-default': 'off',
	'import/no-named-as-default-member': 'off',
	// These three resolve imports by parsing the target package's source (incl.
	// node_modules like react-native, whose Flow source the parser can't read).
	// TypeScript and the bundler already validate imports, so they are redundant.
	'import/named': 'off',
	'import/namespace': 'off',
	'import/default': 'off',
	'import/order': [ 'error', {
		alphabetize: { order: 'asc', caseInsensitive: true },
		'newlines-between': 'always-and-inside-groups'
	}],
	'array-callback-return': [ 'error' ],
	curly: [ 'error', 'multi-line' ],
	'default-case-last': [ 'error' ],
	'max-params': [ 'error', { max: 7 }],
	'no-duplicate-imports': [ 'error' ],
	'no-empty-function': [ 'error' ],
	'no-nested-ternary': [ 'error' ],
	'no-redeclare': [ 'error' ],
	'no-sequences': [ 'error' ],
	'no-shadow': [ 'error' ],
	'no-throw-literal': [ 'error' ],
	'no-unreachable': [ 'error' ],
	'no-unused-expressions': [ 'error', { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }],
	'no-unused-vars': [ 'error', { ignoreRestSiblings: true }],
	'no-var': [ 'error' ],
	'no-void': [ 'error', { allowAsStatement: true }],
	'one-var': [ 'error', 'never' ],
	'prefer-const': [ 'error', { destructuring: 'all' }],
	radix: [ 'error' ],
	yoda: [ 'error' ]
};

module.exports = [
	{ ignores: [ 'coverage/**', 'node_modules/**', 'ios/**', 'android/**', 'dist/**', 'web-build/**', '.expo/**' ] },
	js.configs.recommended,
	react.configs.flat.recommended,
	promise.configs['flat/recommended'],
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	comments.recommended,
	{ settings: { react: { version: 'detect' } } },

	// Base JavaScript config
	{
		files: [ '**/*.js', '**/*.jsx' ],
		plugins: {
			'@stylistic': stylistic
		},
		languageOptions: {
			parser: babelParser,
			parserOptions: {
				requireConfigFile: false,
				ecmaFeatures: { jsx: true },
				ecmaVersion: 2020,
				sourceType: 'module',
				babelOptions: { presets: [ 'babel-preset-expo' ] }
			},
			globals: {
				...globals.node,
				__DEV__: 'readonly',
				AbortController: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly'
			}
		},
		settings: {
			react: { version: 'detect' },
			'import/resolver': {
				typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
				node: true
			}
		},
		rules: { ...styleRules, ...logicRules }
	},

	// TypeScript config
	...tseslint.configs.recommended.map(config => ({
		...config,
		files: [ '**/*.ts', '**/*.tsx' ]
	})),
	{
		files: [ '**/*.ts', '**/*.tsx' ],
		plugins: {
			'@stylistic': stylistic
		},
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json'
			},
			globals: {
				...globals.node,
				__DEV__: 'readonly',
				AbortController: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly'
			}
		},
		settings: {
			react: { version: 'detect' },
			'import/resolver': {
				typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
				node: true
			}
		},
		rules: {
			...styleRules,
			...logicRules,
			// Use the TypeScript-aware no-unused-vars on TS files
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [ 'error', { ignoreRestSiblings: true }],
			// The TS compiler reports real redeclarations (TS2451); the lint rule
			// false-positives on the valid `const X` + `type X` value/type idiom.
			'no-redeclare': 'off'
		}
	},

	// Test files
	{
		files: [ 'jest.setup.js', '**/*.test.js', '**/*.test.ts', '**/*.test.tsx' ],
		...jest.configs['flat/recommended'],
		languageOptions: {
			globals: { ...globals.jest, fetch: 'readonly' }
		},
		rules: {
			...jest.configs['flat/recommended'].rules,
			...jest.configs['flat/style'].rules,
			'jest/consistent-test-it': [ 'error' ],
			'jest/prefer-lowercase-title': [ 'error', { ignoreTopLevelDescribe: true }],
			'jest/require-top-level-describe': [ 'error' ]
		}
	},

	// NativeShell injected scripts run in the WebView (browser environment)
	{
		files: [ 'assets/**/*.staticjs' ],
		...compat.configs['flat/recommended'],
		languageOptions: {
			globals: { ...globals.browser, postExpoEvent: 'readonly' }
		}
	}
];
