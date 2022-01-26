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
import { Code } from '@aws-cdk/aws-lambda'
import { ITable } from '@aws-cdk/aws-dynamodb'
import { IEventBus } from '@aws-cdk/aws-events'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { RestApi } from '@aws-play/cdk-apigateway'
import { IApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2'
import { IVpc, ISecurityGroup, SubnetType } from '@aws-cdk/aws-ec2'
import { IStream } from '@aws-cdk/aws-kinesis'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	EVENT_BUS: string
	PROVIDER_ORDERS_TABLE: string
	PROVIDER_LOCKS_TABLE: string
	KINESIS_STREAM: string
	SERVICE_NAME: string
	INTERNAL_PROVIDER_SECRET_NAME: string
	INTERNAL_CALLBACK_API_URL: string
	GRAPH_HOPPER_ELB_DNS: string
	DISPATCH_ENGINE_ELB_DNS: string
	GEO_CLUSTERING_BIAS: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly internalProviderOrders: ITable
	readonly internalProviderLocks: ITable
  readonly orderBatchStream: IStream
  readonly eventBus: IEventBus
	readonly internalWebhookProviderSettings: { [key: string]: string | number | boolean, }
	readonly internalProviderApi: RestApi
	readonly internalProviderApiSecretName: string
	readonly iotEndpointAddress: string
	readonly dispatchEngineLB: IApplicationLoadBalancer
	readonly graphhopperLB: IApplicationLoadBalancer
	readonly vpc: IVpc
	readonly lambdaSecurityGroups: ISecurityGroup[]
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrchestratorHelperLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			dependencies: {
				internalProviderOrders,
				internalProviderLocks,
				orderBatchStream,
				eventBus,
				internalWebhookProviderSettings,
				internalProviderApi,
				internalProviderApiSecretName,
				dispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
			},
		} = props

		const internalProviderApiSecret = Secret.fromSecretNameV2(scope, 'OrchestrationInternalProviderSecret', internalProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DispatchOrchestratorHelper'),
			description: 'Lambda used by Dispatch Engine orchestrator step function to execute actions.',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/internal-provider-orchestrator-helper.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				EVENT_BUS: eventBus.eventBusName,
				PROVIDER_ORDERS_TABLE: internalProviderOrders.tableName,
				KINESIS_STREAM: orderBatchStream.streamName,
				SERVICE_NAME: SERVICE_NAME.DISPATCH_ENGINE,
				PROVIDER_LOCKS_TABLE: internalProviderLocks.tableName,
				ORDER_TIMEOUT_SECONDS: internalWebhookProviderSettings.orderCancellationTimeoutInSeconds.toString(),
				INTERNAL_PROVIDER_SECRET_NAME: internalProviderApiSecretName,
				INTERNAL_CALLBACK_API_URL: internalProviderApi.url,
				GRAPH_HOPPER_ELB_DNS: graphhopperLB.loadBalancerDnsName,
				DISPATCH_ENGINE_ELB_DNS: dispatchEngineLB.loadBalancerDnsName,
				// TODO: configure the bias accordingly: the smaller the more clusters
				GEO_CLUSTERING_BIAS: internalWebhookProviderSettings.geoClusteringBias.toString(),
				IOT_ENDPOINT: iotEndpointAddress,
			},
			vpc,
			vpcSubnets: {
				subnetType: SubnetType.PRIVATE,
			},
			securityGroups: lambdaSecurityGroups,
			initialPolicy: [
				new PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new PolicyStatement({
					actions: ['kinesis:PutRecord'],
					effect: Effect.ALLOW,
					resources: [orderBatchStream.streamArn],
				}),
				new PolicyStatement({
					actions: [
						'iot:Connect',
						'iot:Publish',
					],
					effect: Effect.ALLOW,
					resources: ['*'],
				}),
				new PolicyStatement({
					actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: Effect.ALLOW,
					resources: [internalProviderOrders.tableArn],
				}),
				new PolicyStatement({
					actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: Effect.ALLOW,
					resources: [internalProviderLocks.tableArn],
				}),
				new PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: Effect.ALLOW,
					resources: [
						`${internalProviderApiSecret.secretArn}*`,
					],
				}),
			],
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
