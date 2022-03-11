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
import { Duration, aws_dynamodb as ddb, aws_iam as iam, aws_ecs as ecs, aws_ec2 as ec2, aws_lambda as lambda, aws_cognito as cognito, aws_iot as iot, aws_stepfunctions as stepfunctions, aws_events as events, aws_events_targets as events_targets } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement, deleteFromDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'
import { MemoryDBCluster } from '@prototype/live-data-cache'
import { OriginGeneratorStepFunction } from './OriginGeneratorStepFunction'
import { OriginStarterStepFunction } from './OriginStarterStepFunction'
import { OriginEraserStepFunction } from './OriginEraserStepFunction'
import { OriginStatusUpdateLambda } from './OriginStatusUpdateLambda'
import { SimulatorContainer } from '../../ECSContainerStack/SimulatorContainer'
import { OriginEventHandlerLambda } from './OriginEventHandler'

export interface OriginSimulatorProps {
	readonly originTable: ddb.ITable
	readonly originSimulationsTable: ddb.ITable
	readonly originStatsTable: ddb.ITable
	readonly originAreaIndex: string
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly originUserPassword: string
	readonly originSimulatorContainer: SimulatorContainer
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster

	readonly eventBus: events.EventBus
	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly memoryDBCluster: MemoryDBCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly iotEndpointAddress: string
	readonly country: string
}

export class OriginSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly originStatusUpdateLambda: lambda.Function

	public readonly generatorStepFunction: stepfunctions.StateMachine

	public readonly starterStepFunction: stepfunctions.StateMachine

	public readonly eraserStepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: OriginSimulatorProps) {
		super(scope, id)

		const {
			originStatsTable,
			originTable,
			originAreaIndex,
			originSimulationsTable,
			identityPool,
			userPoolClient,
			userPool,
			iotPolicy,
			simulatorConfig,
			originUserPassword,
			originSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			memoryDBCluster,
			lambdaLayers,
			eventBus,
			iotEndpointAddress,
			country,
		} = props

		const generator = new OriginGeneratorStepFunction(this, 'OriginGeneratorStepFunction', {
			originStatsTable,
			originTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			originUserPassword,
			country,
		})

		this.generatorStepFunction = generator.stepFunction

		const starter = new OriginStarterStepFunction(this, 'OriginStarterStepFunction', {
			originTable,
			originSimulationsTable,
			simulatorConfig,
			originSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		})

		this.starterStepFunction = starter.stepFunction

		const eraser = new OriginEraserStepFunction(this, 'OriginEraserStepFunction', {
			originTable,
			originStatsTable,
			originAreaIndex,
		})

		this.eraserStepFunction = eraser.stepFunction

		this.lambda = new lambda.Function(this, 'OriginSimulatorLambda', {
			functionName: namespaced(scope, 'OriginManager'),
			description: 'Origin Management functions',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/origin-manager.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				MEMORYDB_HOST: memoryDBCluster.cluster.attrClusterEndpointAddress,
				MEMORYDB_PORT: memoryDBCluster.cluster.port?.toString() || '',
				MEMORYDB_ADMIN_USERNAME: memoryDBCluster.adminUsername,
				MEMORYDB_ADMIN_SECRET: memoryDBCluster.adminPasswordSecret.secretArn,
				ORIGIN_TABLE: originTable.tableName,
				ORIGIN_SIMULATIONS_TABLE_NAME: originSimulationsTable.tableName,
				ORIGIN_STATS_TABLE_NAME: originStatsTable.tableName,
				ORIGIN_GENERATOR_STEP_FUNCTIONS_ARN: this.generatorStepFunction.stateMachineArn,
				ORIGIN_STARTER_STEP_FUNCTIONS_ARN: this.starterStepFunction.stateMachineArn,
				ORIGIN_ERASER_STEP_FUNCTIONS_ARN: this.eraserStepFunction.stateMachineArn,
				ORIGIN_CONTAINER_BATCH_SIZE: simulatorConfig.originContainerBatchSize.toString(),
				IOT_ENDPOINT: iotEndpointAddress,
			},
			layers: [
				lambdaLayers.lambdaUtilsLayer,
				lambdaLayers.redisClientLayer,
			],
			vpc: privateVpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: [vpcNetworking.securityGroups.lambda],
			initialPolicy: [
				readDDBTablePolicyStatement(originTable.tableArn),
				readDDBTablePolicyStatement(originSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(originSimulationsTable.tableArn),
				deleteFromDDBTablePolicyStatement(originSimulationsTable.tableArn),
				readDDBTablePolicyStatement(originStatsTable.tableArn),
				updateDDBTablePolicyStatement(originStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(originStatsTable.tableArn),
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
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${memoryDBCluster.adminPasswordSecret.secretArn}*`,
					],
				}),
			],
		})

		this.originStatusUpdateLambda = new OriginStatusUpdateLambda(this, 'OriginStatusUpdateLambda', {
			dependencies: {
				eventBus,
				vpc: privateVpc,
				lambdaSecurityGroups: [vpcNetworking.securityGroups.lambda],
				memoryDBCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
			},
		})

		const originEventHandler = new OriginEventHandlerLambda(this, 'OriginEventHandler', {
			dependencies: {
				eventBus,
				originTable,
				iotEndpointAddress,
			},
		})

		new events.Rule(this, 'OrderMangerToOrigin', {
			ruleName: namespaced(this, 'orders-manager-to-origin'),
			description: 'Rule used by origin service to consume events from order manager',
			eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(originEventHandler)],
			eventPattern: {
				source: [SERVICE_NAME.ORDER_MANAGER],
				detailType: ['NOTIFY_ORIGIN'],
			},
		})
	}
}
