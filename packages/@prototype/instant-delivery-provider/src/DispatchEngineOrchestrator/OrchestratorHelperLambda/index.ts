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
import { Duration, aws_lambda as lambda, aws_dynamodb as ddb, aws_events as events, aws_secretsmanager as secretsmanager, aws_elasticloadbalancingv2 as elb, aws_ec2 as ec2, aws_kinesis as kinesis, aws_iam as iam } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	EVENT_BUS: string
	PROVIDER_ORDERS_TABLE: string
	PROVIDER_LOCKS_TABLE: string
	KINESIS_STREAM: string
	SERVICE_NAME: string
	INSTANT_DELIVERY_PROVIDER_SECRET_NAME: string
	INSTANT_DELIVERY_CALLBACK_API_URL: string
	GRAPH_HOPPER_ELB_DNS: string
	DISPATCH_ENGINE_ELB_DNS: string
	GEO_CLUSTERING_BIAS: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly instantDeliveryProviderLocks: ddb.ITable
	readonly orderBatchStream: kinesis.IStream
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly instantDeliveryProviderApi: RestApi
	readonly instantDeliveryProviderApiSecretName: string
	readonly iotEndpointAddress: string
	readonly dispatchEngineLB: elb.IApplicationLoadBalancer
	readonly graphhopperLB: elb.IApplicationLoadBalancer
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrchestratorHelperLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			dependencies: {
				instantDeliveryProviderOrders,
				instantDeliveryProviderLocks,
				orderBatchStream,
				eventBus,
				instantDeliveryProviderSettings,
				instantDeliveryProviderApi,
				instantDeliveryProviderApiSecretName,
				dispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
			},
		} = props

		const instantDeliveryProviderApiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'OrchestrationInstantDeliveryProviderSecret', instantDeliveryProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DispatchOrchestratorHelper'),
			description: 'Lambda used by Dispatch Engine orchestrator step function to execute actions.',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/instant-delivery-provider-orchestrator-helper.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				EVENT_BUS: eventBus.eventBusName,
				PROVIDER_ORDERS_TABLE: instantDeliveryProviderOrders.tableName,
				KINESIS_STREAM: orderBatchStream.streamName,
				SERVICE_NAME: SERVICE_NAME.DISPATCH_ENGINE,
				PROVIDER_LOCKS_TABLE: instantDeliveryProviderLocks.tableName,
				ORDER_TIMEOUT_SECONDS: instantDeliveryProviderSettings.orderCancellationTimeoutInSeconds.toString(),
				INSTANT_DELIVERY_PROVIDER_SECRET_NAME: instantDeliveryProviderApiSecretName,
				INSTANT_DELIVERY_CALLBACK_API_URL: instantDeliveryProviderApi.url,
				GRAPH_HOPPER_ELB_DNS: graphhopperLB.loadBalancerDnsName,
				DISPATCH_ENGINE_ELB_DNS: dispatchEngineLB.loadBalancerDnsName,
				// TODO: configure the bias accordingly: the smaller the more clusters
				GEO_CLUSTERING_BIAS: instantDeliveryProviderSettings.geoClusteringBias.toString(),
				IOT_ENDPOINT: iotEndpointAddress,
			},
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
				}),
				new iam.PolicyStatement({
					actions: ['kinesis:PutRecord'],
					effect: iam.Effect.ALLOW,
					resources: [orderBatchStream.streamArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'iot:Connect',
						'iot:Publish',
					],
					effect: iam.Effect.ALLOW,
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: iam.Effect.ALLOW,
					resources: [instantDeliveryProviderOrders.tableArn],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: iam.Effect.ALLOW,
					resources: [instantDeliveryProviderLocks.tableArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${instantDeliveryProviderApiSecret.secretArn}*`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
