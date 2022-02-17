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
import { aws_ec2 as ec2, aws_ecs as ecs, aws_events as events, aws_dynamodb as ddb, aws_cognito as cognito, aws_iot as iot, aws_lambda as lambda, aws_memorydb as memorydb, aws_s3 as s3 } from 'aws-cdk-lib'
import * as api from '@aws-play/cdk-apigateway'
import { Networking } from '@prototype/networking'
import { SimulatorManagerLambda } from './SimulatorManagerLambda'
import { OrderSimulatorLambda } from './OrderSimulatorLambda'
import { OriginSimulatorLambda } from './OriginSimulatorLambda'
import { DestinationSimulatorLambda } from './DestinationSimulatorLambda'
import { APIGatewayResourceStack } from './APIGatewayResourceStack'
import { PolygonManagerLambda } from './PolygonManagerLambda'
import { EventSimulatorLambda } from './EventSimulatorLambda'
import { StatisticsLambda } from './StatisticsLambda'
import { SimulatorContainer } from '../ECSContainerStack/SimulatorContainer'
import { DispatcherAssignmentQueryLambda } from './DispatcherAssignmentQueryLambda'
import { namespacedBucket } from '@aws-play/cdk-core'

export interface SimulatorManagerStackProps {
	readonly vpc: ec2.IVpc
	readonly securityGroup: ec2.SecurityGroup
	readonly cluster: ecs.Cluster

	readonly driverSimulatorContainer: SimulatorContainer
	readonly originSimulatorContainer: SimulatorContainer
	readonly destinationSimulatorContainer: SimulatorContainer

	readonly simulatorRestApi: api.RestApi
	readonly userPool: cognito.UserPool
	readonly identityPool: cognito.CfnIdentityPool
	readonly userPoolClient: cognito.UserPoolClient
	readonly simulatorTable: ddb.ITable
	readonly originTable: ddb.ITable
	readonly originAreaIndex: string
	readonly originExecutionIdIndex: string
	readonly originStatsTable: ddb.ITable
	readonly originSimulationsTable: ddb.ITable
	readonly destinationTable: ddb.ITable
	readonly destinationAreaIndex: string
	readonly destinationExecutionIdIndex: string
	readonly destinationStatsTable: ddb.ITable
	readonly destinationSimulationsTable: ddb.ITable
	readonly orderTable: ddb.ITable
	readonly eventTable: ddb.ITable
	readonly eventCreatedAtIndex: string
	readonly geoPolygonTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly instantDeliveryProviderOrdersTable: ddb.ITable
	readonly eventBus: events.EventBus

	readonly lambdaRefs: { [key: string]: lambda.IFunction, }
	readonly simulatorConfig: { [key: string]: string | number, }
	readonly originUserPassword: string
	readonly destinationUserPassword: string

	readonly iotDriverPolicy: iot.CfnPolicy
	readonly iotOriginPolicy: iot.CfnPolicy
	readonly iotDestinationPolicy: iot.CfnPolicy

	readonly privateVpc: ec2.IVpc
	readonly vpcNetworking: Networking
	readonly memoryDBCluster: memorydb.CfnCluster
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }

	readonly iotEndpointAddress: string
}

export class SimulatorManagerStack extends Construct {
	readonly destinationSimulator: DestinationSimulatorLambda

	readonly originSimulator: OriginSimulatorLambda

	constructor (scope: Construct, id: string, props: SimulatorManagerStackProps) {
		super(scope, id)

		const {
			vpc,
			userPool,
			securityGroup,
			cluster,
			driverSimulatorContainer,
			originSimulatorContainer,
			destinationSimulatorContainer,
			simulatorRestApi,
			simulatorTable,
			orderTable,
			originTable,
			originAreaIndex,
			originSimulationsTable,
			originStatsTable,
			destinationTable,
			destinationAreaIndex,
			destinationSimulationsTable,
			destinationStatsTable,
			eventTable,
			eventCreatedAtIndex,
			geoPolygonTable,
			eventBus,
			lambdaRefs,
			identityPool,
			userPoolClient,
			iotDriverPolicy,
			iotOriginPolicy,
			iotDestinationPolicy,
			simulatorConfig,
			originUserPassword,
			destinationUserPassword,
			privateVpc,
			vpcNetworking,
			memoryDBCluster,
			lambdaLayers,
			dispatcherAssignmentsTable,
			instantDeliveryProviderOrdersTable,
			iotEndpointAddress,
		} = props

		const simulatorConfigBucket = new s3.Bucket(this, 'SimulatorConfig', {
			bucketName: namespacedBucket(this, 'simulator-config'),
			versioned: true,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true,
			},
		})

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

		this.originSimulator = new OriginSimulatorLambda(this, 'OriginSimulatorLambda', {
			originTable,
			originAreaIndex,
			originStatsTable,
			originSimulationsTable,
			userPoolClient,
			userPool,
			identityPool,
			iotPolicy: iotOriginPolicy,
			simulatorConfig,
			originUserPassword,
			originSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			lambdaLayers,
			memoryDBCluster,
			eventBus,
			iotEndpointAddress,
		})

		this.destinationSimulator = new DestinationSimulatorLambda(this, 'DestinationSimulatorLambda', {
			destinationTable,
			destinationAreaIndex,
			destinationStatsTable,
			destinationSimulationsTable,
			userPoolClient,
			userPool,
			identityPool,
			iotPolicy: iotDestinationPolicy,
			simulatorConfig,
			destinationUserPassword,
			destinationSimulatorContainer,
			cluster,
			vpc,
			securityGroup,
			privateVpc,
			vpcNetworking,
			lambdaLayers,
			memoryDBCluster,
			eventBus,
			iotEndpointAddress,
			simulatorConfigBucket,
		})

		const orderSimulator = new OrderSimulatorLambda(this, 'OrderSimulatorLambda', {
			orderTable,
			eventBus,
			geofencing: lambdaRefs.geofencing,
		})

		const statisticsLambdaSimulator = new StatisticsLambda(this, 'StatsSimulatorLambda', {
			eventBus,
			privateVpc,
			memoryDBCluster,
			lambdaLayers,
			vpcNetworking,
		})

		const dispatcherAssignmentQueryLambda = new DispatcherAssignmentQueryLambda(this, 'DispatcherAssignmentQueryLambda', {
			dependencies: {
				dispatcherAssignmentsTable,
				instantDeliveryProviderOrdersTable,
			},
		})

		new APIGatewayResourceStack(this, 'APIGatewayResourceStack', {
			simulatorManagerLambda: simulatorManager.lambda,
			orderSimulatorLambda: orderSimulator.lambda,
			eventSimulatorLambda: eventSimulator.lambda,
			originSimulatorLambda: this.originSimulator.lambda,
			destinationSimulatorLambda: this.destinationSimulator.lambda,
			statisticSimulatorLambda: statisticsLambdaSimulator.lambda,
			polygonManagerLambda,
			dispatcherAssignmentQueryLambda,
			simulatorRestApi,
			userPool,
		})
	}
}
