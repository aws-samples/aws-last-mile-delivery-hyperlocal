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
/* eslint-disable @typescript-eslint/no-var-requires */
import { homedir } from 'os'
import * as path from 'path'
import { init as initStorage, getItem, setItem } from 'node-persist'

interface Values {
	[key: string]: any
}

export const getPromptStoreValues = async (key: string): Promise<Values> => {
	try {
		await initStorage({
			dir: path.join(homedir(), '.aws-prototyping/prompts'),
		})

		return (await getItem(key)) || {}
	} catch (error) {
		console.warn('Failed to get stored values', error)

		return {}
	}
}

export const setPromptStoreValues = async (key: string, values: Values): Promise<void> => {
	try {
		await initStorage({
			dir: path.join(homedir(), '.aws-prototyping/prompts'),
		})

		await setItem(key, values)
	} catch (error) {
		console.log('Failed to store values', error)
	}
}
