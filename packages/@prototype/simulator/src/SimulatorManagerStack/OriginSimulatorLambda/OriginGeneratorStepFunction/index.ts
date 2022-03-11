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
import { DEMOGRAPHIC_AREA, COUNTRIES } from '@prototype/common'

export interface OriginGeneratorStepFunctionProps {
	readonly originTable: ddb.ITable
	readonly originStatsTable: ddb.ITable
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly originUserPassword: string
	readonly country: string
}

const getDemographicAreas = (country: string): any => {
	switch (country) {
		case COUNTRIES.PHILIPPINES:
			return DEMOGRAPHIC_AREA.PHILIPPINES.MANILA
		case COUNTRIES.INDONESIA:
		default:
			return DEMOGRAPHIC_AREA.INDONESIA.JAKARTA
	}
}

export class OriginGeneratorStepFunction extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: OriginGeneratorStepFunctionProps) {
		super(scope, id)

		const {
			originStatsTable,
			originTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			originUserPassword,
			country,
		} = props

		this.lambda = new lambda.Function(this, 'OriginGeneratorHelper', {
			functionName: namespaced(this, 'OriginGeneratorHelper'),
			description: 'Lambda used by step function to generate origins',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/origin-generator-helper.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				ORIGIN_STATS_TABLE_NAME: originStatsTable.tableName,
				ORIGIN_TABLE_NAME: originTable.tableName,
				IDENTITY_POOL_ID: identityPool.ref,
				USER_POOL_ID: userPool.userPoolId,
				USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
				IOT_POLICY_NAME: iotPolicy.policyName || '',
				BASE_USERNAME: simulatorConfig.originBaseUsername as string,
				USER_PASSWORD: originUserPassword,
				DEMOGRAPHIC_AREAS: Object.values(getDemographicAreas(country.toUpperCase())).join(','),
			},
			initialPolicy: [
				readDDBTablePolicyStatement(originTable.tableArn),
				updateDDBTablePolicyStatement(originTable.tableArn),
				deleteFromDDBTablePolicyStatement(originTable.tableArn),
				readDDBTablePolicyStatement(originStatsTable.tableArn),
				updateDDBTablePolicyStatement(originStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(originStatsTable.tableArn),
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

		const generateOrigin = new tasks.LambdaInvoke(
			this,
			'GenerateOrigin',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'generateOrigin',
						payload: {
							'originStatsId.$': '$$.Execution.Input.originStatsId',
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
								'originStatsId.$': '$$.Execution.Input.originStatsId',
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
		.next(generateOrigin)
		.next(
			new stepfunctions.Choice(this, 'IsCountReached')
			.when(stepfunctions.Condition.booleanEquals('$.iterator.continue', true), waitX.next(iterate))
			.otherwise(updateStats('READY')),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'OriginGeneratorStepFunctions', {
			stateMachineName: namespaced(this, 'OriginGeneratorStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
