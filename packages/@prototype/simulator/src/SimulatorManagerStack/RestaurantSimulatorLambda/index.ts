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
import { Duration, aws_dynamodb as ddb, aws_iam as iam, aws_ecs as ecs, aws_ec2 as ec2, aws_lambda as lambda, aws_cognito as cognito, aws_iot as iot, aws_stepfunctions as stepfunctions, aws_elasticache as elasticache, aws_events as events, aws_events_targets as events_targets } from 'aws-cdk-lib'
import { Networking } from '@prototype/networking'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { updateDDBTablePolicyStatement, readDDBTablePolicyStatement, deleteFromDDBTablePolicyStatement } from '@prototype/lambda-common'
import { SERVICE_NAME } from '@prototype/common'
import { RestaurantGeneratorStepFunction } from './RestaurantGeneratorStepFunction'
import { RestaurantStarterStepFunction } from './RestaurantStarterStepFunction'
import { RestaurantEraserStepFunction } from './RestaurantEraserStepFunction'
import { RestaurantStatusUpdateLambda } from './RestaurantStatusUpdateLambda'
import { SimulatorContainer } from '../../ECSContainerStack/SimulatorContainer'
import { RestaurantEventHandlerLambda } from './RestaurantEventHandler'

export interface RestaurantSimulatorProps {
	readonly restaurantTable: ddb.ITable
	readonly restaurantSimulationsTable: ddb.ITable
	readonly restaurantStatsTable: ddb.ITable
	readonly restaurantAreaIndex: string
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly iotPolicy: iot.CfnPolicy
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly restaurantUserPassword: string
	readonly restaurantSimulatorContainer: SimulatorContainer
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

export class RestaurantSimulatorLambda extends Construct {
	public readonly lambda: lambda.Function

	public readonly restaurantStatusUpdateLambda: lambda.Function

	public readonly generatorStepFunction: stepfunctions.StateMachine

	public readonly starterStepFunction: stepfunctions.StateMachine

	public readonly eraserStepFunction: stepfunctions.StateMachine

	constructor (scope: Construct, id: string, props: RestaurantSimulatorProps) {
		super(scope, id)

		const {
			restaurantStatsTable,
			restaurantTable,
			restaurantAreaIndex,
			restaurantSimulationsTable,
			identityPool,
			userPoolClient,
			userPool,
			iotPolicy,
			simulatorConfig,
			restaurantUserPassword,
			restaurantSimulatorContainer,
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

		const generator = new RestaurantGeneratorStepFunction(this, 'RestaurantGeneratorStepFunction', {
			restaurantStatsTable,
			restaurantTable,
			identityPool,
			userPool,
			userPoolClient,
			iotPolicy,
			simulatorConfig,
			restaurantUserPassword,
		})

		this.generatorStepFunction = generator.stepFunction

		const starter = new RestaurantStarterStepFunction(this, 'RestaurantStarterStepFunction', {
			restaurantTable,
			restaurantSimulationsTable,
			simulatorConfig,
			restaurantSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
		})

		this.starterStepFunction = starter.stepFunction

		const eraser = new RestaurantEraserStepFunction(this, 'RestaurantEraserStepFunction', {
			restaurantTable,
			restaurantStatsTable,
			restaurantAreaIndex,
		})

		this.eraserStepFunction = eraser.stepFunction

		this.lambda = new lambda.Function(this, 'RestaurantSimulatorLambda', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(scope, 'RestaurantManager'),
			description: 'Restaurant Management functions',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/restaurant-manager.zip')),
			handler: 'index.handler',
			timeout: Duration.seconds(120),
			environment: {
				REDIS_HOST: redisCluster.attrRedisEndpointAddress,
				REDIS_PORT: redisCluster.attrRedisEndpointPort,
				RESTAURANT_TABLE: restaurantTable.tableName,
				RESTAURANT_SIMULATIONS_TABLE_NAME: restaurantSimulationsTable.tableName,
				RESTAURANT_STATS_TABLE_NAME: restaurantStatsTable.tableName,
				RESTAURANT_GENERATOR_STEP_FUNCTIONS_ARN: this.generatorStepFunction.stateMachineArn,
				RESTAURANT_STARTER_STEP_FUNCTIONS_ARN: this.starterStepFunction.stateMachineArn,
				RESTAURANT_ERASER_STEP_FUNCTIONS_ARN: this.eraserStepFunction.stateMachineArn,
				RESTAURANT_CONTAINER_BATCH_SIZE: simulatorConfig.restaurantContainerBatchSize.toString(),
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
				readDDBTablePolicyStatement(restaurantTable.tableArn),
				readDDBTablePolicyStatement(restaurantSimulationsTable.tableArn),
				updateDDBTablePolicyStatement(restaurantSimulationsTable.tableArn),
				deleteFromDDBTablePolicyStatement(restaurantSimulationsTable.tableArn),
				readDDBTablePolicyStatement(restaurantStatsTable.tableArn),
				updateDDBTablePolicyStatement(restaurantStatsTable.tableArn),
				deleteFromDDBTablePolicyStatement(restaurantStatsTable.tableArn),
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

		const restaurantStatusUpdateLambda = new RestaurantStatusUpdateLambda(this, 'RestaurantStatusUpdateLambda', {
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

		this.restaurantStatusUpdateLambda = restaurantStatusUpdateLambda

		const restaurantEventHandler = new RestaurantEventHandlerLambda(this, 'RestaurantEventHandler', {
			dependencies: {
				eventBus,
				restaurantTable,
				iotEndpointAddress,
			},
		})

		new events.Rule(this, 'OrderMangerToRestaurant', {
			ruleName: namespaced(this, 'orders-manager-to-restaurant'),
			description: 'Rule used by restaurant service to consume events from order manager',
			eventBus,
			enabled: true,
			targets: [new events_targets.LambdaFunction(restaurantEventHandler)],
			eventPattern: {
				source: [SERVICE_NAME.ORDER_MANAGER],
				detailType: ['NOTIFY_RESTAURANT'],
			},
		})
	}
}
