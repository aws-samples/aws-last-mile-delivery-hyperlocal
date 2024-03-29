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
import { Duration, aws_iam as iam, aws_dynamodb as ddb, aws_ec2 as ec2, aws_ecs as ecs, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks, aws_s3 as s3 } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SimulatorContainer } from '../../../ECSContainerStack/SimulatorContainer'

export interface DestinationStarterStepFunctionProps {
	readonly destinationTable: ddb.ITable
	readonly destinationSimulationsTable: ddb.ITable
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly destinationSimulatorContainer: SimulatorContainer
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
	readonly simulatorConfigBucket: s3.IBucket
}

export class DestinationStarterStepFunction extends Construct {
	public readonly lambda: lambda.IFunction

	public readonly stepFunction: stepfunctions.StateMachine

	public readonly environmentVariables: { [key: string]: string, }

	constructor (scope: Construct, id: string, props: DestinationStarterStepFunctionProps) {
		super(scope, id)

		const {
			destinationTable,
			destinationSimulationsTable,
			destinationSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			simulatorConfigBucket,
		} = props

		this.environmentVariables = {
			DESTINATION_TABLE_NAME: destinationTable.tableName,
			DESTINATION_SIMULATION_TABLE_NAME: destinationSimulationsTable.tableName,
			CLUSTER_NAME: cluster.clusterName,
			TASK_DEFINITION_NAME: destinationSimulatorContainer.taskDefinition.taskDefinitionArn,
			SUBNETS: vpc.publicSubnets.map(q => q.subnetId).join(','),
			SECURITY_GROUP: securityGroup.securityGroupId,
			CONTAINER_NAME: destinationSimulatorContainer.containerDefinition.containerName,
			SIMULATOR_CONFIG_BUCKET: simulatorConfigBucket.bucketName,
		}
		this.lambda = new lambda.Function(this, 'DestinationStarterHelper', {
			functionName: namespaced(this, 'DestinationStarterHelper'),
			description: 'Lambda used by step function to start destination simulator',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/destination-starter-helper.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_16_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				...this.environmentVariables,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(destinationTable.tableArn),
				updateDDBTablePolicyStatement(destinationTable.tableArn),
				readDDBTablePolicyStatement(destinationSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(destinationSimulationsTable.tableArn),
				new iam.PolicyStatement({
					actions: [
						'ecs:RunTask',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						destinationSimulatorContainer.taskDefinition.taskDefinitionArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'iam:PassRole',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						destinationSimulatorContainer.taskExecutionRole.roleArn,
						destinationSimulatorContainer.taskDefinitionRole.roleArn,
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
							'fileBasedSimulation.$': '$$.Execution.Input.fileBasedSimulation',
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

		this.stepFunction = new stepfunctions.StateMachine(this, 'DestinationStarterStepFunctions', {
			stateMachineName: namespaced(this, 'DestinationStarterStepFunctions'),
			definition,
			role: stepFunctionRole,
		})
	}
}
