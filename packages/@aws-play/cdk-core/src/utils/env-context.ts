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
import { Construct } from 'constructs'
import { config } from 'dotenv'
import chalk from 'chalk'

type Context = { [key: string]: string, }

/**
 * Set default using [dotenv](https://github.com/motdotla/dotenv) to override defaults.
 *
 * This only set the `default` values passed into `App` instance and
 * [CDK Runtime Context](https://docs.aws.amazon.com/cdk/latest/guide/context.html)
 * standard functionality will take precedence.
 *
 * Intended for development purposes rather than deployment. This will enable override defaults without
 * having to set *cdk.json* or passing `--context` during development.
 *
 */
export function envContext<TContext extends Context> (defaults: TContext): TContext {
	// Load .env file into process.env
	config()

	return Object.keys(defaults).reduce((context: Partial<TContext>, key: string): Partial<TContext> => {
		let value = context[key] as string

		if (process.env[key]) {
			value = process.env[key] as string
			console.warn(chalk.bgYellowBright.black(`[.env]: ${key} = "${value}"`))
		}

		return {
			...context,
			[key]: value,
		}
	}, defaults) as TContext
}

export function getContext<TContext extends Context> (scope: Construct, keys: string[]): TContext {
	return keys.reduce((context: Partial<TContext>, key: string): Partial<TContext> => {
		return {
			...context,
			[key]: scope.node.tryGetContext(key) || context[key] as string,
		}
	}, {}) as TContext
}
