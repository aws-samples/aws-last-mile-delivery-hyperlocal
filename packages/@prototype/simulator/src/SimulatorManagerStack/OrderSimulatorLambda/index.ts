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
import { Duration, aws_iam as iam, aws_events as events, aws_events_targets as events_targets, aws_dynamodb as ddb, aws_lambda as lambda } from 'aws-cdk-lib'
import { SERVICE_NAME } from '@prototype/common'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface OrderSimulatorProps {
	readonly orderTable: ddb.ITable
	readonly eventBus: events.EventBus
	readonly geofencing: lambda.IFunction
}

export class OrderSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly externalProviderConsumer: events.Rule

	public readonly providerFoundConsumer: events.Rule

	public readonly geofencingConsumer: events.Rule

	constructor (scope: Construct, id: string, props: OrderSimulatorProps) {
		super(scope, id)

		this.lambda = new lambda.Function(this, 'OrderSimulatorLambda', {
			functionName: namespaced(this, 'OrderSimulatorLambda'),
			description: 'Lambda used to simulate the order service',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/order-simulator-lambda.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				ORDER_TABLE_NAME: props.orderTable.tableName,
				EVENT_BUS_NAME: props.eventBus.eventBusName,
				SERVICE_NAME: SERVICE_NAME.ORDER_SERVICE,
				// TODO: this is just for the simulator, the real service should invoke API gateway APIs
				GEOFENCING_ARN: props.geofencing.functionArn,
				GEOFENCING_SERVICE_NAME: SERVICE_NAME.GEOFENCING_SERVICE,
				ORDER_MANAGER_SERVICE_NAME: SERVICE_NAME.ORDER_MANAGER,
				EXAMPLE_POLLING_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
				EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME: SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
				INTERNAL_WEBHOOK_PROVIDER_SERVICE: SERVICE_NAME.INTERNAL_WEBHOOK_PROVIDER_SERVICE,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'events:PutEvents',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.eventBus.eventBusArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:PutItem',
						'dynamodb:GetItem',
						'dynamodb:Scan',
						'dynamodb:UpdateItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.orderTable.tableArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'lambda:InvokeFunction',
						'lambda:InvokeAsync',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.geofencing.functionArn],
				}),
			],
		})

		this.externalProviderConsumer = new events.Rule(this, 'ExternalProviderUpdateEventConsumer', {
			ruleName: namespaced(this, 'external-provider-update-to-order'),
			description: 'Rule used by order service to consume external provider status updates in order',
			eventBus: props.eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.lambda)],
			eventPattern: {
				source: [
					SERVICE_NAME.EXAMPLE_POLLING_PROVIDER_SERVICE,
					SERVICE_NAME.EXAMPLE_WEBHOOK_PROVIDER_SERVICE,
					SERVICE_NAME.INTERNAL_WEBHOOK_PROVIDER_SERVICE,
				],
				detailType: ['ORDER_UPDATE'],
			},
		})

		this.providerFoundConsumer = new events.Rule(this, 'ProviderFoundEventConsumer', {
			ruleName: namespaced(this, 'provider-found-to-order'),
			description: 'Rule used by order service to consume order manager provider found events',
			eventBus: props.eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.lambda)],
			eventPattern: {
				source: [SERVICE_NAME.ORDER_MANAGER],
				detailType: ['PROVIDER_FOUND', 'ORDER_REJECTED'],
			},
		})

		this.geofencingConsumer = new events.Rule(this, 'GeofencingEventConsumer', {
			ruleName: namespaced(this, 'geofencing-events-to-order'),
			description: 'Rule used by order service to consume geofencing status events',
			eventBus: props.eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.lambda)],
			eventPattern: {
				source: [SERVICE_NAME.GEOFENCING_SERVICE],
				detailType: ['GEOFENCE_START', 'GEOFENCE_STOP', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'],
			},
		})
	}
}
