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
import { Duration, aws_iam as iam, aws_dynamodb as ddb, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks, aws_cognito as cognito, aws_iot as iot } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement, deleteFromDDBTablePolicyStatement } from '@prototype/lambda-common'

export interface DestinationGeneratorStepFunctionProps {
	readonly destinationTable: ddb.ITable
	readonly destinationStatsTable: ddb.ITable
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly destinationUserPassword: string
}

export class DestinationGeneratorStepFunction extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: DestinationGeneratorStepFunctionProps) {
		super(scope, id)

		const {
			destinationStatsTable,
			destinationTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			destinationUserPassword,
		} = props

		this.lambda = new lambda.Function(this, 'DestinationGeneratorHelper', {
			functionName: namespaced(this, 'DestinationGeneratorHelper'),
			description: 'Lambda used by step function to generate destinations',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/destination-generator-helper.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				DESTINATION_STATS_TABLE_NAME: destinationStatsTable.tableName,
				DESTINATION_TABLE_NAME: destinationTable.tableName,
				IDENTITY_POOL_ID: identityPool.ref,
				USER_POOL_ID: userPool.userPoolId,
				USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
				IOT_POLICY_NAME: iotPolicy.policyName || '',
				BASE_USERNAME: simulatorConfig.destinationBaseUsername as string,
				USER_PASSWORD: destinationUserPassword,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(destinationTable.tableArn),
				updateDDBTablePolicyStatement(destinationTable.tableArn),
				deleteFromDDBTablePolicyStatement(destinationTable.tableArn),
				readDDBTablePolicyStatement(destinationStatsTable.tableArn),
				updateDDBTablePolicyStatement(destinationStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(destinationStatsTable.tableArn),
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						// used by the simulator
						'iot:AttachPolicy',
						'iot:DetachPolicy',
					],
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					resources: [userPool.userPoolArn],
					actions: [
						'cognito-idp:AdminUpdateUserAttributes',
						'cognito-idp:AdminConfirmSignUp',
						'cognito-idp:AdminDeleteUser',
					],
					effect: iam.Effect.ALLOW,
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

		const waitX = new stepfunctions.Wait(this, 'Wait few Seconds', {
			time: stepfunctions.WaitTime.duration(Duration.seconds(1)),
		})

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
							'count.$': '$$.Execution.Input.batchSize',
							'index.$': '$.iterator.index',
							'step.$': '$.iterator.step',
						},
					},
				},
			},
		)

		const generateCustomer = new tasks.LambdaInvoke(
			this,
			'GenerateCustomer',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'generateCustomer',
						payload: {
							'customerStatsId.$': '$$.Execution.Input.customerStatsId',
							'lat.$': '$$.Execution.Input.lat',
							'long.$': '$$.Execution.Input.long',
							'area.$': '$$.Execution.Input.area',
							'radius.$': '$$.Execution.Input.radius',
						},
					},
				},
			},
		)

		const updateStats = (state: string): tasks.LambdaInvoke =>
			new tasks.LambdaInvoke(
				this,
				`UpdateStats_${state}`,
				{
					lambdaFunction: this.lambda,
					resultPath: stepfunctions.JsonPath.DISCARD,
					payload: {
						type: stepfunctions.InputType.OBJECT,
						value: {
							cmd: 'updateStats',
							payload: {
								'customerStatsId.$': '$$.Execution.Input.customerStatsId',
								state,
							},
						},
					},
				},
			)

		const configureCount = new stepfunctions.Pass(this, 'ConfigureCount', {
			resultPath: '$.iterator',
			result: stepfunctions.Result.fromObject({
				index: 0,
				step: 1,
			}),
		})

		const definition = configureCount
		.next(updateStats('IN_PROGRESS'))
		.next(iterate)
		.next(generateCustomer)
		.next(
			new stepfunctions.Choice(this, 'IsCountReached')
			.when(stepfunctions.Condition.booleanEquals('$.iterator.continue', true), waitX.next(iterate))
			.otherwise(updateStats('READY')),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'CustomerGeneratorStepFunctions', {
			stateMachineName: namespaced(this, 'CustomerGeneratorStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
