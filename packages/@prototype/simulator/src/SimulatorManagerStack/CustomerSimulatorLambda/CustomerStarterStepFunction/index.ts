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
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as lambda from '@aws-cdk/aws-lambda'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SimulatorContainer } from '../../../ECSContainerStack/SimulatorContainer'

export interface CustomerStarterStepFunctionProps {
	readonly customerTable: ddb.ITable
	readonly customerSimulationsTable: ddb.ITable
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly customerSimulatorContainer: SimulatorContainer
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
}

export class CustomerStarterStepFunction extends cdk.Construct {
	public readonly lambda: lambda.IFunction

	public readonly stepFunction: step.StateMachine

	public readonly environmentVariables: { [key: string]: string, }

	constructor (scope: cdk.Construct, id: string, props: CustomerStarterStepFunctionProps) {
		super(scope, id)

		const {
			customerTable,
			customerSimulationsTable,
			customerSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		} = props

		this.environmentVariables = {
			CUSTOMER_TABLE_NAME: customerTable.tableName,
			CUSTOMER_SIMULATION_TABLE_NAME: customerSimulationsTable.tableName,
			CLUSTER_NAME: cluster.clusterName,
			TASK_DEFINITION_NAME: customerSimulatorContainer.taskDefinition.taskDefinitionArn,
			SUBNETS: vpc.publicSubnets.map(q => q.subnetId).join(','),
			SECURITY_GROUP: securityGroup.securityGroupName,
			CONTAINER_NAME: customerSimulatorContainer.containerDefinition.containerName,
		}
		this.lambda = new lambda.Function(this, 'CustomerStarterHelper', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(this, 'CustomerStarterHelper'),
			description: 'Lambda used by step function to start customer simulator',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/customer-starter-helper.zip')),
			handler: 'index.handler',
			timeout: cdk.Duration.seconds(120),
			environment: {
				...this.environmentVariables,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(customerTable.tableArn),
				updateDDBTablePolicyStatement(customerTable.tableArn),
				readDDBTablePolicyStatement(customerSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(customerSimulationsTable.tableArn),
				new iam.PolicyStatement({
					actions: [
						'ecs:RunTask',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						customerSimulatorContainer.taskDefinition.taskDefinitionArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'iam:PassRole',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						customerSimulatorContainer.taskExecutionRole.roleArn,
						customerSimulatorContainer.taskDefinitionRole.roleArn,
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

		const waitX = new step.Wait(this, 'Wait one Seconds', {
			time: step.WaitTime.duration(cdk.Duration.seconds(1)),
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
					type: step.InputType.OBJECT,
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
				resultPath: step.JsonPath.DISCARD,
				payload: {
					type: step.InputType.OBJECT,
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
				resultPath: step.JsonPath.DISCARD,
				payload: {
					type: step.InputType.OBJECT,
					value: {
						cmd: 'updateSimulation',
						payload: {
							'simulationId.$': '$$.Execution.Input.simulationId',
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
		.next(startSimulator)
		.next(
			new step.Choice(this, 'IsNextPage')
			.when(step.Condition.booleanEquals('$.iterator.continue', true), waitX.next(iterate))
			.otherwise(updateSimulationState),
		)

		this.stepFunction = new step.StateMachine(this, 'CustomerStarterStepFunctions', {
			stateMachineName: namespaced(this, 'CustomerStarterStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
