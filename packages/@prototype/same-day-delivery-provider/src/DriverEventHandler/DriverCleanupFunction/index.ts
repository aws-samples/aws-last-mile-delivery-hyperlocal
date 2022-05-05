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
import { Duration, aws_dynamodb as ddb, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements } from '@prototype/lambda-common'

interface Environment extends DeclaredLambdaEnvironment {
	readonly PROVIDER_LOCKS_TABLE: string
	readonly PROVIDER_ORDERS_TABLE: string
	readonly PROVIDER_ORDERS_STATUS_INDEX: string
	readonly DRIVER_ACK_SECONDS: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly sameDayDeliveryProviderLocks: ddb.ITable
	readonly sameDayDeliveryProviderOrders: ddb.ITable
	readonly sameDayDeliveryProviderOrdersStatusIndex: string
	readonly driverAcknowledgeTimeoutInSeconds: number
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverCleanupLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			sameDayDeliveryProviderOrders,
			sameDayDeliveryProviderLocks,
			sameDayDeliveryProviderOrdersStatusIndex,
			driverAcknowledgeTimeoutInSeconds,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'SameDayDeliveryProviderDriverCleanup'),
			description: 'Lambda used by the same day delivery to cleaup the driver/order status if no updated received',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/same-day-delivery-provider-driver-cleanup.zip')),
			dependencies: props.dependencies,
			timeout: Duration.minutes(10),
			environment: {
				PROVIDER_LOCKS_TABLE: sameDayDeliveryProviderLocks.tableName,
				PROVIDER_ORDERS_STATUS_INDEX: sameDayDeliveryProviderOrdersStatusIndex,
				PROVIDER_ORDERS_TABLE: sameDayDeliveryProviderOrders.tableName,
				DRIVER_ACK_SECONDS: driverAcknowledgeTimeoutInSeconds.toString(),
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: ['dynamodb:UpdateItem'],
					effect: iam.Effect.ALLOW,
					resources: [sameDayDeliveryProviderOrders.tableArn, sameDayDeliveryProviderLocks.tableArn],
				}),
				new iam.PolicyStatement({
					actions: ['dynamodb:GetItem', 'dynamodb:Query'],
					effect: iam.Effect.ALLOW,
					resources: [
						sameDayDeliveryProviderLocks.tableArn,
						sameDayDeliveryProviderOrders.tableArn,
						`${sameDayDeliveryProviderOrders.tableArn}/index/${sameDayDeliveryProviderOrdersStatusIndex}`,
					],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
