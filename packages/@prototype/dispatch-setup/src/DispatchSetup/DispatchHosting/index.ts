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
import { Stack, aws_s3 as s3, aws_iam as iam, custom_resources as cr } from 'aws-cdk-lib'
import { render } from 'mustache'
import * as fs from 'fs'
import * as path from 'path'
import { namespaced } from '@aws-play/cdk-core'

export interface DispatchHostingProps {
	readonly dispatchEngineBucket: s3.IBucket
	readonly driverApiKeySecretName: string
	// readonly driverApiUrlParameterName: string
	readonly dispatcherConfigPath: string
	readonly dispatcherVersion: string
	readonly demographicAreaDispatcherSettingsTableName: string
	readonly dispatcherAssignmentTableName: string
}

export class DispatchHosting extends Construct {
	constructor (scope: Construct, id: string, props: DispatchHostingProps) {
		super(scope, id)

		const {
			dispatchEngineBucket,
			dispatcherConfigPath,
			driverApiKeySecretName,
			// driverApiUrlParameterName,
			dispatcherVersion,
			demographicAreaDispatcherSettingsTableName,
			dispatcherAssignmentTableName,
		} = props

		// fill out application.properties template
		const applicationsPropsPath = path.join(dispatcherConfigPath)
		const applicationPropsContent = fs.readFileSync(applicationsPropsPath, { encoding: 'utf-8' })
		const renderedContent = render(applicationPropsContent, {
			dispatchEngineBucketName: dispatchEngineBucket.bucketName,
			// driverApiUrlParameterName,
			driverApiKeySecretName,
			dispatcherVersion,
			demographicAreaDispatcherSettingsTableName,
			dispatcherAssignmentTableName,
			region: Stack.of(this).region,
		})

		const customResourcePolicy = cr.AwsCustomResourcePolicy
		.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE })

		customResourcePolicy.statements.push(
			new iam.PolicyStatement({
				actions: [
					's3:putObject*',
				],
				effect: iam.Effect.ALLOW,
				resources: [
					dispatchEngineBucket.bucketArn,
					`${dispatchEngineBucket.bucketArn}/*`,
				],
			}),
		)

		const applicationPropsParams = {
			service: 'S3',
			action: 'putObject',
			parameters: {
				Bucket: dispatchEngineBucket.bucketName,
				Key: 'dispatcher-app/config/application.properties',
				Body: renderedContent,
			},
			physicalResourceId: cr.PhysicalResourceId.of(namespaced(this, 'onAppDataDeploymentAppProps')),
			ignoreErrorCodesMatching: 'AccessDenied',
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appVariablesResource = new cr.AwsCustomResource(this, 'applicationPropsResource', {
			onCreate: applicationPropsParams,
			onUpdate: applicationPropsParams,
			policy: customResourcePolicy,
			functionName: namespaced(this, 'dispatcher-config-hosting-CR'),
		})
	}
}
