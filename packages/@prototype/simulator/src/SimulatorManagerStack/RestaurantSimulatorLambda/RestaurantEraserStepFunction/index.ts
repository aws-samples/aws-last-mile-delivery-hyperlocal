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
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface RestaurantEraserStepFunctionProps {
	readonly restaurantTable: ddb.ITable
	readonly restaurantAreaIndex: string
	readonly restaurantStatsTable: ddb.ITable
}

export class RestaurantEraserStepFunction extends cdk.Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: step.StateMachine

	constructor (scope: cdk.Construct, id: string, props: RestaurantEraserStepFunctionProps) {
		super(scope, id)

		const {
			restaurantAreaIndex,
			restaurantTable,
			restaurantStatsTable,
		} = props

		this.lambda = new lambda.Function(this, 'RestaurantEraserHelper', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(this, 'RestaurantEraserHelper'),
			description: 'Lambda used by step function to delete restaurants',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/restaurant-eraser-helper.zip')),
			handler: 'index.handler',
			timeout: cdk.Duration.seconds(120),
			environment: {
				RESTAURANT_TABLE_NAME: restaurantTable.tableName,
				RESTAURANT_STATS_TABLE_NAME: restaurantStatsTable.tableName,
				RESTAURANT_AREA_INDEX: restaurantAreaIndex,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
						'dynamodb:GetItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.restaurantStatsTable.tableArn,
						props.restaurantTable.tableArn,
						`${props.restaurantTable.tableArn}/index/${props.restaurantAreaIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:DeleteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.restaurantTable.tableArn,
						props.restaurantStatsTable.tableArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:BatchWriteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.restaurantTable.tableArn,
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
					type: step.InputType.OBJECT,
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

		const deleteRestaurants = new tasks.LambdaInvoke(
			this,
			'DeleteRestaurants',
			{
				lambdaFunction: this.lambda,
				resultPath: step.JsonPath.DISCARD,
				payload: {
					type: step.InputType.OBJECT,
					value: {
						cmd: 'deleteRestaurants',
						payload: {
							'ids.$': '$.iterator.ids',
						},
					},
				},
			},
		)

		const deleteRestaurantStats = new tasks.LambdaInvoke(
			this,
			'DeleteRestaurantStats',
			{
				lambdaFunction: this.lambda,
				resultPath: step.JsonPath.DISCARD,
				payload: {
					type: step.InputType.OBJECT,
					value: {
						cmd: 'deleteRestaurantStats',
						payload: {
							'restaurantStatsId.$': '$$.Execution.Input.restaurantStatsId',
						},
					},
				},
			},
		)

		const configureIterator = new step.Pass(this, 'ConfigureIterator', {
			resultPath: '$.iterator',
			result: step.Result.fromObject({
				lastEvaluatedKey: '',
			}),
		})

		const definition = configureIterator
		.next(iterate)
		.next(deleteRestaurants)
		.next(
			new step.Choice(this, 'IsNextPage')
			.when(step.Condition.booleanEquals('$.iterator.continue', true), iterate)
			.otherwise(deleteRestaurantStats),
		)

		this.stepFunction = new step.StateMachine(this, 'RestaurantEraserStepFunctions', {
			stateMachineName: namespaced(this, 'RestaurantEraserStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
