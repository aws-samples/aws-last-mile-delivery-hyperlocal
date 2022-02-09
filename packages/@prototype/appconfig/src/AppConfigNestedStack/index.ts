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
import { NestedStack, NestedStackProps, aws_s3 as s3, custom_resources, aws_iam as iam, aws_events as events, aws_events_targets as event_targets, aws_appconfig as appconfig } from 'aws-cdk-lib'
import { AppConfigSetup } from './AppConfigSetup'
import { ConfigStorage } from './ConfigStorage'
import { DeploymentHandlerLambda } from './DeploymentHandlerLambda'
import { namespaced } from '@aws-play/cdk-core'

export interface AppConfigNestedStackProps extends NestedStackProps {
	readonly deliveryAppConfig: any
	readonly cognitoAuthenticatedRole: iam.IRole
	readonly iotEndpointAddress: string
}

export class AppConfigNestedStack extends NestedStack {
	readonly configBucket: s3.IBucket

	readonly configBucketKey: string

	readonly driverApp: appconfig.CfnApplication

	readonly driverAppEnvironment: appconfig.CfnEnvironment

	constructor (scope: Construct, id: string, props: AppConfigNestedStackProps) {
		super(scope, id)

		const { deliveryAppConfig, cognitoAuthenticatedRole, iotEndpointAddress } = props

		const appConfigSetup = new AppConfigSetup(this, 'AppConfigSetup', {
			driverAppConfig: deliveryAppConfig.driverAppConfig,
		})

		const configStorage = new ConfigStorage(this, 'ConfigStorage')
		this.configBucket = configStorage.configBucket

		// attach policy to access S3 through cognito identity
		cognitoAuthenticatedRole.attachInlinePolicy(new iam.Policy(this, 'ConfigS3AccessPolicy', {
			document: new iam.PolicyDocument({
				statements: [
					new iam.PolicyStatement({
						effect: iam.Effect.ALLOW,
						actions: [
							's3:GetObject',
						],
						resources: [
							this.configBucket.bucketArn,
							`${this.configBucket.bucketArn}/*`,
						],
					}),
				],
			}),
			policyName: namespaced(this, 'ConfigS3Access'),
		}))

		const deploymentHandlerLambda = new DeploymentHandlerLambda(this, 'DeploymentHandlerLambda', {
			dependencies: {
				appConfigAppIds: [appConfigSetup.driverApp.ref, appConfigSetup.destinationApp.ref],
				configBucket: configStorage.configBucket,
				iotEndpointAddress,
			},
		})

		const deploymentHandlerTarget = new event_targets.LambdaFunction(deploymentHandlerLambda)

		// setup event bridge rule
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appConfigDeploymentRule = new events.Rule(this, 'AppConfigDeploymentRule', {
			description: 'AppConfig Deployment Rule',
			ruleName: namespaced(this, 'AppConfigDeploymentRule'),
			targets: [deploymentHandlerTarget],
			eventPattern: {
				source: ['aws.appconfig'],
				detailType: ['AWS API Call via CloudTrail'],
				detail: {
					eventSource: ['appconfig.amazonaws.com'],
					eventName: ['StartDeployment'],
				},
			},
		})

		const destinationKey = `app/${appConfigSetup.driverApp.ref}/env/${appConfigSetup.driverAppEnvironment.name}/config.json`

		const customResourcePolicy = custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
			resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
		})

		customResourcePolicy.statements.push(
			new iam.PolicyStatement({
				actions: [
					's3:putObject*',
				],
				effect: iam.Effect.ALLOW,
				resources: [
					this.configBucket.bucketArn,
					`${this.configBucket.bucketArn}/*`,
				],
			}),
		)

		const resourceParams = {
			service: 'S3',
			action: 'putObject',
			parameters: {
				Bucket: this.configBucket.bucketName,
				Key: destinationKey,
				Body: JSON.stringify(deliveryAppConfig.driverAppConfig),
			},
			physicalResourceId: custom_resources.PhysicalResourceId.of(namespaced(this, 'onPLAYAppConfigDeployment')),
		// ignoreErrorCodesMatching: 'AccessDenied',
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appVariablesResource = new custom_resources.AwsCustomResource(this, 'InitialDeliveryAppConfigResource', {
			onCreate: resourceParams,
			onUpdate: resourceParams,
			policy: customResourcePolicy,
		})

		this.driverApp = appConfigSetup.driverApp
		this.driverAppEnvironment = appConfigSetup.driverAppEnvironment

		this.configBucketKey = `app/${this.driverApp.ref}/env/${this.driverAppEnvironment.name}/config.json`
	}
}
