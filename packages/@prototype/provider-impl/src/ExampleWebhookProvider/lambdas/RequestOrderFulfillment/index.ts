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
import { Duration, aws_ec2 as ec2, aws_lambda as lambda, aws_events as events, aws_secretsmanager as secretsmanager, aws_iam as iam } from 'aws-cdk-lib'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'
import { SERVICE_NAME, PROVIDER_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	readonly MEMORYDB_ADMIN_USERNAME: string
	readonly MEMORYDB_ADMIN_SECRET: string
	readonly MEMORYDB_HOST: string
	readonly MEMORYDB_PORT: string
	readonly EVENT_BUS: string
	readonly SERVICE_NAME: string
	readonly EXTERNAL_PROVIDER_URL: string
	readonly EXTERNAL_PROVIDER_SECRETNAME: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly lambdaLayers: lambda.ILayerVersion[]
	readonly eventBus: events.IEventBus
	readonly memoryDBCluster: MemoryDBCluster
	readonly externalProviderMockUrl: string
	readonly externalProviderSecretName: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class RequestOrderFulfillmentLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	public readonly environmentVariables: Environment

	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			vpc,
			lambdaSecurityGroups,
			lambdaLayers,
			eventBus,
			memoryDBCluster,
			externalProviderSecretName,
			externalProviderMockUrl,
		} = props.dependencies

		const environmentVariables = {
			MEMORYDB_HOST: memoryDBCluster.cluster.attrClusterEndpointAddress,
			MEMORYDB_PORT: memoryDBCluster.cluster.port?.toString() || '',
			MEMORYDB_ADMIN_USERNAME: memoryDBCluster.adminUsername,
			MEMORYDB_ADMIN_SECRET: memoryDBCluster.adminPasswordSecret.secretArn,
			EXTERNAL_PROVIDER_URL: externalProviderMockUrl,
			EXTERNAL_PROVIDER_SECRETNAME: externalProviderSecretName,
			EVENT_BUS: eventBus.eventBusName,
			SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
			PROVIDER_NAME: PROVIDER_NAME.EXAMPLE_WEBHOOK_PROVIDER,
		}

		const externalProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'ExternalWebhookProviderSecretRequest', externalProviderSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'ExampleWebhookProvider-RequestOrderFulfillment'),
			description: 'Example webhook provider - RequestOrderFulfillment lambda function',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/example-webhook-provider-requestorderfulfillment.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				...environmentVariables,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${externalProviderSecret.secretArn}*`,
						`${memoryDBCluster.adminPasswordSecret.secretArn}*`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
			layers: lambdaLayers,
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)

		this.environmentVariables = environmentVariables
	}
}
