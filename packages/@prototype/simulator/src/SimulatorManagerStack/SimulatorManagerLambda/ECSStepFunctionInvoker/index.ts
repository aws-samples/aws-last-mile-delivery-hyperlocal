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
import { Duration, aws_ec2 as ec2, aws_iam as iam, aws_ecs as ecs, aws_dynamodb as ddb, aws_lambda as lambda, aws_stepfunctions as stepfunctions, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

export interface ECSStepFunctionInvokerProps {
  readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
	readonly taskDefinition: ecs.TaskDefinition
	readonly containerDefinition: ecs.ContainerDefinition
	readonly taskExecutionRole: iam.Role
	readonly taskDefinitionRole: iam.Role
	readonly simulatorTable: ddb.ITable
}

export class ECSStepFunctionInvoker extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: ECSStepFunctionInvokerProps) {
		super(scope, id)

		this.lambda = new lambda.Function(this, 'ECSTaskRunHelper', {
			functionName: namespaced(this, 'ECSTaskRunHelper'),
			description: 'Lambda used by step function to start ECS Task',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/ecs-task-runner.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				CLUSTER_NAME: props.cluster.clusterName,
				TASK_DEFINITION_NAME: props.taskDefinition.taskDefinitionArn,
				SUBNETS: props.vpc.publicSubnets.map(q => q.subnetId).join(','),
				SECURITY_GROUP: props.securityGroup.securityGroupId, // TODO CDKv2 make sure Id is ok to use .securityGroupName,
				CONTAINER_NAME: props.containerDefinition.containerName,
				SIMULATOR_TABLE_NAME: props.simulatorTable.tableName,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'ecs:RunTask',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.taskDefinition.taskDefinitionArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'iam:PassRole',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						props.taskExecutionRole.roleArn,
						props.taskDefinitionRole.roleArn,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:GetItem',
						'dynamodb:UpdateItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.simulatorTable.tableArn],
				}),
			],
		})

		const ecsTaskStarterRole = new iam.Role(
			this,
			'ecsTaskStarterRole',
			{
				assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
			},
		)
		ecsTaskStarterRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
				effect: iam.Effect.ALLOW,
				resources: [this.lambda.functionArn],
			}),
		)

		const waitX = new stepfunctions.Wait(this, 'Wait few Seconds', {
			time: stepfunctions.WaitTime.duration(Duration.seconds(10)),
		})

		const startECSTask = new tasks.LambdaInvoke(
			this,
			'Invoke ECS run-task method',
			{
				lambdaFunction: this.lambda,
				resultPath: '$.executor',
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'runTask',
						'payload.$': '$',
					},
				},
			},
		)

		const updateSimulation = new tasks.LambdaInvoke(
			this,
			'Update DDB table with simulation details',
			{
				lambdaFunction: this.lambda,
				resultPath: '$.ddb',
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'updateSimulation',
						payload: {
							'simulationId.$': '$$.Execution.Input.simulationId',
							'failures.$': '$.executor.Payload.failures',
							'tasks.$': '$.executor.Payload.tasks',
						},
					},
				},
			},
		)

		const updateSimulationState = new tasks.LambdaInvoke(
			this,
			'Update DDB table with overall status',
			{
				lambdaFunction: this.lambda,
				payload: {
					type: stepfunctions.InputType.OBJECT,
					value: {
						cmd: 'updateSimulationState',
						payload: {
							'simulationId.$': '$$.Execution.Input.simulationId',
						},
					},
				},
			},
		)

		const definition = new stepfunctions.Map(this, 'iterator', {
			maxConcurrency: 1,
			inputPath: '$',
			itemsPath: '$.tasks',
		}).iterator(
			startECSTask
			.next(updateSimulation)
			.next(waitX),
		).next(updateSimulationState)

		this.stepFunction = new stepfunctions.StateMachine(this, 'ECSTaskStartStepFunction', {
			stateMachineName: namespaced(this, 'ECSTaskStartStepFunction'),
			definition,
			role: ecsTaskStarterRole,
		})
	}
}
