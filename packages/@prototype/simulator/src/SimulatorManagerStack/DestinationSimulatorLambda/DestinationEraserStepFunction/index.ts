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
import { Duration, aws_iam as iam, aws_dynamodb as ddb, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface DestinationEraserStepFunctionProps {
	readonly destinationTable: ddb.ITable
	readonly destinationAreaIndex: string
	readonly destinationStatsTable: ddb.ITable
}

export class DestinationEraserStepFunction extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: DestinationEraserStepFunctionProps) {
		super(scope, id)

		const {
			destinationAreaIndex,
			destinationTable,
			destinationStatsTable,
		} = props

		this.lambda = new lambda.Function(this, 'DestinationEraserHelper', {
			functionName: namespaced(this, 'DestinationEraserHelper'),
			description: 'Lambda used by step function to delete destination',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/destination-eraser-helper.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				DESTINATION_TABLE_NAME: destinationTable.tableName,
				DESTINATION_STATS_TABLE_NAME: destinationStatsTable.tableName,
				DESTINATION_AREA_INDEX: destinationAreaIndex,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
						'dynamodb:GetItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						destinationStatsTable.tableArn,
						destinationTable.tableArn,
						`${destinationTable.tableArn}/index/${props.destinationAreaIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:DeleteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						destinationTable.tableArn,
						destinationStatsTable.tableArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:BatchWriteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						destinationTable.tableArn,
					],
				}),
			],
		})

		const stepFunctionRole = new iam.Role(
			this,
			'stepFunctionRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)
		stepFunctionRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
				effect: iam.Effect.ALLOW,
				resources: [this.lambda.functionArn],
			}),
		)

		const iterate = new tasks.LambdaInvoke(
			this,
			'Iterator',
			{
				lambdaFunction: this.lambda,
				resultSelector: {
					'iterator.$': '$.Payload',
				},
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'iterate',
						payload: {
							'area.$': '$$.Execution.Input.area',
							'count.$': '$$.Execution.Input.batchSize',
							'lastEvaluatedKey.$': '$.iterator.lastEvaluatedKey',
						},
					},
				},
			},
		)

		const deleteDestinations = new tasks.LambdaInvoke(
			this,
			'DeleteDestinations',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'deleteDestinations',
						payload: {
							'ids.$': '$.iterator.ids',
						},
					},
				},
			},
		)

		const deleteDestinationStats = new tasks.LambdaInvoke(
			this,
			'DeleteDestinationStats',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'deleteDestinationStats',
						payload: {
							'destinationStatsId.$': '$$.Execution.Input.destinationStatsId',
						},
					},
				},
			},
		)

		const configureIterator = new stepfunctions.Pass(this, 'ConfigureIterator', {
			resultPath: '$.iterator',
			result: stepfunctions.Result.fromObject({
				lastEvaluatedKey: '',
			}),
		})

		const definition = configureIterator
		.next(iterate)
		.next(deleteDestinations)
		.next(
			new stepfunctions.Choice(this, 'IsNextPage')
			.when(stepfunctions.Condition.booleanEquals('$.iterator.continue', true), iterate)
			.otherwise(deleteDestinationStats),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'DestinationEraserStepFunctions', {
			stateMachineName: namespaced(this, 'DestinationEraserStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
