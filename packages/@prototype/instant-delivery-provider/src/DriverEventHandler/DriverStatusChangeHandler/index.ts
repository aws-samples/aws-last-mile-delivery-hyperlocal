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
import { Duration, aws_dynamodb as ddb, aws_events as events, aws_secretsmanager as secretsmanager, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { RestApi } from '@aws-play/cdk-apigateway'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	readonly PROVIDER_ORDERS_TABLE: string
	readonly INSTANT_DELIVERY_PROVIDER_SECRET_NAME: string
	readonly INSTANT_DELIVERY_CALLBACK_API_URL: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly instantDeliveryProviderOrders: ddb.ITable
	readonly instantDeliveryProviderApi: RestApi
	readonly eventBus: events.IEventBus
	readonly instantDeliveryProviderApiSecretName: string
	readonly iotEndpointAddress: string
	readonly instantDeliveryProviderOrdersJobIdIndex: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverStatusChangeHandler extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			instantDeliveryProviderOrders,
			instantDeliveryProviderApi,
			instantDeliveryProviderApiSecretName,
			instantDeliveryProviderOrdersJobIdIndex,
			eventBus,
			iotEndpointAddress,
		} = props.dependencies

		const instantDeliveryProviderApiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'DriverStatusInstantDeliveryProviderSecret', instantDeliveryProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'InstantDeliveryProviderDriverStatusHandler'),
			description: 'Lambda used by the instant delivery provider to handle driver status updates',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/instant-delivery-provider-driver-status-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				PROVIDER_ORDERS_TABLE: instantDeliveryProviderOrders.tableName,
				PROVIDER_ORDERS_JOBID_INDEX: instantDeliveryProviderOrdersJobIdIndex,
				EVENT_BUS: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.INSTANT_DELIVERY_PROVIDER_SERVICE,
				INSTANT_DELIVERY_PROVIDER_SECRET_NAME: instantDeliveryProviderApiSecretName,
				INSTANT_DELIVERY_CALLBACK_API_URL: instantDeliveryProviderApi.url,
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
					actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: iam.Effect.ALLOW,
					resources: [instantDeliveryProviderOrders.tableArn],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:GetItem', 'dynamodb:Query'],
					effect: iam.Effect.ALLOW,
					resources: [
						`${instantDeliveryProviderOrders.tableArn}/index/${instantDeliveryProviderOrdersJobIdIndex}`,
					],
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
