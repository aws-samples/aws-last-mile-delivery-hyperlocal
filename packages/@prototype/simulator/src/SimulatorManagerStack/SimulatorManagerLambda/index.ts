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
import { Duration, aws_ec2 as ec2, aws_iam as iam, aws_ecs as ecs, aws_dynamodb as ddb, aws_lambda as lambda, aws_stepfunctions as stepfunctions } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { ECSStepFunctionInvoker } from './ECSStepFunctionInvoker'

export interface SimulatorManagerLambdaProps {
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster
	readonly taskDefinition: ecs.TaskDefinition
	readonly containerDefinition: ecs.ContainerDefinition
	readonly taskExecutionRole: iam.Role
	readonly taskDefinitionRole: iam.Role
	readonly simulatorTable: ddb.ITable
	readonly iotEndpointAddress: string
}

export class SimulatorManagerLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly stepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: SimulatorManagerLambdaProps) {
		super(scope, id)

		const {
			vpc,
			securityGroup,
			cluster,
			taskDefinition,
			containerDefinition,
			taskDefinitionRole,
			taskExecutionRole,
			simulatorTable,
			iotEndpointAddress,
		} = props

		const invoker = new ECSStepFunctionInvoker(this, 'ESCSStepFunctionInvoker', {
			vpc,
			securityGroup,
			cluster,
			taskDefinition,
			containerDefinition,
			taskDefinitionRole,
			taskExecutionRole,
			simulatorTable,
		})

		this.stepFunction = invoker.stepFunction

		this.lambda = new lambda.Function(this, 'SimulatorManagerLambda', {
			functionName: namespaced(this, 'SimulatorManagerLambda'),
			description: 'Lambda used to handle ECS Task for Driver Simulator',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/simulator-manager-lambda.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				SIMULATOR_TABLE_NAME: props.simulatorTable.tableName,
				ECS_STEP_FUNCTIONS_ARN: this.stepFunction.stateMachineArn,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [this.stepFunction.stateMachineArn],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					actions: [
						'iot:Connect',
						'iot:Publish',
					],
					effect: iam.Effect.ALLOW,
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:PutItem',
						'dynamodb:GetItem',
						'dynamodb:Scan',
						'dynamodb:UpdateItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [props.simulatorTable.tableArn],
				}),
			],
		})
	}
}
