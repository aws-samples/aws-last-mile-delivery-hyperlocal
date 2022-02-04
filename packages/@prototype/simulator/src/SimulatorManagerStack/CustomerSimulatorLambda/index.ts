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
import { Duration, aws_dynamodb as ddb, aws_iam as iam, aws_ecs as ecs, aws_ec2 as ec2, aws_lambda as lambda, aws_cognito as cognito, aws_iot as iot, aws_stepfunctions as stepfunctions, aws_elasticache as elasticache, aws_events as events } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement, deleteFromDDBTablePolicyStatement } from '@prototype/lambda-common'
import { CustomerGeneratorStepFunction } from './CustomerGeneratorStepFunction'
import { CustomerStarterStepFunction } from './CustomerStarterStepFunction'
import { CustomerEraserStepFunction } from './CustomerEraserStepFunction'
import { SimulatorContainer } from '../../ECSContainerStack/SimulatorContainer'
import { CustomerStatusUpdateLambda } from './CustomerStatusUpdateLambda'

export interface CustomerSimulatorProps {
	readonly customerTable: ddb.ITable
	readonly customerSimulationsTable: ddb.ITable
	readonly customerStatsTable: ddb.ITable
	readonly customerAreaIndex: string
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly customerUserPassword: string
	readonly customerSimulatorContainer: SimulatorContainer
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster

	readonly eventBus: events.EventBus
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }

	readonly iotEndpointAddress: string
}

export class CustomerSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly customerStatusUpdateLambda: lambda.Function

	public readonly generatorStepFunction: stepfunctions.StateMachine

	public readonly starterStepFunction: stepfunctions.StateMachine

	public readonly starter: CustomerStarterStepFunction

	public readonly eraserStepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: CustomerSimulatorProps) {
		super(scope, id)

		const {
			customerStatsTable,
			customerTable,
			customerAreaIndex,
			customerSimulationsTable,
			identityPool,
			userPoolClient,
			userPool,
			iotPolicy,
			simulatorConfig,
			customerUserPassword,
			customerSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			redisCluster,
			lambdaLayers,
			eventBus,
			iotEndpointAddress,
		} = props

		const generator = new CustomerGeneratorStepFunction(this, 'CustomerGeneratorStepFunction', {
			customerStatsTable,
			customerTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			customerUserPassword,
		})

		this.generatorStepFunction = generator.stepFunction

		this.starter = new CustomerStarterStepFunction(this, 'CustomerStarterStepFunction', {
			customerTable,
			customerSimulationsTable,
			simulatorConfig,
			customerSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		})

		this.starterStepFunction = this.starter.stepFunction

		const eraser = new CustomerEraserStepFunction(this, 'CustomerEraserStepFunction', {
			customerTable,
			customerStatsTable,
			customerAreaIndex,
		})

		this.eraserStepFunction = eraser.stepFunction

		this.lambda = new lambda.Function(this, 'CustomerSimulatorLambda', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(scope, 'CustomerManager'),
			description: 'Customer Management functions',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/customer-manager.zip')),
			handler: 'index.handler',
			timeout: Duration.seconds(120),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				CUSTOMER_SIMULATIONS_TABLE_NAME: customerSimulationsTable.tableName,
				CUSTOMER_STATS_TABLE_NAME: customerStatsTable.tableName,
				CUSTOMER_GENERATOR_STEP_FUNCTIONS_ARN: this.generatorStepFunction.stateMachineArn,
				CUSTOMER_STARTER_STEP_FUNCTIONS_ARN: this.starterStepFunction.stateMachineArn,
				CUSTOMER_ERASER_STEP_FUNCTIONS_ARN: this.eraserStepFunction.stateMachineArn,
				CUSTOMER_CONTAINER_BATCH_SIZE: simulatorConfig.customerContainerBatchSize.toString(),
			},
			initialPolicy: [
				readDDBTablePolicyStatement(customerSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(customerSimulationsTable.tableArn),
				deleteFromDDBTablePolicyStatement(customerSimulationsTable.tableArn),
				readDDBTablePolicyStatement(customerStatsTable.tableArn),
				updateDDBTablePolicyStatement(customerStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(customerStatsTable.tableArn),
				new iam.PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [
						this.generatorStepFunction.stateMachineArn,
						this.starterStepFunction.stateMachineArn,
						this.eraserStepFunction.stateMachineArn,
					],
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
			],
		})

		const customerStatusUpdateLambda = new CustomerStatusUpdateLambda(this, 'CustomerStatusUpdateLambda', {
			dependencies: {
				eventBus,
				vpc: privateVpc,
				lambdaSecurityGroups: [vpcNetworking.securityGroups.lambda],
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
			},
		})

		this.customerStatusUpdateLambda = customerStatusUpdateLambda
	}
}
