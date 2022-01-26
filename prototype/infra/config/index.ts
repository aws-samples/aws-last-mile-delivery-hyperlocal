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
/* eslint-disable no-console */
import { sync as findUp } from 'find-up'
import { BackendStageProps } from '../lib/stack/root/PipelineStack/stage/BackendStageProps'

const CDK_CONTEXT_JSON = JSON.parse(process.env.CDK_CONTEXT_JSON || '{}')

if (CDK_CONTEXT_JSON.env) {
	const env = CDK_CONTEXT_JSON.env
	process.env.NODE_CONFIG_ENV = Array.isArray(env) ? env.join(',') : env
} else if (process.env.CDK_ENV) {
	process.env.NODE_CONFIG_ENV = process.env.CDK_ENV
}

const IS_TEST = (process.env.NODE_CONFIG_ENV || process.env.NODE_ENV || '').split(',').includes('test')

const account = process.env.CDK_DEFAULT_ACCOUNT

if (account == null && !IS_TEST) {
	throw new Error('Config failed to determine account')
}

process.env.NODE_CONFIG_DIR = findUp('config', { type: 'directory', cwd: __dirname })
process.env.NODE_APP_INSTANCE = account

if (process.env.CDK_CONFIG) {
	process.env.NODE_CONFIG = process.env.CDK_CONFIG
}

if (process.env.CDK_CONFIG_SUPPRESS_WARNING) {
	process.env.SUPPRESS_NO_CONFIG_WARNING = process.env.CDK_CONFIG_SUPPRESS_WARNING
}

export type Config = BackendStageProps

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const config: Config = require('config')

if (process.env.CDK_CONFIG_SUPPRESS_WARNING == null) {
	console.info(config)
}

export default config
