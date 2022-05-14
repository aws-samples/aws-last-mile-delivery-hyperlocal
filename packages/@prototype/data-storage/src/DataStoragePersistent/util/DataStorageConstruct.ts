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
import { aws_ssm as ssm, RemovalPolicy } from 'aws-cdk-lib'

export interface DataStorageProps {
	readonly parameterStoreKeys: Record<string, string>
	readonly ssmStringParameters: Record<string, ssm.IStringParameter>
	readonly country: string
    readonly removalPolicy?: RemovalPolicy
}

export abstract class DataStorage<TProps extends DataStorageProps> extends Construct {
	private readonly ssmStringParameters: Record<string, ssm.IStringParameter>

	protected readonly country: string

	constructor (scope: Construct, id: string, props: TProps) {
		super(scope, id)

		this.ssmStringParameters = props.ssmStringParameters
		this.country = props.country
	}

	addToSsmStringParameters (resourceId: string, paramName: string, paramValue: string, descriptionKey: string): void {
		this.ssmStringParameters[paramName] = new ssm.StringParameter(this, resourceId, {
			parameterName: paramName,
			stringValue: paramValue,
			description: `${descriptionKey}`,
		})
	}

	abstract runDbSeed (): void
}
