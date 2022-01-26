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
import { ITable } from '@aws-cdk/aws-dynamodb'
import { IEventBus } from '@aws-cdk/aws-events'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { Code } from '@aws-cdk/aws-lambda'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'
import { RestApi } from '@aws-play/cdk-apigateway'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly PROVIDER_ORDERS_TABLE: string
	readonly INTERNAL_PROVIDER_SECRET_NAME: string
	readonly INTERNAL_CALLBACK_API_URL: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly internalProviderOrders: ITable
	readonly internalProviderApi: RestApi
	readonly eventBus: IEventBus
	readonly internalProviderApiSecretName: string
	readonly iotEndpointAddress: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverStatusChangeHandler extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			internalProviderOrders,
			internalProviderApi,
			internalProviderApiSecretName,
			eventBus,
			iotEndpointAddress,
		} = props.dependencies

		const internalProviderApiSecret = Secret.fromSecretNameV2(scope, 'DriverStatusInternalProviderSecret', internalProviderApiSecretName)

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'InternalProviderDriverStatusHandler'),
			description: 'Lambda used by the internal provider to handle driver status updates',
			code: Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/internal-provider-driver-status-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				PROVIDER_ORDERS_TABLE: internalProviderOrders.tableName,
				EVENT_BUS: eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.INTERNAL_WEBHOOK_PROVIDER_SERVICE,
				INTERNAL_PROVIDER_SECRET_NAME: internalProviderApiSecretName,
				INTERNAL_CALLBACK_API_URL: internalProviderApi.url,
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
					actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
					effect: Effect.ALLOW,
					resources: [internalProviderOrders.tableArn],
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
