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
	clearMocks: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'clover'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	globals: {
		'ts-jest': {
			extends: './tsconfig.json',
		},
	},
	moduleFileExtensions: ['ts', 'tsx', 'js'],
	modulePathIgnorePatterns: ['dist'],
	moduleNameMapper: {
		'(@prototype(.+))$': [
			path.join(__dirname, 'packages/$1/src'),
			'$1',
		],
	},
	notify: true,
	notifyMode: 'always',
	roots: ['<rootDir>packages'],
	testMatch: ['**/__tests__/*.+(ts|tsx|js)', '**/*.(test|spec).+(ts|tsx|js)'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	setupFilesAfterEnv: [path.join(__dirname, 'configs/jest/setupTests.ts')],
}
