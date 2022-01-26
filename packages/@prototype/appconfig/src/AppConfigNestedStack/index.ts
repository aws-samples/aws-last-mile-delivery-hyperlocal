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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { IBucket } from '@aws-cdk/aws-s3'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { IRole, Policy, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { Rule } from '@aws-cdk/aws-events'
import { LambdaFunction } from '@aws-cdk/aws-events-targets'
import { AppConfigSetup } from './AppConfigSetup'
import { ConfigStorage } from './ConfigStorage'
import { DeploymentHandlerLambda } from './DeploymentHandlerLambda'
import { namespaced } from '@aws-play/cdk-core'
import { CfnApplication, CfnEnvironment } from '@aws-cdk/aws-appconfig'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppConfigNestedStackProps extends NestedStackProps {
	readonly deliveryAppConfig: any
	readonly cognitoAuthenticatedRole: IRole
	readonly iotEndpointAddress: string
}

export class AppConfigNestedStack extends NestedStack {
	readonly configBucket: IBucket

	readonly configBucketKey: string

	readonly driverApp: CfnApplication

	readonly driverAppEnvironment: CfnEnvironment

	constructor (scope: Construct, id: string, props: AppConfigNestedStackProps) {
		super(scope, id)

		const { deliveryAppConfig, cognitoAuthenticatedRole, iotEndpointAddress } = props

		const appConfigSetup = new AppConfigSetup(this, 'AppConfigSetup', {
			driverAppConfig: deliveryAppConfig.driverAppConfig,
		})

		const configStorage = new ConfigStorage(this, 'ConfigStorage')
		this.configBucket = configStorage.configBucket

		// attach policy to access S3 through cognito identity
		cognitoAuthenticatedRole.attachInlinePolicy(new Policy(this, 'ConfigS3AccessPolicy', {
			document: new PolicyDocument({
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
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
				appConfigAppIds: [appConfigSetup.driverApp.ref, appConfigSetup.customerApp.ref],
				configBucket: configStorage.configBucket,
				iotEndpointAddress,
			},
		})

		const deploymentHandlerTarget = new LambdaFunction(deploymentHandlerLambda)

		// setup event bridge rule
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appConfigDeploymentRule = new Rule(this, 'AppConfigDeploymentRule', {
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
			physicalResourceId: PhysicalResourceId.of('onPLAYAppConfigDeployment'),
		// ignoreErrorCodesMatching: 'AccessDenied',
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const appVariablesResource = new AwsCustomResource(this, 'InitialDeliveryAppConfigResource', {
			onCreate: resourceParams,
			onUpdate: resourceParams,
			policy: customResourcePolicy,
		})

		this.driverApp = appConfigSetup.driverApp
		this.driverAppEnvironment = appConfigSetup.driverAppEnvironment

		this.configBucketKey = `app/${this.driverApp.ref}/env/${this.driverAppEnvironment.name}/config.json`
	}
}
