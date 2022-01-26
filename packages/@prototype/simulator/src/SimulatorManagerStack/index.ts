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
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as events from '@aws-cdk/aws-events'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as api from '@aws-play/cdk-apigateway'
import * as cognito from '@aws-cdk/aws-cognito'
import * as iot from '@aws-cdk/aws-iot'
import * as lambda from '@aws-cdk/aws-lambda'
import * as elasticache from '@aws-cdk/aws-elasticache'
import { Networking } from '@prototype/networking'
import { SimulatorManagerLambda } from './SimulatorManagerLambda'
import { OrderSimulatorLambda } from './OrderSimulatorLambda'
import { RestaurantSimulatorLambda } from './RestaurantSimulatorLambda'
import { CustomerSimulatorLambda } from './CustomerSimulatorLambda'
import { APIGatewayResourceStack } from './APIGatewayResourceStack'
import { PolygonManagerLambda } from './PolygonManagerLambda'
import { EventSimulatorLambda } from './EventSimulatorLambda'
import { StatisticsLambda } from './StatisticsLambda'
import { SimulatorContainer } from '../ECSContainerStack/SimulatorContainer'
import { DispatcherAssignmentQueryLambda } from './DispatcherAssignmentQueryLambda'

export interface SimulatorManagerStackProps {
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster

	readonly driverSimulatorContainer: SimulatorContainer
	readonly customerSimulatorContainer: SimulatorContainer
	readonly restaurantSimulatorContainer: SimulatorContainer

	readonly simulatorRestApi: api.RestApi
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly simulatorTable: ddb.ITable
	readonly restaurantTable: ddb.ITable
	readonly restaurantAreaIndex: string
	readonly restaurantExecutionIdIndex: string
	readonly restaurantStatsTable: ddb.ITable
	readonly restaurantSimulationsTable: ddb.ITable
	readonly customerTable: ddb.ITable
	readonly customerAreaIndex: string
	readonly customerExecutionIdIndex: string
	readonly customerStatsTable: ddb.ITable
	readonly customerSimulationsTable: ddb.ITable
	readonly orderTable: ddb.ITable
	readonly eventTable: ddb.ITable
	readonly eventCreatedAtIndex: string
	readonly geoPolygonTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly internalProviderOrdersTable: ddb.ITable
	readonly eventBus: events.EventBus

	readonly lambdaRefs: { [key: string]: lambda.IFunction, }
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly restaurantUserPassword: string
	readonly customerUserPassword: string

	readonly iotDriverPolicy: iot.CfnPolicy
	readonly iotCustomerPolicy: iot.CfnPolicy
	readonly iotRestaurantPolicy: iot.CfnPolicy

	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }

	readonly iotEndpointAddress: string
}

export class SimulatorManagerStack extends cdk.Construct {
	readonly customerSimulator: CustomerSimulatorLambda

	readonly restaurantSimulator: RestaurantSimulatorLambda

	constructor (scope: cdk.Construct, id: string, props: SimulatorManagerStackProps) {
		super(scope, id)

		const {
			vpc,
			userPool,
			securityGroup,
			cluster,
			driverSimulatorContainer,
			customerSimulatorContainer,
			restaurantSimulatorContainer,
			simulatorRestApi,
			simulatorTable,
			orderTable,
			restaurantTable,
			restaurantAreaIndex,
			restaurantSimulationsTable,
			restaurantStatsTable,
			customerTable,
			customerAreaIndex,
			customerSimulationsTable,
			customerStatsTable,
			eventTable,
			eventCreatedAtIndex,
			geoPolygonTable,
			eventBus,
			lambdaRefs,
			identityPool,
			userPoolClient,
			iotDriverPolicy,
			iotCustomerPolicy,
			iotRestaurantPolicy,
			simulatorConfig,
			restaurantUserPassword,
			customerUserPassword,
			privateVpc,
			vpcNetworking,
			redisCluster,
			lambdaLayers,
			dispatcherAssignmentsTable,
			internalProviderOrdersTable,
			iotEndpointAddress,
		} = props

		const simulatorManager = new SimulatorManagerLambda(this, 'SimulatorManagerLambda', {
			vpc,
			securityGroup,
			cluster,
			taskDefinition: driverSimulatorContainer.taskDefinition,
			containerDefinition: driverSimulatorContainer.containerDefinition,
			taskDefinitionRole: driverSimulatorContainer.taskDefinitionRole,
			taskExecutionRole: driverSimulatorContainer.taskExecutionRole,
			simulatorTable,
			iotEndpointAddress,
		})

		const eventSimulator = new EventSimulatorLambda(this, 'EventsSimulator', {
			eventBus,
			eventTable,
			eventCreatedAtIndex,
		})

		const polygonManagerLambda = new PolygonManagerLambda(this, 'PolygonManagerLambda', {
			dependencies: {
				geoPolygonTable,
			},
		})

		this.restaurantSimulator = new RestaurantSimulatorLambda(this, 'RestaurantSimulatorLambda', {
			restaurantTable,
			restaurantAreaIndex,
			restaurantStatsTable,
			restaurantSimulationsTable,
			userPoolClient,
			userPool,
			identityPool,
			iotPolicy: iotRestaurantPolicy,
			simulatorConfig,
			restaurantUserPassword,
			restaurantSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			lambdaLayers,
			redisCluster,
			eventBus,
			iotEndpointAddress,
		})

		this.customerSimulator = new CustomerSimulatorLambda(this, 'CustomerSimulatorLambda', {
			customerTable,
			customerAreaIndex,
			customerStatsTable,
			customerSimulationsTable,
			userPoolClient,
			userPool,
			identityPool,
			iotPolicy: iotCustomerPolicy,
			simulatorConfig,
			customerUserPassword,
			customerSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			lambdaLayers,
			redisCluster,
			eventBus,
			iotEndpointAddress,
		})

		const orderSimulator = new OrderSimulatorLambda(this, 'OrderSimulatorLambda', {
			orderTable,
			eventBus,
			geofencing: lambdaRefs.geofencing,
		})

		const statisticsLambdaSimulator = new StatisticsLambda(this, 'StatsSimulatorLambda', {
			eventBus,
			privateVpc,
			redisCluster,
			lambdaLayers,
			vpcNetworking,
		})

		const dispatcherAssignmentQueryLambda = new DispatcherAssignmentQueryLambda(this, 'DispatcherAssignmentQueryLambda', {
			dependencies: {
				dispatcherAssignmentsTable,
				internalProviderOrdersTable,
			},
		})

		new APIGatewayResourceStack(this, 'APIGatewayResourceStack', {
			simulatorManagerLambda: simulatorManager.lambda,
			orderSimulatorLambda: orderSimulator.lambda,
			eventSimulatorLambda: eventSimulator.lambda,
			restaurantSimulatorLambda: this.restaurantSimulator.lambda,
			customerSimulatorLambda: this.customerSimulator.lambda,
			statisticSimulatorLambda: statisticsLambdaSimulator.lambda,
			polygonManagerLambda,
			dispatcherAssignmentQueryLambda,
			simulatorRestApi,
			userPool,
		})
	}
}
