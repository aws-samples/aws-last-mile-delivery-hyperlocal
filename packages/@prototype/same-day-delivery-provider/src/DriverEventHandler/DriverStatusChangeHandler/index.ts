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
	readonly PROVIDER_LOCKS_TABLE: string
	readonly PROVIDER_ORDERS_JOBID_INDEX: string
	readonly PROVIDER_ORDERS_TABLE: string
	readonly SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME: string
	readonly SAME_DAY_DELIVERY_CALLBACK_API_URL: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDeliveryProviderLocks: ddb.ITable
	readonly sameDayDeliveryProviderApi: RestApi
	readonly eventBus: events.IEventBus
	readonly sameDayDeliveryProviderApiSecretName: string
	readonly iotEndpointAddress: string
	readonly sameDayDeliveryProviderOrdersJobIdIndex: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverStatusChangeHandler extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderApi,
			sameDayDeliveryProviderLocks,
			sameDayDeliveryProviderOrdersJobIdIndex,
			sameDayDeliveryProviderApiSecretName,
			eventBus,
			iotEndpointAddress,
		} = props.dependencies

		const sameDayDeliveryProviderApiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'SameDayDeliveryProviderSecret', sameDayDeliveryProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'SameDayDeliveryProviderDriverStatusHandler'),
			description: 'Lambda used by the same day delivery provider to handle driver status updates',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/same-day-delivery-provider-driver-status-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				PROVIDER_ORDERS_TABLE: sameDayDeliveryProviderOrders.tableName,
				PROVIDER_LOCKS_TABLE: sameDayDeliveryProviderLocks.tableName,
				PROVIDER_ORDERS_JOBID_INDEX: sameDayDeliveryProviderOrdersJobIdIndex,
				EVENT_BUS: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.SAME_DAY_DELIVERY_PROVIDER_SERVICE,
				SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME: sameDayDeliveryProviderApiSecretName,
				SAME_DAY_DELIVERY_CALLBACK_API_URL: sameDayDeliveryProviderApi.url,
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
					actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem', 'dynamodb:Query'],
					effect: iam.Effect.ALLOW,
					resources: [
						sameDayDeliveryProviderOrders.tableArn,
						sameDayDeliveryProviderLocks.tableArn,
						`${sameDayDeliveryProviderOrders.tableArn}/index/${sameDayDeliveryProviderOrdersJobIdIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:PutItem'],
					effect: iam.Effect.ALLOW,
					resources: [sameDayDeliveryProviderLocks.tableArn],
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
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${sameDayDeliveryProviderApiSecret.secretArn}*`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
