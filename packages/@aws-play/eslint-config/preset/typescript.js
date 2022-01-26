/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                               *
 *                                                                                                                   *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of                                  *
 *  this software and associated documentation files (the "Software"), to deal in                                    *
 *  the Software without restriction, including without limitation the rights to                                     *
 *  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of                                 *
 *  the Software, and to permit persons to whom the Software is furnished to do so.                                  *
 *                                                                                                                   *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR                                       *
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS                                 *
 *  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR                                   *
 *  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER                                   *
 *  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN                                          *
 *  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                       *
 *********************************************************************************************************************/

const path = require('path')

module.exports = {
	extends: [
		'@aws-play/eslint-config/preset/standard',
		'@aws-play/eslint-config/preset/license-headers',
		'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
		// 'prettier/@typescript-eslint',
		'plugin:import/typescript',
	],
	parser: '@typescript-eslint/parser',
	// https://eslint.org/docs/user-guide/configuring#specifying-parser-options
	parserOptions: {
		// https://eslint.org/docs/user-guide/migrating-to-5.0.0#experimental-object-rest-spread
		ecmaVersion: 2018,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
			impliedStrict: true,
		},
		typescript: true,
	},
	env: {
		node: true,
		es6: true,
		'jest/globals': true,
	},
	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {
				// directory: [
				// 	'./packages/**/tsconfig.json',
				// 	'./tsconfig.json',
				// ],
			},
		},
	},
	plugins: [
		'@typescript-eslint',
	],
	overrides: [
		{
			files: ['**/*.ts', '**/*.tsx'],
			parser: '@typescript-eslint/parser',
			rules: {
				// eslint-disable-next-line max-len
				// https://github.com/typescript-eslint/typescript-eslint/blob/61c60dc047da680b8cc74943c52c33562942c95a/packages/eslint-plugin/src/configs/recommended.json
				'@typescript-eslint/adjacent-overload-signatures': 'error',
				'@typescript-eslint/array-type': 'error',
				'@typescript-eslint/ban-types': 'warn',
				'@typescript-eslint/ban-ts-comment': 'warn',
				'@typescript-eslint/explicit-function-return-type': 'warn',
				'@typescript-eslint/explicit-member-accessibility': 'off',
				'@typescript-eslint/member-delimiter-style': [
					'error',
					{
						multiline: {
							delimiter: 'none',
							requireLast: true,
						},
						singleline: {
							delimiter: 'comma',
							requireLast: true,
						},
					},
				],
				'@typescript-eslint/no-array-constructor': 'error',
				'@typescript-eslint/no-empty-interface': 'warn',
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-inferrable-types': 'error',
				'@typescript-eslint/no-misused-new': 'error',
				'@typescript-eslint/no-namespace': 'error',
				'@typescript-eslint/no-non-null-assertion': 'error',
				'@typescript-eslint/no-parameter-properties': 'off',
				'@typescript-eslint/no-unused-vars': ['warn'],
				'@typescript-eslint/no-use-before-define': [
					'error',
					{
						// `functions` and `typedefs` are hoisted and therefore safe
						functions: false,
						classes: true,
						variables: true,
						typedefs: false,
					},
				],
				'@typescript-eslint/no-var-requires': 'error',
				'@typescript-eslint/prefer-namespace-keyword': 'error',
				'@typescript-eslint/type-annotation-spacing': 'error',
			},
		},
		{
			files: ['**/package.json'],
			rules: {
				indent: 'off',
			},
		},
		{
			files: ['**/*.ts', '**/*.tsx'],
			parser: '@typescript-eslint/parser',
			rules: {
				camelcase: 'off',
				'no-array-constructor': 'off',
				'no-unused-vars': 'off',
				// note you must disable the base rule as it can report incorrect errors
				'no-useless-constructor': 'off',
				'@typescript-eslint/no-useless-constructor': ['warn'],
			},
		},
		{
			files: ['**/*.js', '**/*.jsx'],
			rules: {
				'@typescript-eslint/no-var-requires': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/no-use-before-define': 'off',
			},
		},
		{
			files: ['**/@lambda/**/*.js'],
			rules: {
				'import/no-absolute-path': 'off',
			},
		},
		{
			files: ['**/*.tsx'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/explicit-member-accessibility': 'off',
				'@typescript-eslint/no-non-null-assertion': 'warn',
				'@typescript-eslint/no-namespace': 'warn',
			},
		},
		{
			files: ['**/*.spec.*', 'test/**/*'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
			},
		},
		{
			files: ['*.{test,spec,story}.ts{,x}'],
			rules: {
				'import/no-extraneous-dependencies': ['error', { packageDir: './' }],
			},
		},
	],
}
