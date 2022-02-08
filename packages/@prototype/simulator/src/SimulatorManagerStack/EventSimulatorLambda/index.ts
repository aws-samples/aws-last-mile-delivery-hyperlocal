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
import { Duration, Stack, aws_iam as iam, aws_events as events, aws_events_targets as events_targets, aws_dynamodb as ddb, aws_lambda as lambda } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface EventSimulatorProps {
	readonly eventTable: ddb.ITable
	readonly eventCreatedAtIndex: string
	readonly eventBus: events.EventBus
}

export class EventSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	constructor (scope: Construct, id: string, props: EventSimulatorProps) {
		super(scope, id)

		const stack = Stack.of(this)

		this.lambda = new lambda.Function(this, 'EventSimulatorLambda', {
			functionName: namespaced(this, 'EventSimulatorLambda'),
			description: 'Lambda used to expose events coming in the event bridge for debug/simulation purpose',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/event-simulator-lambda.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				EVENT_TABLE_NAME: props.eventTable.tableName,
				EVENT_CREATED_AT_INDEX: props.eventCreatedAtIndex,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:PutItem',
						'dynamodb:GetItem',
						'dynamodb:Scan',
						'dynamodb:UpdateItem',
						'dynamodb:Query',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.eventTable.tableArn],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
					],
					effect: iam.Effect.ALLOW,
					resources: [`${props.eventTable.tableArn}/index/${props.eventCreatedAtIndex}`],
				}),
			],
		})

		new events.Rule(this, 'CatchAllRule', {
			ruleName: namespaced(this, 'catch-all'),
			description: 'Used for debug purpose',
			eventBus: props.eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(this.lambda)],
			eventPattern: {
				// catch all events in the bus
				account: [stack.account],
			},
		})
	}
}
