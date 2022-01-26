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
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { readFileSync } from 'fs'
import { extname } from 'path'
import { yamlParse } from 'yaml-cfn'
import { Construct } from '@aws-cdk/core'

export function parseTemplate (file: string): any {
	if (['yml', 'yaml'].includes(extname(file))) {
		return yamlParse(readFileSync(file).toString())
	} else {
		throw new Error('Only supports YAML files')
	}
}

export function mapContextToParameters (template: any, scope: Construct): void {
	Object.keys(template.Parameters).forEach((key): void => {
		const value = scope.node.tryGetContext(key)

		if (value != null) {
			template.Parameters[key].Default = value
		}
	})
}

export function mapPropsToParameters (template: any, props: any): void {
	Object.keys(template.Parameters).forEach((key): void => {
		if (key in props) {
			template.Parameters[key].Default = props[key]
		}
	})
}
