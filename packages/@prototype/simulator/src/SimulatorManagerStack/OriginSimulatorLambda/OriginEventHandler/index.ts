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
import { Duration, aws_lambda as lambda, aws_events as events, aws_iam as iam, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements, readDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'

interface Environment extends DeclaredLambdaEnvironment {
	readonly EVENT_BUS_NAME: string
	readonly ORDER_MANAGER_SERVICE_NAME: string
	readonly ORIGIN_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly eventBus: events.EventBus
	readonly originTable: ddb.ITable
	readonly iotEndpointAddress: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OriginEventHandlerLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			eventBus,
			originTable,
			iotEndpointAddress,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'OriginEventHandler'),
			description: 'Origin event handler: read the event bridge events and handle the one that are related to the origin',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/origin-event-handler.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				EVENT_BUS_NAME: eventBus.eventBusName,
				ORDER_MANAGER_SERVICE_NAME: SERVICE_NAME.ORDER_MANAGER,
				ORIGIN_TABLE: originTable.tableName,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(originTable.tableArn),
				new iam.PolicyStatement({
					actions: [
						'iot:Connect',
						'iot:Publish',
					],
					effect: iam.Effect.ALLOW,
					resources: ['*'],
				}),
				...LambdaInsightsExecutionPolicyStatements(),
			],
		}

		super(scope, id, declaredProps)
	}
}
