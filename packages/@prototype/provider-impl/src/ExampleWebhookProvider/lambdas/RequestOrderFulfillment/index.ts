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
import { Duration, Construct } from '@aws-cdk/core'
import { IVpc, SubnetType, ISecurityGroup } from '@aws-cdk/aws-ec2'
import { Code, ILayerVersion } from '@aws-cdk/aws-lambda'
import { IEventBus } from '@aws-cdk/aws-events'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME, PROVIDER_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly REDIS_HOST: string
	readonly REDIS_PORT: string
	readonly EVENT_BUS: string
	readonly SERVICE_NAME: string
	readonly EXTERNAL_PROVIDER_URL: string
	readonly EXTERNAL_PROVIDER_SECRETNAME: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
	readonly lambdaLayers: ILayerVersion[]
	readonly eventBus: IEventBus
	readonly redisCluster: CfnCacheCluster
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
			redisCluster,
			externalProviderSecretName,
			externalProviderMockUrl,
		} = props.dependencies

		const environmentVariables = {
			REDIS_HOST: redisCluster.attrRedisEndpointAddress,
			REDIS_PORT: redisCluster.attrRedisEndpointPort,
			EXTERNAL_PROVIDER_URL: externalProviderMockUrl,
			EXTERNAL_PROVIDER_SECRETNAME: externalProviderSecretName,
			EVENT_BUS: eventBus.eventBusName,
			SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
			PROVIDER_NAME: PROVIDER_NAME.EXAMPLE_WEBHOOK_PROVIDER,
		}

		const externalProviderSecret = Secret.fromSecretNameV2(scope, 'ExternalWebhookProviderSecretRequest', externalProviderSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'ExampleWebhookProvider-RequestOrderFulfillment'),
			description: 'Example webhook provider - RequestOrderFulfillment lambda function',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/example-webhook-provider-requestorderfulfillment.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				...environmentVariables,
			},
			initialPolicy: [
				new PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: Effect.ALLOW,
					resources: [
						`${externalProviderSecret.secretArn}*`,
					],
				}),
			],
			layers: lambdaLayers,
			vpc,
			vpcSubnets: {
				subnetType: SubnetType.PRIVATE,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}

		this.environmentVariables = environmentVariables
	}
}
