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
import { Duration, Stack, Arn, aws_lambda as lambda, aws_iam as iam, aws_s3 as s3 } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { S3, IoT } from 'cdk-iam-actions/lib/actions'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly CONFIG_BUCKET: string
	readonly APP_IDS: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly configBucket: s3.IBucket
	readonly appConfigAppIds: string[]
	readonly iotEndpointAddress: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DeploymentHandlerLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			configBucket,
			appConfigAppIds,
			iotEndpointAddress,
		} = props.dependencies

		const baseArn = Arn.format({
			resource: 'application',
			service: 'appconfig',
		}, Stack.of(scope))

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'AppConfigDeploymentHandler'),
			description: 'AppConfig Deployment Handler function',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/appconfig-deployment-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				CONFIG_BUCKET: configBucket.bucketName,
				APP_IDS: appConfigAppIds.join(','),
			},
			initialPolicy: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [S3.PUT_OBJECT, S3.PUT_OBJECT_VERSION_TAGGING],
					resources: [
						configBucket.bucketArn,
						`${configBucket.bucketArn}/*`,
					],
				}),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						'appconfig:GetConfiguration',
						'appconfig:GetEnvironment',
					],
					resources: [
						`${baseArn}/*`,
						`${baseArn}/*/environment/*`,
					],
				}),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						IoT.PUBLISH,
						IoT.CONNECT,
					],
					resources: ['*'],
				}),
			],
		}

		super(scope, id, declaredProps)
	}
}
