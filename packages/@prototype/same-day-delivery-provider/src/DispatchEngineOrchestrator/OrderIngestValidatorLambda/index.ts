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
import { Duration, aws_lambda as lambda, aws_iam as iam, aws_stepfunctions as stepfunctions, aws_dynamodb as ddb, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'
import { RestApi } from '@aws-play/cdk-apigateway'

interface Environment extends DeclaredLambdaEnvironment {
	readonly DISPATCH_ENGINE_MANAGER_ARN: string
	readonly SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE_NAME: string
	readonly SAME_DAY_DELIVERY_PROVIDER_ORDERS_STATUS_PARTITION_INDEX: string
	readonly ORDER_TIMEOUT_MINUTES: string
	readonly SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME: string
	readonly SAME_DAY_DELIVERY_CALLBACK_API_URL: string
	readonly MAX_BATCHING_WINDOW_MINUTES: string
	readonly MAX_BATCHING_SIZE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly dispatchEngineOrchestratorManager: stepfunctions.StateMachine
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDeliveryProviderOrdersStatusPartitionIndex: string
	readonly sameDayDeliveryProviderSettings: { [key: string]: string | number | boolean, }
	readonly sameDayDeliveryProviderApi: RestApi
	readonly sameDayDeliveryProviderApiSecretName: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrderIngestValidatorLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			dispatchEngineOrchestratorManager,
			sameDayDeliveryProviderOrdersStatusPartitionIndex,
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderApi,
			sameDayDeliveryProviderApiSecretName,
			sameDayDeliveryProviderSettings,
		} = props.dependencies

		const sameDayDeliveryProviderApiSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'SameDayDeliveryProviderSecret', sameDayDeliveryProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'SameDayDeliveryProviderOrderIngestionValidation'),
			description: 'Lambda used by the same-day delivery provider to ingest incoming orders and validate if they are ready to be executed.',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/same-day-delivery-provider-order-ingest.zip')),
			dependencies: props.dependencies,
			timeout: Duration.minutes(4),
			environment: {
				DISPATCH_ENGINE_MANAGER_ARN: dispatchEngineOrchestratorManager.stateMachineArn,
				SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE_NAME: sameDayDeliveryProviderOrders.tableName,
				SAME_DAY_DELIVERY_PROVIDER_ORDERS_STATUS_PARTITION_INDEX: sameDayDeliveryProviderOrdersStatusPartitionIndex,
				ORDER_TIMEOUT_MINUTES: sameDayDeliveryProviderSettings.orderCancellationTimeoutInMinutes.toString(),
				SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME: sameDayDeliveryProviderApiSecretName,
				SAME_DAY_DELIVERY_CALLBACK_API_URL: sameDayDeliveryProviderApi.url,
				MAX_BATCHING_WINDOW_MINUTES: sameDayDeliveryProviderSettings.orderIngestMaxBatchingWindowMinutes.toString(),
				MAX_BATCHING_SIZE: sameDayDeliveryProviderSettings.orderIngestMaxBatchingSize.toString(),
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [
						dispatchEngineOrchestratorManager.stateMachineArn,
					],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
						'dynamodb:GetItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						sameDayDeliveryProviderOrders.tableArn,
						`${sameDayDeliveryProviderOrders.tableArn}/index/${sameDayDeliveryProviderOrdersStatusPartitionIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:UpdateItem',
						'dynamodb:TransactWriteItems',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						sameDayDeliveryProviderOrders.tableArn,
					],
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
