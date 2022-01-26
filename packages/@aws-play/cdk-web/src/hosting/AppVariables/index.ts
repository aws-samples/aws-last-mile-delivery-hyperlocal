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
import { Construct } from '@aws-cdk/core'
import { IBucket } from '@aws-cdk/aws-s3'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'

/**
 * Properties for creating App variables
 */
export interface AppVariablesProps {
	/**
	 * Key-value pairs (allows nested objects) to hold variables
	 */
	readonly appVars: { [key: string]: any, }

	/**
	 * Reference to the hosting bucket
	 */
	readonly hostingBucket: IBucket

	/**
	 * Destination key in the hosting bucket.
	 * @default 'assets/appVariables.js'
	 */
	readonly appVarDestinationKey?: string
}

export class AppVariables extends Construct {
	constructor (scope: Construct, id: string, props: AppVariablesProps) {
		super(scope, id)

		const {
			appVars,
			appVarDestinationKey = 'assets/appVariables.js',
			hostingBucket,
		} = props

		const customResourcePolicy = AwsCustomResourcePolicy.fromSdkCalls({
			resources: AwsCustomResourcePolicy.ANY_RESOURCE,
		})

		customResourcePolicy.statements.push(
			new PolicyStatement({
				actions: [
					's3:putObject*',
				],
				effect: Effect.ALLOW,
				resources: [
					hostingBucket.bucketArn,
					`${hostingBucket.bucketArn}/*`,
				],
			}),
		)

		const appVariablesString = `'use strict'\n\nconst appVariables = ${JSON.stringify(appVars, null, 2)}`

		// console.log(appVariablesString)

		const appVariablesResourceParams = {
			service: 'S3',
			action: 'putObject',
			parameters: {
				Bucket: hostingBucket.bucketName,
				Key: appVarDestinationKey,
				Body: appVariablesString,
			},
			physicalResourceId: PhysicalResourceId.of('onPLAYWebDeploymentAppVars'),
		// ignoreErrorCodesMatching: 'AccessDenied',
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appVariablesResource = new AwsCustomResource(this, 'appVariablesResource', {
			onCreate: appVariablesResourceParams,
			onUpdate: appVariablesResourceParams,
			policy: customResourcePolicy,
		})
	}
}
