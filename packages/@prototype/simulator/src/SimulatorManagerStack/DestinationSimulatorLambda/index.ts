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
import { DestinationGeneratorStepFunction } from './DestinationGeneratorStepFunction'
import { DestinationStarterStepFunction } from './DestinationStarterStepFunction'
import { DestinationEraserStepFunction } from './DestinationEraserStepFunction'
import { SimulatorContainer } from '../../ECSContainerStack/SimulatorContainer'
import { DestinationStatusUpdateLambda } from './DestinationStatusUpdateLambda'

export interface DestinationSimulatorProps {
	readonly destinationTable: ddb.ITable
	readonly destinationSimulationsTable: ddb.ITable
	readonly destinationStatsTable: ddb.ITable
	readonly destinationAreaIndex: string
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly destinationUserPassword: string
	readonly destinationSimulatorContainer: SimulatorContainer
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

export class DestinationSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly destinationStatusUpdateLambda: lambda.Function

	public readonly generatorStepFunction: stepfunctions.StateMachine

	public readonly starterStepFunction: stepfunctions.StateMachine

	public readonly starter: DestinationStarterStepFunction

	public readonly eraserStepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: DestinationSimulatorProps) {
		super(scope, id)

		const {
			destinationStatsTable,
			destinationTable,
			destinationAreaIndex,
			destinationSimulationsTable,
			identityPool,
			userPoolClient,
			userPool,
			iotPolicy,
			simulatorConfig,
			destinationUserPassword,
			destinationSimulatorContainer,
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

		const generator = new DestinationGeneratorStepFunction(this, 'DestinationGeneratorStepFunction', {
			destinationStatsTable,
			destinationTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			destinationUserPassword,
		})

		this.generatorStepFunction = generator.stepFunction

		this.starter = new DestinationStarterStepFunction(this, 'DestinationStarterStepFunction', {
			destinationTable,
			destinationSimulationsTable,
			simulatorConfig,
			destinationSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		})

		this.starterStepFunction = this.starter.stepFunction

		const eraser = new DestinationEraserStepFunction(this, 'DestinationEraserStepFunction', {
			destinationTable,
			destinationStatsTable,
			destinationAreaIndex,
		})

		this.eraserStepFunction = eraser.stepFunction

		this.lambda = new lambda.Function(this, 'DestinationSimulatorLambda', {
			functionName: namespaced(scope, 'DestinationManager'),
			description: 'Destination Management functions',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/destination-manager.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_14_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.seconds(120),
			environment: {
				IOT_ENDPOINT: iotEndpointAddress,
				DESTINATION_SIMULATIONS_TABLE_NAME: destinationSimulationsTable.tableName,
				DESTINATION_STATS_TABLE_NAME: destinationStatsTable.tableName,
				DESTINATION_GENERATOR_STEP_FUNCTIONS_ARN: this.generatorStepFunction.stateMachineArn,
				DESTINATION_STARTER_STEP_FUNCTIONS_ARN: this.starterStepFunction.stateMachineArn,
				DESTINATION_ERASER_STEP_FUNCTIONS_ARN: this.eraserStepFunction.stateMachineArn,
				DESTINATION_CONTAINER_BATCH_SIZE: simulatorConfig.destinationContainerBatchSize.toString(),
			},
			initialPolicy: [
				readDDBTablePolicyStatement(destinationSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(destinationSimulationsTable.tableArn),
				deleteFromDDBTablePolicyStatement(destinationSimulationsTable.tableArn),
				readDDBTablePolicyStatement(destinationStatsTable.tableArn),
				updateDDBTablePolicyStatement(destinationStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(destinationStatsTable.tableArn),
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

		this.destinationStatusUpdateLambda = new DestinationStatusUpdateLambda(this, 'DestinationStatusUpdateLambda', {
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
	}
}
