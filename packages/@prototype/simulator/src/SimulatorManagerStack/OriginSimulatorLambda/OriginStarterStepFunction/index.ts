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
import { Duration, aws_iam as iam, aws_dynamodb as ddb, aws_ec2 as ec2, aws_ecs as ecs, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SimulatorContainer } from '../../../ECSContainerStack/SimulatorContainer'

export interface OriginStarterStepFunctionProps {
	readonly originTable: ddb.ITable
	readonly originSimulationsTable: ddb.ITable
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly originSimulatorContainer: SimulatorContainer
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
}

export class OriginStarterStepFunction extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: OriginStarterStepFunctionProps) {
		super(scope, id)

		const {
			originTable,
			originSimulationsTable,
			originSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		} = props

		this.lambda = new lambda.Function(this, 'OriginStarterHelper', {
			functionName: namespaced(this, 'OriginStarterHelper'),
			description: 'Lambda used by step function to start origin simulator',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/origin-starter-helper.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				ORIGIN_TABLE_NAME: originTable.tableName,
				ORIGIN_SIMULATION_TABLE_NAME: originSimulationsTable.tableName,
				CLUSTER_NAME: cluster.clusterName,
				TASK_DEFINITION_NAME: originSimulatorContainer.taskDefinition.taskDefinitionArn,
				SUBNETS: vpc.publicSubnets.map(q => q.subnetId).join(','),
				SECURITY_GROUP: securityGroup.securityGroupId, // TODO: CDKv2 make sure Id is ok to use // .securityGroupName,
				CONTAINER_NAME: originSimulatorContainer.containerDefinition.containerName,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(originTable.tableArn),
				updateDDBTablePolicyStatement(originTable.tableArn),
				readDDBTablePolicyStatement(originSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(originSimulationsTable.tableArn),
				new iam.PolicyStatement({
					actions: [
						'ecs:RunTask',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						originSimulatorContainer.taskDefinition.taskDefinitionArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'iam:PassRole',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						originSimulatorContainer.taskExecutionRole.roleArn,
						originSimulatorContainer.taskDefinitionRole.roleArn,
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

		const waitX = new stepfunctions.Wait(this, 'Wait one Seconds', {
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
							'lastEvaluatedKey.$': '$.iterator.lastEvaluatedKey',
						},
					},
				},
			},
		)

		const startSimulator = new tasks.LambdaInvoke(
			this,
			'StartSimulator',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'startSimulator',
						payload: {
							'simulationId.$': '$$.Execution.Input.simulationId',
							'executionId.$': '$.iterator.executionId',
						},
					},
				},
			},
		)

		const updateSimulationState = new tasks.LambdaInvoke(
			this,
			'UpdateSimulationState',
			{
				lambdaFunction: this.lambda,
				resultPath: stepfunctions.JsonPath.DISCARD,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'updateSimulation',
						payload: {
							'simulationId.$': '$$.Execution.Input.simulationId',
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
		.next(startSimulator)
		.next(
			new stepfunctions.Choice(this, 'IsNextPage')
			.when(stepfunctions.Condition.booleanEquals('$.iterator.continue', true), waitX.next(iterate))
			.otherwise(updateSimulationState),
		)

		this.stepFunction = new stepfunctions.StateMachine(this, 'OriginStarterStepFunctions', {
			stateMachineName: namespaced(this, 'OriginStarterStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
