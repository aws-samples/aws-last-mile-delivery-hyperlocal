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
import { Duration, aws_lambda as lambda, aws_events as events, aws_secretsmanager as secretsmanager, aws_elasticloadbalancingv2 as elb, aws_ec2 as ec2, aws_iam as iam, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	EVENT_BUS: string
	SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE: string
	SAME_DAY_DELIVERY_PROVIDER_ORDERS_BATCH_ID_INDEX: string
	SERVICE_NAME: string
	GRAPH_HOPPER_ELB_DNS: string
	DISPATCH_ENGINE_ELB_DNS: string
	GEOTRACKING_API_URL: string
	GEOTRACKING_API_KEY_SECRET_NAME: string
	IOT_ENDPOINT: string
	SAME_DAY_DELIVERY_PUDO_DELIVERY_JOBS_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly eventBus: events.IEventBus
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDirectPudoDeliveryJobs: ddb.ITable
	readonly sameDayDeliveryProviderOrdersBatchIdIndex: string
	readonly iotEndpointAddress: string
	readonly dispatchEngineLB: elb.IApplicationLoadBalancer
	readonly graphhopperLB: elb.IApplicationLoadBalancer
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly geoTrackingRestApi: RestApi
	readonly geoTrackingApiKeySecretName: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrchestratorHelperLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			dependencies: {
				sameDayDeliveryProviderOrders,
				sameDayDirectPudoDeliveryJobs,
				sameDayDeliveryProviderOrdersBatchIdIndex,
				eventBus,
				dispatchEngineLB,
				graphhopperLB,
				vpc,
				lambdaSecurityGroups,
				iotEndpointAddress,
				geoTrackingRestApi,
				geoTrackingApiKeySecretName,
			},
		} = props

		const geoTrackingApiKeySecret = secretsmanager.Secret.fromSecretNameV2(scope, 'geoTrackingApiKeySecret', geoTrackingApiKeySecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'SameDayDispatchOrchestratorHelper'),
			description: 'Lambda used by Dispatch Engine orchestrator step function to execute actions (same day delivery).',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/same-day-delivery-provider-orchestrator-helper.zip')),
			dependencies: props.dependencies,
			timeout: Duration.minutes(4),
			environment: {
				EVENT_BUS: eventBus.eventBusName,
				SAME_DAY_DELIVERY_PUDO_DELIVERY_JOBS_TABLE: sameDayDirectPudoDeliveryJobs.tableName,
				SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE: sameDayDeliveryProviderOrders.tableName,
				SAME_DAY_DELIVERY_PROVIDER_ORDERS_BATCH_ID_INDEX: sameDayDeliveryProviderOrdersBatchIdIndex,
				SERVICE_NAME: SERVICE_NAME.DISPATCH_ENGINE,
				GRAPH_HOPPER_ELB_DNS: graphhopperLB.loadBalancerDnsName,
				DISPATCH_ENGINE_ELB_DNS: dispatchEngineLB.loadBalancerDnsName,
				IOT_ENDPOINT: iotEndpointAddress,
				GEOTRACKING_API_URL: geoTrackingRestApi.url,
				GEOTRACKING_API_KEY_SECRET_NAME: geoTrackingApiKeySecretName,
			},
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
			initialPolicy: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						'secretsmanager:GetSecretValue',
					],
					resources: [`${geoTrackingApiKeySecret.secretArn}*`],
				}),
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [eventBus.eventBusArn],
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
					resources: [sameDayDeliveryProviderOrders.tableArn],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:Query', 'dynamodb:GetItem'],
					effect: iam.Effect.ALLOW,
					resources: [
						sameDayDirectPudoDeliveryJobs.tableArn,
						sameDayDeliveryProviderOrders.tableArn,
						`${sameDayDeliveryProviderOrders.tableArn}/index/${sameDayDeliveryProviderOrdersBatchIdIndex}`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
