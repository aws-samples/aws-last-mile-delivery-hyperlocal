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
import * as fs from 'fs'
import * as path from 'path'
import { Stack, Construct } from '@aws-cdk/core'

export function getRootStack (scope: Construct): Stack {
	let rootStack = Stack.of(scope)

	while (rootStack.nestedStackParent) {
		rootStack = rootStack.nestedStackParent
	}

	return rootStack
}

export function validateStackParameterLimit (stack: Stack): void {
	const template = JSON.parse(fs.readFileSync(path.join(process.env.CDK_OUTDIR as string, stack.templateFile), 'utf-8'))
	const parameterCount = Object.keys(template.Parameters || {}).length

	if (parameterCount > 60) {
		throw new Error(`Stack "${stack.stackName}" exceeded limit of 60 parameters: ${parameterCount}`)
	}
}
