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

export interface CustomerEraserStepFunctionProps {
	readonly customerTable: ddb.ITable
	readonly customerAreaIndex: string
	readonly customerStatsTable: ddb.ITable
}

export class CustomerEraserStepFunction extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: CustomerEraserStepFunctionProps) {
		super(scope, id)

		const {
			customerAreaIndex,
			customerTable,
			customerStatsTable,
		} = props

		this.lambda = new lambda.Function(this, 'CustomerEraserHelper', {
			runtime: lambda.Runtime.NODEJS_14_X,
			functionName: namespaced(this, 'CustomerEraserHelper'),
			description: 'Lambda used by step function to delete customers',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/customer-eraser-helper.zip')),
			handler: 'index.handler',
			timeout: Duration.seconds(120),
			environment: {
				CUSTOMER_TABLE_NAME: customerTable.tableName,
				CUSTOMER_STATS_TABLE_NAME: customerStatsTable.tableName,
				CUSTOMER_AREA_INDEX: customerAreaIndex,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
						'dynamodb:GetItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						customerStatsTable.tableArn,
						customerTable.tableArn,
						`${customerTable.tableArn}/index/${props.customerAreaIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:DeleteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						customerTable.tableArn,
						customerStatsTable.tableArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:BatchWriteItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						customerTable.tableArn,
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

		const deleteCustomers = new tasks.LambdaInvoke(
			this,
			'DeleteCustomers',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'deleteCustomers',
						payload: {
							'ids.$': '$.iterator.ids',
						},
					},
				},
			},
		)

		const deleteCustomerStats = new tasks.LambdaInvoke(
			this,
			'DeleteCustomerStats',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'deleteCustomerStats',
						payload: {
							'customerStatsId.$': '$$.Execution.Input.customerStatsId',
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
		.next(deleteCustomers)
		.next(
			new stepfunctions.Choice(this, 'IsNextPage')
			.when(stepfunctions.Condition.booleanEquals('$.iterator.continue', true), iterate)
			.otherwise(deleteCustomerStats),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'CustomerEraserStepFunctions', {
			stateMachineName: namespaced(this, 'CustomerEraserStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
